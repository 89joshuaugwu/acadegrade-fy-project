'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { ErrorState } from '@/components/shared';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import toast from 'react-hot-toast';

interface CatalogCourse {
  id: string;
  code: string;
  title: string;
  units: number;
  department: string;
  level: number;
  semester: number;
}

const EMPTY_FORM: Omit<CatalogCourse, 'id'> = { code: '', title: '', units: 3, department: '', level: 100, semester: 1 };

export default function AdminCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<CatalogCourse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<CatalogCourse | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const getToken = () => user!.getIdToken();

  const loadCourses = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/courses', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Course catalog request failed.');
      const data = await res.json();
      setCourses(Array.isArray(data.courses) ? data.courses : []);
    } catch (err) {
      console.error(err);
      // An unloaded catalog must not look like an empty one.
      setError('The course service did not respond. The catalog has not changed.');
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void loadCourses(); }, [loadCourses]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const q = searchQuery.toLowerCase();
    return courses.filter(c => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.department.toLowerCase().includes(q));
  }, [courses, searchQuery]);

  const openAdd = () => { setEditingCourse(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (c: CatalogCourse) => { setEditingCourse(c); setForm({ code: c.code, title: c.title, units: c.units, department: c.department, level: c.level, semester: c.semester }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.code || !form.title) { toast.error('Code and Title are required.'); return; }
    setSaving(true);
    try {
      const token = await getToken();
      if (editingCourse) {
        const res = await fetch('/api/admin/courses', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: editingCourse.id, ...form }),
        });
        if (res.ok) { toast.success('Course updated.'); setModalOpen(false); loadCourses(); }
        else toast.error('Failed to update.');
      } else {
        const res = await fetch('/api/admin/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(form),
        });
        if (res.ok) { toast.success('Course added.'); setModalOpen(false); loadCourses(); }
        else toast.error('Failed to add course.');
      }
    } catch (err) { toast.error('Error saving course.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (course: CatalogCourse) => {
    setDeleting(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/courses?id=${encodeURIComponent(course.id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { setCourses(prev => prev.filter(c => c.id !== course.id)); toast.success(`${course.code} deleted.`); }
      else toast.error(`Could not delete ${course.code}. Try again.`);
    } catch { toast.error(`Could not delete ${course.code}. Check your connection.`); }
    finally { setDeleting(false); setDeleteConfirm(null); }
  };

  const selectClass = 'h-12 w-full rounded-xl border border-[var(--acade-control-border)] bg-[var(--acade-deep)] px-4 text-[length:var(--text-sm)] text-[var(--acade-text)] focus:border-[var(--acade-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--acade-primary)]/20';
  const header = (
    <AdminPageHeader
      title="Legacy course list"
      description={error ? 'An old list of course codes and titles.' : `An old list of course codes and titles. ${courses.length} course${courses.length !== 1 ? 's' : ''} stored.`}
      helpId="admin.course-list"
      actions={<Button size="sm" variant="primary" onClick={openAdd} disabled={!!error}><Plus size={16} aria-hidden="true" />Add course</Button>}
    >
      <p className="mt-3 max-w-2xl rounded-xl bg-[var(--acade-warning)]/10 px-3 py-2 text-sm text-[var(--acade-text)]">
        No app reads this list. Course codes students share are created from their own semesters.
      </p>
    </AdminPageHeader>
  );

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState title="Courses could not be loaded" description={error} onRetry={() => { setLoading(true); void loadCourses(); }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-4"><Skeleton className="h-12 flex-1" /><Skeleton className="h-12 w-36" /></div>
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      {/* Search */}
      <div className="relative">
        <Search size={18} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--acade-text-muted)]" />
        <input type="search" aria-label="Search courses" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by code, title, or department..."
          className="w-full h-12 pl-12 pr-4 rounded-xl bg-[var(--acade-deep)] border border-[var(--acade-border)] text-[var(--acade-text)] text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)] placeholder:text-[var(--acade-text-faint)] focus:outline-none focus:border-[var(--acade-primary)] focus-visible:ring-2 focus-visible:ring-[var(--acade-primary)]/30 transition-colors" />
      </div>

      {/* Table */}
      <Card variant="default" padding="none" className="overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_2fr_0.5fr_1.2fr_0.5fr_0.5fr_0.8fr] gap-2 px-5 py-3 bg-[var(--acade-overlay)]/30 border-b border-[var(--acade-border)] text-[length:var(--text-xs)] font-bold text-[var(--acade-text-muted)] uppercase tracking-wider">
          <span>Code</span><span>Title</span><span>Units</span><span>Department</span><span>Level</span><span>Sem</span><span>Actions</span>
        </div>
        {filtered.length === 0 ? (
          <div role="status" className="p-12 text-center text-[var(--acade-text-muted)]">{searchQuery ? 'No courses match your search.' : 'No courses in catalog yet.'}</div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_0.5fr_1.2fr_0.5fr_0.5fr_0.8fr] gap-2 px-5 py-3.5 border-b border-[var(--acade-border-subtle)] hover:bg-[var(--acade-overlay)]/10 transition-colors items-center">
              <span className="font-bold text-[length:var(--text-sm)] text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)]">{c.code}</span>
              <div className="min-w-0">
                <span className="block truncate text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">{c.title}</span>
                {/* Small screens hide the columns; keep their facts on a second line. */}
                <span className="mt-0.5 block truncate text-xs text-[var(--acade-text-muted)] md:hidden">{c.department || 'No department'} · {c.level}L · {c.units} units · S{c.semester}</span>
              </div>
              <span className="text-[length:var(--text-sm)] text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)] hidden md:block">{c.units}</span>
              <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] truncate hidden md:block">{c.department}</span>
              <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-geist-mono)] hidden md:block">{c.level}L</span>
              <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] hidden md:block">S{c.semester}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => openEdit(c)} className="flex size-11 items-center justify-center rounded-lg text-[var(--acade-text-muted)] transition-colors hover:bg-[var(--acade-primary)]/10 hover:text-[var(--acade-primary)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]" aria-label={`Edit ${c.code}`}><Pencil size={16} aria-hidden="true" /></button>
                <button type="button" onClick={() => setDeleteConfirm(c)} className="flex size-11 items-center justify-center rounded-lg text-[var(--acade-text-muted)] transition-colors hover:bg-[var(--acade-danger)]/10 hover:text-[var(--acade-danger)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]" aria-label={`Delete ${c.code}`}><Trash2 size={16} aria-hidden="true" /></button>
              </div>
            </div>
          ))
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCourse ? `Edit ${editingCourse.code}` : 'Add new course'}
        description="Students see these details when they pick a course."
      >
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void handleSave(); }}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input id="course-code" label="Course code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="CSC301" />
            <Input id="course-units" label="Credit units" type="number" min={0} value={String(form.units)} onChange={e => setForm({ ...form, units: Number(e.target.value) })} placeholder="3" />
          </div>
          <Input id="course-title" label="Course title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Data Structures and Algorithms" />
          <Input id="course-dept" label="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Computer Science" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="course-level" className="mb-1.5 block text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)]">Level</label>
              <select id="course-level" value={form.level} onChange={e => setForm({ ...form, level: Number(e.target.value) })} className={selectClass}>
                {[100, 200, 300, 400, 500].map(l => <option key={l} value={l}>{l}L</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="course-semester" className="mb-1.5 block text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)]">Semester</label>
              <select id="course-semester" value={form.semester} onChange={e => setForm({ ...form, semester: Number(e.target.value) })} className={selectClass}>
                <option value={1}>First Semester</option>
                <option value={2}>Second Semester</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-[var(--acade-border-subtle)] pt-4">
            <Button type="button" variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={saving}>{editingCourse ? 'Save changes' : 'Add course'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={`Delete ${deleteConfirm?.code ?? 'course'}?`}
        description={`${deleteConfirm?.title ?? 'This course'} will be removed from the catalog. Results students already saved are not changed.`}
        confirm={{ label: 'Delete course', loading: deleting, onConfirm: () => { if (deleteConfirm) void handleDelete(deleteConfirm); } }}
      >
        <p className="text-sm text-[var(--acade-text-muted)]">This cannot be undone from here.</p>
      </Modal>
    </div>
  );
}
