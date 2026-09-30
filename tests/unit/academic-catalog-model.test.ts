import { describe, expect, it } from 'vitest';
import { createInitialCatalog, mutateCatalog, publicCatalog } from '@/lib/academic-catalog/model';

describe('admin academic catalog', () => {
  const defaults = { universities: ['University of Lagos, Lagos'], departments: ['Computer Science'], programmes: ['Bachelor of Science (B.Sc.)'] };

  it('publishes bundled defaults on a fresh installation', () => {
    const snapshot = createInitialCatalog(defaults);
    expect(publicCatalog(snapshot).departments).toEqual(['Computer Science']);
  });

  it('archives a default name without erasing the saved student value', () => {
    const snapshot = createInitialCatalog(defaults);
    const id = snapshot.entries.find((entry) => entry.name === 'Computer Science')!.id;
    const updated = mutateCatalog(snapshot, { action: 'archive', id });
    expect(publicCatalog(updated).departments).toEqual([]);
    expect(updated.entries.find((entry) => entry.id === id)?.name).toBe('Computer Science');
  });

  it('rejects a duplicate regardless of case and whitespace', () => {
    const snapshot = createInitialCatalog(defaults);
    expect(() => mutateCatalog(snapshot, { action: 'add', kind: 'department', name: '  computer   science ' })).toThrow(/already exists/i);
  });

  it('adds a department without changing existing profile names', () => {
    const updated = mutateCatalog(createInitialCatalog(defaults), { action: 'add', kind: 'department', name: 'Computer Engineering' });
    expect(publicCatalog(updated).departments).toEqual(['Computer Science', 'Computer Engineering']);
    expect(updated.revision).toBe(2);
  });
});
