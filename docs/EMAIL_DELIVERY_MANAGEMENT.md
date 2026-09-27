# Email delivery operations

Administrators can configure separate Gmail accounts for general notifications and one-time codes in **Admin → Settings → Email delivery**. Each account needs its Gmail address and a Google App Password, not the normal Google account password. Save, then select **Verify Gmail login**. Verification authenticates with Gmail SMTP but does not send a message.

Passwords are encrypted server-side with `AI_CONFIG_MASTER_KEY` and stored in the private `_email_secrets` Firestore collection. They are not sent back to the browser after saving. Keep this master key stable and backed up securely: losing or changing it makes saved credentials unreadable. Deploy `firestore.rules` so client SDKs cannot access `_email_secrets`; admin server routes use Firebase Admin and require admin authorization.

Managed General credentials take precedence over `GMAIL_USER`/`GMAIL_PASS`. Managed OTP credentials take precedence over General, then `OTP_GMAIL_USER`/`OTP_GMAIL_PASS`, then the General environment credentials. This preserves current delivery until managed accounts are saved. Saving an account replaces its previous password; there is no password reveal. An invalid saved credential does not silently fall back to the environment, so use **Verify Gmail login** after rotation.

If Gmail returns `535 Username and Password not accepted`, confirm the exact sender account, enable the Google account prerequisites for App Passwords, create a fresh App Password, save it, and verify again. A successful login check does not guarantee delivery to every recipient. OTP delivery errors propagate to the caller; general notification delivery remains non-fatal.
