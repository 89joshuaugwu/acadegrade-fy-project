'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { ErrorState } from '@/components/shared';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { TableFrame, tableClass } from '@/components/admin/ui/TableFrame';
import { AdminSelect } from '@/components/admin/ui/AdminSelect';
import { Notice } from '@/components/admin/ui/Notice';
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

const LEVEL_OPTIONS = [100, 200, 300, 400, 500].map(level => ({ value: String(level), label: `${level}L` }));
const SEMESTER_OPTIONS = [
  { value: '1', label: 'First semester' },
  { value: '2', label: 'Second semester' },
];
const semesterName = (semester: number) => (semester === 2 ? 'second semester' : semester === 1 ? 'first semester' : `semester ${semester}`);

const iconButtonClass = 'flex size-11 items-center justify-center rounded-[12px] text-[var(--acade-text-muted)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]';

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

  const header = (
    <AdminPageHeader
      title="Legacy course list"
      description={error ? 'An old list of course codes and titles.' : `An old list of course codes and titles. ${courses.length} course${courses.length !== 1 ? 's' : ''} stored.`}
      helpId="admin.course-list"
      actions={<Button size="sm" variant="primary" onClick={openAdd} disabled={!!error}><Plus size={16} aria-hidden="true" />Add course</Button>}
    >
      <Notice tone="warning" className="mt-3 max-w-2xl">No app reads this list. Course codes students share are created from their own semesters.</Notice>
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
        <Skeleton className="h-12 w-full rounded-[12px]" />
        <Skeleton className="h-96 w-full rounded-[20px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      {/* Search */}
      <div className="relative">
        <Search size={18} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--acade-text-muted)]" />
        <input type="search" aria-label="Search courses" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by code, title or department"
          className="h-12 w-full rounded-[12px] border border-[var(--acade-control-border)] bg-[var(--acade-deep)] pl-12 pr-4 text-sm text-[var(--acade-text)] placeholder:text-[var(--acade-text-faint)] transition-colors focus:border-[var(--acade-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acade-primary)]/20" />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div role="status" className="rounded-[20px] border border-[var(--acade-border-subtle)] bg-[var(--acade-surface)] p-12 text-center text-sm text-[var(--acade-text-muted)]">{searchQuery ? 'No courses match your search.' : 'No courses in catalog yet.'}</div>
      ) : (
        <TableFrame label="Legacy courses">
          <table className={tableClass}>
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Title</th>
                <th scope="col" className="ag-right hidden md:table-cell">Units</th>
                <th scope="col" className="hidden md:table-cell">Department</th>
                <th scope="col" className="hidden md:table-cell">Level</th>
                <th scope="col" className="hidden lg:table-cell">Semester</th>
                <th scope="col" className="ag-right"><span className="sr-only md:not-sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td className="whitespace-nowrap font-semibold">{c.code}</td>
                  <td className="min-w-0">
                    <span className="block text-[var(--acade-text)]">{c.title}</span>
                    {/* Small screens hide the columns; keep their facts on a second line. */}
                    <span className="mt-0.5 block text-[0.8125rem] text-[var(--acade-text-muted)] md:hidden">{c.department || 'No department'}, {c.level}L, {c.units} units, {semesterName(c.semester)}</span>
                  </td>
                  <td className="ag-right hidden md:table-cell">{c.units}</td>
                  <td className="hidden text-[var(--acade-text-muted)] md:table-cell">{c.department}</td>
                  <td className="hidden whitespace-nowrap text-[var(--acade-text-muted)] md:table-cell">{c.level}L</td>
                  <td className="hidden whitespace-nowrap text-[var(--acade-text-muted)] lg:table-cell">{semesterName(c.semester).replace(/^./, (s) => s.toUpperCase())}</td>
                  <td className="ag-right">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => openEdit(c)} className={`${iconButtonClass} hover:bg-[var(--acade-primary-dim)] hover:text-[var(--acade-primary)]`} aria-label={`Edit ${c.code}`}><Pencil size={16} aria-hidden="true" /></button>
                      <button type="button" onClick={() => setDeleteConfirm(c)} className={`${iconButtonClass} hover:bg-[var(--acade-danger-dim)] hover:text-[var(--acade-danger)]`} aria-label={`Delete ${c.code}`}><Trash2 size={16} aria-hidden="true" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCourse ? `Edit ${editingCourse.code}` : 'Add new course'}
        description="Students see these details when they pick a course."
      >
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void handleSave(); }}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input id="course-code" label="Course code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="CSC301" />
            <Input id="course-units" label="Credit units" type="text" inputMode="numeric" pattern="[0-9]*" value={String(form.units)} onChange={e => setForm({ ...form, units: Number(e.target.value.replace(/[^0-9]/g, '')) })} placeholder="3" />
          </div>
          <Input id="course-title" label="Course title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Data Structures and Algorithms" />
          <Input id="course-dept" label="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Computer Science" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AdminSelect label="Level" options={LEVEL_OPTIONS} value={String(form.level)} onChange={value => setForm({ ...form, level: Number(value) })} />
            <AdminSelect label="Semester" options={SEMESTER_OPTIONS} value={String(form.semester)} onChange={value => setForm({ ...form, semester: Number(value) })} />
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
