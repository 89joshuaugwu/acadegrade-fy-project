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

  it('accepts the dedicated about-page target and rejects extra fields', () => {
    const about = {
      platformDescription: 'Track academic performance with clarity.',
      academicContext: 'A final-year academic project.',
      academicContextExtra: 'Built for Nigerian university students.',
      builderName: 'Joshua Ugwu',
      builderInitials: 'JU',
      builderImageUrl: '',
      builderBio: 'Software engineer and student.',
      githubUrl: 'https://github.com/example',
      repoUrl: 'https://github.com/example/acadegrade',
      liveUrl: 'https://acadegrade.example',
      contactEmail: 'hello@acadegrade.example',
      techStack: [{ name: 'Next.js', description: 'Web application framework' }],
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
