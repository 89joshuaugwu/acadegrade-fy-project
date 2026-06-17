import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * GET /api/admin/stats
 * Returns platform-wide statistics for the admin dashboard.
 * Requires admin verification.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Verify admin
    const adminsDoc = await adminDb.collection('config').doc('admins').get();
    const adminEmails: string[] = adminsDoc.data()?.emails || [];
    if (!adminEmails.includes(decodedToken.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Total Users
    const usersSnap = await adminDb.collection('users').get();
    const totalUsers = usersSnap.size;

    // 2. Calculate Platform CGPA, PI, department breakdown, level distribution
    let totalCGPA = 0;
    let totalPI = 0;
    let usersWithCGPA = 0;
    const deptCounts: Record<string, { count: number; totalCGPA: number }> = {};
    const levelCounts: Record<string, number> = {};
    const cgpaBuckets: Record<string, number> = {};
    const degreeClassCounts: Record<string, number> = {
      'First Class': 0,
      'Second Class Upper': 0,
      'Second Class Lower': 0,
      'Third Class': 0,
      'Pass': 0,
      'Fail': 0,
    };

    // Initialize CGPA buckets (0.0-0.5, 0.5-1.0, ..., 4.5-5.0)
    for (let i = 0; i < 10; i++) {
      const low = (i * 0.5).toFixed(1);
      const high = ((i + 1) * 0.5).toFixed(1);
      cgpaBuckets[`${low}-${high}`] = 0;
    }

    // Recent signups for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const signupsByDay: Record<string, number> = {};

    // Active this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    let activeThisWeek = 0;

    // Recent activity feed
    const recentActivity: { user: string; action: string; timestamp: string }[] = [];

    for (const doc of usersSnap.docs) {
      const data = doc.data();

      // Department counts
      const dept = data.department || 'Unknown';
      if (!deptCounts[dept]) deptCounts[dept] = { count: 0, totalCGPA: 0 };
      deptCounts[dept].count++;

      // Level counts
      const level = `${data.currentLevel || 100}L`;
      levelCounts[level] = (levelCounts[level] || 0) + 1;

      // CGPA/PI from analytics
      const analyticsDoc = await adminDb.collection('analytics').doc(doc.id).get();
      const analyticsData = analyticsDoc.data();
      
      // Compute CGPA from semesters
      const semSnap = await adminDb.collection(`users/${doc.id}/semesters`).where('isComplete', '==', true).get();
      let userTotalPoints = 0;
      let userTotalCredits = 0;
      let userTotalPIPoints = 0;

      for (const semDoc of semSnap.docs) {
        const semData = semDoc.data();
        const credits = semData.creditLoaded || 0;
        userTotalCredits += credits;
        userTotalPoints += (semData.gpa || 0) * credits;
        userTotalPIPoints += (semData.pi || 0) * credits;
      }

      if (userTotalCredits > 0) {
        const userCGPA = userTotalPoints / userTotalCredits;
        const userPI = userTotalPIPoints / userTotalCredits;
        totalCGPA += userCGPA;
        totalPI += userPI;
        usersWithCGPA++;

        deptCounts[dept].totalCGPA += userCGPA;

        // Bucket
        const bucketIndex = Math.min(Math.floor(userCGPA / 0.5), 9);
        const low = (bucketIndex * 0.5).toFixed(1);
        const high = ((bucketIndex + 1) * 0.5).toFixed(1);
        cgpaBuckets[`${low}-${high}`] = (cgpaBuckets[`${low}-${high}`] || 0) + 1;

        // Degree class
        if (userCGPA >= 4.5) degreeClassCounts['First Class']++;
        else if (userCGPA >= 3.5) degreeClassCounts['Second Class Upper']++;
        else if (userCGPA >= 2.4) degreeClassCounts['Second Class Lower']++;
        else if (userCGPA >= 1.5) degreeClassCounts['Third Class']++;
        else if (userCGPA >= 1.0) degreeClassCounts['Pass']++;
        else degreeClassCounts['Fail']++;
      }

      // Signup date tracking
      const createdAt = data.createdAt?.toDate?.() || null;
      if (createdAt) {
        const dayKey = createdAt.toISOString().split('T')[0];
        signupsByDay[dayKey] = (signupsByDay[dayKey] || 0) + 1;

        if (createdAt >= oneWeekAgo) {
          activeThisWeek++;
        }
      }

      // Last login tracking for active users
      const lastLogin = data.lastLogin?.toDate?.() || null;
      if (lastLogin && lastLogin >= oneWeekAgo) {
        activeThisWeek++;
      }
    }

    // Build signup chart data (last 30 days)
    const signupChartData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      signupChartData.push({
        date: key,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: signupsByDay[key] || 0,
      });
    }

    // Department breakdown
    const departmentBreakdown = Object.entries(deptCounts)
      .map(([dept, data]) => ({
        department: dept,
        count: data.count,
        avgCGPA: data.count > 0 ? data.totalCGPA / data.count : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      totalUsers,
      avgCGPA: usersWithCGPA > 0 ? totalCGPA / usersWithCGPA : 0,
      avgPI: usersWithCGPA > 0 ? totalPI / usersWithCGPA : 0,
      activeThisWeek,
      cgpaBuckets,
      degreeClassCounts,
      departmentBreakdown,
      signupChartData,
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
