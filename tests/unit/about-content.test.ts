import { describe, expect, it } from 'vitest';
import { DEFAULT_ABOUT_CONTENT, normalizeAboutContent } from '@/lib/about/content';

describe('normalizeAboutContent', () => {
  it('does not expose legacy school-project or repository fields', () => {
    const result = normalizeAboutContent({
      academicContext: 'Final Year Project for CSC 499',
      repoUrl: 'https://github.com/example/project',
      githubUrl: 'https://github.com/example',
      builderName: 'A student developer',
    });

    expect(result).toEqual(DEFAULT_ABOUT_CONTENT);
    expect(result).not.toHaveProperty('academicContext');
    expect(result).not.toHaveProperty('repoUrl');
    expect(result).not.toHaveProperty('githubUrl');
    expect(result).not.toHaveProperty('builderName');
  });

  it('never falls back to an unconfirmed hard-coded address', () => {
    const previous = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
    try {
      delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
      expect(normalizeAboutContent({}).contactEmail).toBe('');
      expect(normalizeAboutContent({ contactEmail: 'not-an-email' }).contactEmail).toBe('');
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL = 'Help@Example.org';
      expect(normalizeAboutContent({}).contactEmail).toBe('help@example.org');
      expect(normalizeAboutContent({ contactEmail: 'admin@example.org' }).contactEmail).toBe('admin@example.org');
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
      else process.env.NEXT_PUBLIC_SUPPORT_EMAIL = previous;
    }
  });

  it('uses valid production copy saved by an administrator', () => {
    expect(normalizeAboutContent({
      headline: 'Know where your degree stands.',
      platformDescription: 'A clear academic record for every semester.',
      mission: 'Help students make informed academic decisions.',
      trustStatement: 'Records stay private until a student chooses to share them.',
      contactEmail: 'hello@acadegrade.com',
    })).toEqual({
      headline: 'Know where your degree stands.',
      platformDescription: 'A clear academic record for every semester.',
      mission: 'Help students make informed academic decisions.',
      trustStatement: 'Records stay private until a student chooses to share them.',
      contactEmail: 'hello@acadegrade.com',
    });
  });
});
