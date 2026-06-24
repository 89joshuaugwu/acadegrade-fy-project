import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminRtdb, adminMessaging } from '@/lib/firebase/admin';

/**
 * POST /api/notifications/send
 * Body: { uid: string, token?: string, title: string, message: string, type: string }
 * Note: Either uid or token is required. If uid, it fetches the token from Firestore.
 */

// This needs to be secured so that only our internal backend services or admins can call it.
// We can use a Bearer token or an internal API secret.
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const isInternalCall = authHeader === `Bearer ${process.env.INTERNAL_API_SECRET}`;

    const { uid, token: providedToken, title, message, type, event, data } = await request.json();

    if (!uid && !providedToken) {
      return NextResponse.json({ error: 'Missing target uid or token' }, { status: 400 });
    }

    // If not internal, verify as admin or as the owner
    if (!isInternalCall) {
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const token = authHeader.split('Bearer ')[1];
      const decoded = await adminAuth.verifyIdToken(token);
      const adminsDoc = await adminDb.collection('config').doc('admins').get();
      const adminEmails: string[] = adminsDoc.data()?.emails || [];
      const isAdmin = adminEmails.includes(decoded.email?.toLowerCase() || '');
      
      if (!isAdmin && decoded.uid !== uid) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    let fcmTokens: string[] = providedToken ? [providedToken] : [];
    let userEmail = '';

    // Fetch user doc if UID is provided
    if (uid) {
      const userDoc = await adminDb.collection('users').doc(uid).get();
      const dbTokens = userDoc.data()?.fcmTokens || [];
      if (dbTokens.length > 0) {
        fcmTokens = [...new Set([...fcmTokens, ...dbTokens])];
      } else if (userDoc.data()?.fcmToken) {
        fcmTokens.push(userDoc.data()?.fcmToken);
      }
      userEmail = userDoc.data()?.email || '';
    }

    if (type === 'email') {
      if (!userEmail && !providedToken) {
        return NextResponse.json({ error: 'Missing email address for email type' }, { status: 400 });
      }
      const targetEmail = userEmail || providedToken; // if token was abused to pass email
      
      const { sendEmail, welcomeEmail, semesterSavedEmail, degreeClassEmail, adminNewUserEmail } = await import('@/lib/email/mailer');
      
      const emailEvent = event;
      const eventData = data || {};
      
      let htmlBody = message;
      let emailSubject = title;

      if (emailEvent === 'welcome') {
        htmlBody = welcomeEmail(eventData.name || 'Student');
        emailSubject = 'Welcome to AcadeGrade';
      } else if (emailEvent === 'semesterSaved') {
        htmlBody = semesterSavedEmail(eventData.name || 'Student', eventData.gpa || 0, eventData.semester || '');
        emailSubject = 'Semester Results Saved';
      } else if (emailEvent === 'degreeClass') {
        htmlBody = degreeClassEmail(eventData.name || 'Student', eventData.degreeClass || '');
        emailSubject = 'Degree Class Achievement! 🎓';
      }

      await sendEmail(targetEmail, emailSubject, htmlBody);
      
      return NextResponse.json({ success: true, message: 'Email sent.' });
    }

    // 1. Create the notification in Firestore (inbox)
    if (uid) {
      const notifRef = adminDb.collection(`notifications/${uid}/items`).doc();
      await notifRef.set({
        title,
        message,
        type: type || 'info',
        read: false,
        createdAt: new Date(),
      });

      // 2. Increment Realtime Database unread count
      const rtdbRef = adminRtdb.ref(`notif_counts/${uid}/unread`);
      await rtdbRef.transaction((currentValue) => {
        return (currentValue || 0) + 1;
      });
    }

    // 3. Send Push Notification if tokens exist
    if (fcmTokens.length > 0) {
      // Check user preferences if uid is provided
      let shouldSendPush = true;
      if (uid) {
        const userDoc = await adminDb.collection('users').doc(uid).get();
        const prefs = userDoc.data()?.notificationPreferences || {};
        
        // Map event to preference key
        if (event === 'semesterSaved' && prefs.semesterSaved === false) shouldSendPush = false;
        if (event === 'degreeClass' && prefs.degreeClass === false) shouldSendPush = false;
        if (event === 'aiInsights' && prefs.aiInsights === false) shouldSendPush = false;
        if (type === 'broadcast' && prefs.adminBroadcasts === false) shouldSendPush = false;
      }

      if (shouldSendPush) {
        try {
          // De-duplicate tokens
          const uniqueTokens = [...new Set(fcmTokens)];
          
          const response = await adminMessaging.sendEachForMulticast({
            tokens: uniqueTokens,
            notification: {
              title,
              body: message,
            },
            data: {
              type: type || 'info',
              url: data?.url || '/notifications',
            },
            // Android-specific: high priority for immediate delivery
            android: {
              priority: 'high',
              notification: {
                channelId: 'acadegrade_default',
                icon: 'ic_notification',
                color: '#6366F1',
              },
            },
            // Web push specific
            webpush: {
              headers: {
                Urgency: 'high',
              },
              notification: {
                icon: 'https://acadegrade.com/android-chrome-192x192.png',
                badge: 'https://acadegrade.com/favicon-32x32.png',
              },
            },
          });

          // Clean up ONLY permanently invalid tokens.
          // Do NOT remove on messaging/invalid-argument — that error can be caused
          // by payload formatting issues, not necessarily a dead token.
          const tokensToRemove: string[] = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const errorCode = resp.error?.code;
              console.warn(`[FCM] Send failed for token[${idx}] (${uniqueTokens[idx]?.substring(0, 20)}...): ${errorCode} — ${resp.error?.message}`);
              // Only purge tokens that are definitively dead/unregistered
              if (
                errorCode === 'messaging/invalid-registration-token' ||
                errorCode === 'messaging/registration-token-not-registered'
              ) {
                tokensToRemove.push(uniqueTokens[idx]);
              }
            }
          });

          // Remove stale tokens from user's Firestore document
          if (tokensToRemove.length > 0 && uid) {
            try {
              const { FieldValue } = await import('firebase-admin/firestore');
              await adminDb.collection('users').doc(uid).update({
                fcmTokens: FieldValue.arrayRemove(...tokensToRemove),
              });
              console.log(`Cleaned up ${tokensToRemove.length} stale FCM tokens for user ${uid}`);
            } catch (cleanupErr) {
              console.error('Failed to clean up stale FCM tokens:', cleanupErr);
            }
          }

          console.log(`FCM: ${response.successCount}/${uniqueTokens.length} delivered for user ${uid || 'unknown'}`);
        } catch (fcmError) {
          console.error('FCM Send Error:', fcmError);
          // We do not fail the request if push fails
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Notification sent.' });
  } catch (error: any) {
    console.error('Send Notification Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
