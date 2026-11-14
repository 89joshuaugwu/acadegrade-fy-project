import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { computeCumulativeCGPA, resolveDegreeClass, type DegreeClassShortLabel } from '@/lib/cgpa/academicRules';
import { CGPA_BUCKET_KEYS, bucketKeyFor } from '@/lib/admin/metrics';

/** Response keys for degreeClassCounts (kept stable for the admin analytics page). */
const DEGREE_CLASS_COUNT_KEYS: Record<DegreeClassShortLabel, string> = {
  '1st': 'First Class',
  '2:1': 'Second Class Upper',
  '2:2': 'Second Class Lower',
  '3rd': 'Third Class',
  Pass: 'Pass',
  Fail: 'Fail',
};

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
    const deptCounts: Record<string, { count: number; usersWithCGPA: number; totalCGPA: number }> = {};
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
    for (const key of CGPA_BUCKET_KEYS) cgpaBuckets[key] = 0;

    // Recent signups for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const signupsByDay: Record<string, number> = {};

    // Active this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    let activeThisWeek = 0;

    for (const doc of usersSnap.docs) {
      const data = doc.data();

      // Department counts
      const dept = data.department || 'Unknown';
      if (!deptCounts[dept]) deptCounts[dept] = { count: 0, usersWithCGPA: 0, totalCGPA: 0 };
      deptCounts[dept].count++;

      // Level counts
      const level = `${data.currentLevel || 100}L`;
      levelCounts[level] = (levelCounts[level] || 0) + 1;

      // Student rule: every graded course counts, whether or not its semester is complete.
      const semSnap = await adminDb.collection(`users/${doc.id}/semesters`).get();
      const { cgpa: userCGPA, pi: userPI, totalCredits: userTotalCredits } = computeCumulativeCGPA(
        semSnap.docs.map((semDoc) => semDoc.data() as { gpa: number; pi: number; creditLoaded: number }),
      );

      if (userTotalCredits > 0) {
        totalCGPA += userCGPA;
        totalPI += userPI;
        usersWithCGPA++;

        deptCounts[dept].totalCGPA += userCGPA;
        deptCounts[dept].usersWithCGPA++;

        // Bucket
        const bucketKey = bucketKeyFor(userCGPA);
        cgpaBuckets[bucketKey] = (cgpaBuckets[bucketKey] || 0) + 1;

        // Degree class (shared rules: rounded CGPA, lower-bound thresholds)
        degreeClassCounts[DEGREE_CLASS_COUNT_KEYS[resolveDegreeClass(userCGPA).shortLabel]]++;
      }

      // Signup date tracking
      const createdAt = data.createdAt?.toDate?.() || null;
      if (createdAt) {
        const dayKey = createdAt.toISOString().split('T')[0];
        signupsByDay[dayKey] = (signupsByDay[dayKey] || 0) + 1;
      }

      // Last login tracking for active users
      const lastLogin = data.lastLogin?.toDate?.() || null;
      if ((createdAt && createdAt >= oneWeekAgo) || (lastLogin && lastLogin >= oneWeekAgo)) {
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
        avgCGPA: data.usersWithCGPA > 0 ? data.totalCGPA / data.usersWithCGPA : 0,
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
