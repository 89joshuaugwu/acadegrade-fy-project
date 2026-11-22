import { describe, expect, it } from 'vitest';
import { navigationFor, pageRecordType, RECORD_TYPE_COPY } from '@/lib/records/navigation';
import { studentNavigation } from '@/lib/ui/route-meta';

describe('navigationFor', () => {
  it('keeps the tertiary tabs exactly as today', () => {
    expect(navigationFor('tertiary')).toEqual(studentNavigation);
  });

  it('shows only Dashboard and O-level for WAEC/NECO accounts', () => {
    expect(navigationFor('olevel').map((item) => item.href)).toEqual(['/dashboard', '/olevel']);
  });

  it('shows Dashboard, Aggregate and O-level for JAMB accounts', () => {
    expect(navigationFor('admission').map((item) => item.href)).toEqual(['/dashboard', '/admission', '/olevel']);
  });
});

describe('pageRecordType', () => {
  it('lets tertiary accounts use every tertiary page', () => {
    for (const path of ['/dashboard', '/results', '/results/abc', '/insights', '/transcript', '/timetable/new', '/settings']) {
      expect(pageRecordType(path, 'tertiary')).toBeNull();
    }
  });

  it('flags university pages for O-level and admission accounts', () => {
    expect(pageRecordType('/results/new', 'olevel')).toBe('tertiary');
    expect(pageRecordType('/insights', 'admission')).toBe('tertiary');
    expect(pageRecordType('/transcript', 'olevel')).toBe('tertiary');
    expect(pageRecordType('/timetable', 'olevel')).toBe('tertiary');
  });

  it('opens the O-level page to O-level and admission accounts only', () => {
    expect(pageRecordType('/olevel', 'olevel')).toBeNull();
    expect(pageRecordType('/olevel', 'admission')).toBeNull();
    expect(pageRecordType('/olevel', 'tertiary')).toBe('olevel');
  });

  it('opens the aggregate page to admission accounts only', () => {
    expect(pageRecordType('/admission', 'admission')).toBeNull();
    expect(pageRecordType('/admission', 'olevel')).toBe('admission');
    expect(pageRecordType('/admission/', 'tertiary')).toBe('admission');
  });

  it('never blocks shared pages', () => {
    for (const path of ['/dashboard', '/settings', '/notifications', '/olevelx']) {
      expect(pageRecordType(path, 'olevel')).toBeNull();
    }
  });
});

describe('copy', () => {
  it('names every type in plain words', () => {
    expect(RECORD_TYPE_COPY.tertiary.title).toBe('University, polytechnic or college results');
    expect(RECORD_TYPE_COPY.olevel.title).toBe('WAEC or NECO results');
    expect(RECORD_TYPE_COPY.admission.title).toBe('JAMB and admission');
  });
});
