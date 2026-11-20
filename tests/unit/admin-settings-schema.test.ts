import { describe, expect, it } from 'vitest';
import { parseAdminSettingsMutation } from '@/lib/admin/settings-schema';

describe('parseAdminSettingsMutation', () => {
  it('rejects an arbitrary Firestore document target', () => {
    expect(() => parseAdminSettingsMutation({
      collection: 'users',
      doc: 'another-user',
      data: { role: 'admin' },
    })).toThrow('Unsupported settings operation');
  });

  it('rejects unknown setting fields and invalid values', () => {
    expect(() => parseAdminSettingsMutation({ field: 'adminEmails', value: ['attacker@example.com'] }))
      .toThrow('Unsupported setting field');
    expect(() => parseAdminSettingsMutation({ field: 'maintenanceMode', value: 'yes' }))
      .toThrow('maintenanceMode must be a boolean');
  });

  it('accepts a validated settings-field update', () => {
    expect(parseAdminSettingsMutation({
      field: 'disabledFeatures',
      value: ['extract_slip', 'ai_insights'],
    })).toEqual({
      target: 'settings',
      data: { disabledFeatures: ['extract_slip', 'ai_insights'] },
    });
  });

  it('rejects grade scales with gaps or overlapping ranges', () => {
    expect(() => parseAdminSettingsMutation({
      field: 'gradeScale',
      value: [
        { grade: 'A', min: 70, max: 100, points: 5 },
        { grade: 'B', min: 50, max: 68, points: 4 },
        { grade: 'F', min: 0, max: 49, points: 0 },
      ],
    })).toThrow('Grade scale must cover every score from 0 to 100 exactly once');
  });

  it('rejects unsafe public URLs', () => {
    expect(() => parseAdminSettingsMutation({
      field: 'mobileAppLinks',
      value: { androidUrl: 'javascript:alert(1)', iosUrl: '' },
    })).toThrow('androidUrl must be an HTTPS URL');
  });

  it('accepts the Android size and Google Play link (android-app.md), and leaves them out when not sent', () => {
    expect(parseAdminSettingsMutation({
      field: 'mobileAppLinks',
      value: { androidUrl: 'https://example.com/a.apk', iosUrl: '', androidSizeMb: 45, playUrl: 'https://play.google.com/store/apps/details?id=com.acadegrade.app' },
    })).toEqual({
      target: 'settings',
      data: { mobileAppLinks: { androidUrl: 'https://example.com/a.apk', iosUrl: '', androidSizeMb: 45, playUrl: 'https://play.google.com/store/apps/details?id=com.acadegrade.app' } },
    });
    expect(parseAdminSettingsMutation({ field: 'mobileAppLinks', value: { androidUrl: '', iosUrl: '', androidSizeMb: null, playUrl: '' } }))
      .toEqual({ target: 'settings', data: { mobileAppLinks: { androidUrl: '', iosUrl: '', androidSizeMb: null, playUrl: '' } } });
    // Older panels send only the two links; the merge write then keeps the stored size and Play link.
    expect(parseAdminSettingsMutation({ field: 'mobileAppLinks', value: { androidUrl: '', iosUrl: '' } }))
      .toEqual({ target: 'settings', data: { mobileAppLinks: { androidUrl: '', iosUrl: '' } } });
  });

  it('rejects a bad Android size or a non-Play store link', () => {
    for (const androidSizeMb of [0, 501, 4.5, '45', -1]) {
      expect(() => parseAdminSettingsMutation({ field: 'mobileAppLinks', value: { androidUrl: '', iosUrl: '', androidSizeMb } }))
        .toThrow('androidSizeMb must be a whole number from 1 to 500');
    }
    for (const playUrl of ['https://example.com/app', 'http://play.google.com/store/apps/details?id=x', 'javascript:alert(1)']) {
      expect(() => parseAdminSettingsMutation({ field: 'mobileAppLinks', value: { androidUrl: '', iosUrl: '', playUrl } }))
        .toThrow('playUrl must be an HTTPS link on play.google.com');
    }
  });

  it('accepts the dedicated about-page target and rejects extra fields', () => {
    const about = {
      headline: 'Academic progress, made clear.',
      platformDescription: 'Track academic performance with clarity.',
      mission: 'Give every student a dependable view of their degree progress.',
      trustStatement: 'Your academic records remain under your control.',
      contactEmail: 'hello@acadegrade.example',
    };

    expect(parseAdminSettingsMutation({ target: 'about', data: about })).toEqual({
      target: 'about',
      data: about,
    });
    expect(() => parseAdminSettingsMutation({
      target: 'about',
      data: { ...about, admin: true },
    })).toThrow('Unsupported about field');
  });

  it('allows an empty about contact email (public pages then link to /support) but rejects a malformed one', () => {
    const about = {
      headline: 'Academic progress, made clear.',
      platformDescription: 'Track academic performance with clarity.',
      mission: 'Give every student a dependable view of their degree progress.',
      trustStatement: 'Your academic records remain under your control.',
      contactEmail: '',
    };
    expect(parseAdminSettingsMutation({ target: 'about', data: about })).toEqual({ target: 'about', data: about });
    expect(() => parseAdminSettingsMutation({ target: 'about', data: { ...about, contactEmail: 'not-an-email' } }))
      .toThrow('contactEmail must be a valid email address');
  });

  it('accepts the server-enforced feature ids added for kill switches', () => {
    expect(parseAdminSettingsMutation({ field: 'disabledFeatures', value: ['ai_forecast', 'ai_whatif', 'transcript_pdf', 'transcript_share'] }))
      .toEqual({ target: 'settings', data: { disabledFeatures: ['ai_forecast', 'ai_whatif', 'transcript_pdf', 'transcript_share'] } });
  });

  it('accepts the timetable switch (T1)', () => {
    expect(parseAdminSettingsMutation({ field: 'disabledFeatures', value: ['timetable'] }))
      .toEqual({ target: 'settings', data: { disabledFeatures: ['timetable'] } });
  });

  it('accepts the age/consent gate switch and rejects anything else in it', () => {
    expect(parseAdminSettingsMutation({ field: 'ageGate', value: { enforceUnknown: false } }))
      .toEqual({ target: 'settings', data: { ageGate: { enforceUnknown: false } } });
    expect(() => parseAdminSettingsMutation({ field: 'ageGate', value: { enforceUnknown: 'no' } })).toThrow('ageGate.enforceUnknown must be a boolean');
    expect(() => parseAdminSettingsMutation({ field: 'ageGate', value: { enforceUnknown: true, extra: 1 } })).toThrow('Unsupported ageGate field');
  });

  it('accepts an AdMob Android App ID for app-ads.txt and rejects ad unit IDs', () => {
    expect(parseAdminSettingsMutation({ field: 'admobAndroidAppId', value: ' ca-app-pub-2745430575041686~2976964736 ' }))
      .toEqual({ target: 'settings', data: { admobAndroidAppId: 'ca-app-pub-2745430575041686~2976964736' } });
    expect(parseAdminSettingsMutation({ field: 'admobAndroidAppId', value: '' })).toEqual({ target: 'settings', data: { admobAndroidAppId: '' } });
    expect(() => parseAdminSettingsMutation({ field: 'admobAndroidAppId', value: 'ca-app-pub-2745430575041686/2976964736' }))
      .toThrow('admobAndroidAppId must look like ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY');
  });
});
