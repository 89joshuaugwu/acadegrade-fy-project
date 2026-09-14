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
});
