import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * GET /api/admin/api-analytics
 * Returns aggregated API usage data for the admin dashboard.
 * Query params:
 *   - range: 'day' | 'week' | 'month' (default: 'week')
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check — admin only
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const adminsDoc = await adminDb.collection('config').doc('admins').get();
    const adminEmails: string[] = adminsDoc.data()?.emails || [];
    if (!adminEmails.includes(decoded.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse range
    const { searchParams } = request.nextUrl;
    const range = searchParams.get('range') || 'week';

    const now = new Date();
    let since: Date;
    switch (range) {
      case 'day':
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'month':
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'week':
      default:
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    // Fetch logs from Firestore
    const logsSnapshot = await adminDb
      .collection('api_logs')
      .where('timestamp', '>=', since)
      .orderBy('timestamp', 'desc')
      .limit(5000)
      .get();

    const logs = logsSnapshot.docs.map(doc => doc.data());

    // --- Aggregation ---

    // 1. Total calls & error rate
    const totalCalls = logs.length;
    const errorCalls = logs.filter(l => l.status >= 400).length;
    const errorRate = totalCalls > 0 ? ((errorCalls / totalCalls) * 100).toFixed(1) : '0.0';
    const avgDuration = totalCalls > 0
      ? Math.round(logs.reduce((sum, l) => sum + (l.durationMs || 0), 0) / totalCalls)
      : 0;

    // 2. By category
    const byCategory: Record<string, { count: number; errors: number; avgMs: number }> = {};
    logs.forEach(l => {
      const cat = l.category || 'unknown';
      if (!byCategory[cat]) byCategory[cat] = { count: 0, errors: 0, avgMs: 0 };
      byCategory[cat].count++;
      if (l.status >= 400) byCategory[cat].errors++;
      byCategory[cat].avgMs += l.durationMs || 0;
    });
    Object.values(byCategory).forEach(v => {
      v.avgMs = v.count > 0 ? Math.round(v.avgMs / v.count) : 0;
    });

    // 3. By endpoint
    const byEndpoint: Record<string, { count: number; errors: number }> = {};
    logs.forEach(l => {
      const ep = l.endpoint || 'unknown';
      if (!byEndpoint[ep]) byEndpoint[ep] = { count: 0, errors: 0 };
      byEndpoint[ep].count++;
      if (l.status >= 400) byEndpoint[ep].errors++;
    });

    // 4. By provider
    const byProvider: Record<string, number> = {};
    logs.forEach(l => {
      if (l.provider) {
        byProvider[l.provider] = (byProvider[l.provider] || 0) + 1;
      }
    });

    // 5. Top users (by call count)
    const byUser: Record<string, { count: number; errors: number; lastEndpoint: string }> = {};
    logs.forEach(l => {
      const uid = l.uid || 'anonymous';
      if (!byUser[uid]) byUser[uid] = { count: 0, errors: 0, lastEndpoint: '' };
      byUser[uid].count++;
      if (l.status >= 400) byUser[uid].errors++;
      byUser[uid].lastEndpoint = l.endpoint || '';
    });

    // Resolve user names for top 10
    const topUserEntries = Object.entries(byUser)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10);

    const topUsers = await Promise.all(
      topUserEntries.map(async ([uid, data]) => {
        let name = uid === 'anonymous' ? 'Anonymous' : uid.substring(0, 8) + '...';
        let email = '';
        if (uid !== 'anonymous') {
          try {
            const userDoc = await adminDb.collection('users').doc(uid).get();
            if (userDoc.exists) {
              name = userDoc.data()?.fullName || name;
              email = userDoc.data()?.email || '';
            }
          } catch { /* skip */ }
        }
        return { uid, name, email, ...data };
      })
    );

    // 6. Timeline — bucket by hour for 'day', by day for 'week'/'month'
    const timeline: Record<string, number> = {};
    logs.forEach(l => {
      const ts = l.timestamp?.toDate ? l.timestamp.toDate() : new Date(l.timestamp);
      let key: string;
      if (range === 'day') {
        key = `${ts.getHours().toString().padStart(2, '0')}:00`;
      } else {
        key = `${ts.getMonth() + 1}/${ts.getDate()}`;
      }
      timeline[key] = (timeline[key] || 0) + 1;
    });

    // Convert to sorted array
    const timelineData = Object.entries(timeline)
      .map(([label, calls]) => ({ label, calls }))
      .sort((a, b) => {
        // Sort chronologically
        if (range === 'day') return a.label.localeCompare(b.label);
        const [am, ad] = a.label.split('/').map(Number);
        const [bm, bd] = b.label.split('/').map(Number);
        return am !== bm ? am - bm : ad - bd;
      });

    // 7. Recent errors
    const recentErrors = logs
      .filter(l => l.status >= 400)
      .slice(0, 15)
      .map(l => ({
        endpoint: l.endpoint,
        status: l.status,
        error: l.error || 'Unknown error',
        uid: l.uid,
        timestamp: l.timestamp?.toDate ? l.timestamp.toDate().toISOString() : l.timestamp,
      }));

    return NextResponse.json({
      totalCalls,
      errorCalls,
      errorRate,
      avgDuration,
      byCategory,
      byEndpoint,
      byProvider,
      topUsers,
      timelineData,
      recentErrors,
      range,
    });

  } catch (error: any) {
    console.error('API Analytics Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
