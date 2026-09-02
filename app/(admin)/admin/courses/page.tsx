'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<CatalogCourse | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user) loadCourses(); }, [user]);

  const getToken = () => user!.getIdToken();

  const loadCourses = async () => {
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/courses', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses);
      }
    } catch (err) { console.error(err); toast.error('Failed to load courses.'); }
    finally { setLoading(false); }
  };

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

  const handleDelete = async (id: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/courses?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { setCourses(prev => prev.filter(c => c.id !== id)); toast.success('Course deleted.'); }
      else toast.error('Failed to delete.');
    } catch (err) { toast.error('Error deleting course.'); }
    finally { setDeleteConfirm(null); }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[length:var(--text-3xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">Course Catalog</h1>
          <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mt-1">{courses.length} course{courses.length !== 1 ? 's' : ''} in catalog</p>
        </div>
        <Button variant="danger" size="sm" onClick={openAdd}><Plus size={16} />Add Course</Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--acade-text-muted)]" />
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by code, title, or department..."
          className="w-full h-12 pl-12 pr-4 rounded-xl bg-[var(--acade-deep)] border border-[var(--acade-border)] text-[var(--acade-text)] text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)] placeholder:text-[var(--acade-text-faint)] focus:outline-none focus:border-[var(--acade-primary)] transition-colors" />
      </div>

      {/* Table */}
      <Card variant="default" padding="none" className="overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_2fr_0.5fr_1.2fr_0.5fr_0.5fr_0.8fr] gap-2 px-5 py-3 bg-[var(--acade-overlay)]/30 border-b border-[var(--acade-border)] text-[length:var(--text-xs)] font-bold text-[var(--acade-text-muted)] uppercase tracking-wider">
          <span>Code</span><span>Title</span><span>Units</span><span>Department</span><span>Level</span><span>Sem</span><span>Actions</span>
        </div>
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-[var(--acade-text-muted)]">{searchQuery ? 'No courses match.' : 'No courses in catalog yet.'}</div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_0.5fr_1.2fr_0.5fr_0.5fr_0.8fr] gap-2 px-5 py-3.5 border-b border-[var(--acade-border-subtle)] hover:bg-[var(--acade-overlay)]/10 transition-colors items-center">
              <span className="font-bold text-[length:var(--text-sm)] text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)]">{c.code}</span>
              <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] truncate">{c.title}</span>
              <span className="text-[length:var(--text-sm)] text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)] hidden md:block">{c.units}</span>
              <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] truncate hidden md:block">{c.department}</span>
              <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-geist-mono)] hidden md:block">{c.level}L</span>
              <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] hidden md:block">S{c.semester}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(c)} className="p-2 rounded-lg text-[var(--acade-text-muted)] hover:text-[var(--acade-primary)] hover:bg-[var(--acade-primary)]/10 transition-colors" aria-label="Edit"><Pencil size={15} /></button>
                {deleteConfirm === c.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-white bg-[var(--acade-danger)] text-[length:var(--text-xs)] font-bold px-2">Yes</button>
                    <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] text-[length:var(--text-xs)]">No</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(c.id)} className="p-2 rounded-lg text-[var(--acade-text-muted)] hover:text-[var(--acade-danger)] hover:bg-[var(--acade-danger)]/10 transition-colors" aria-label="Delete"><Trash2 size={15} /></button>
                )}
              </div>
            </div>
          ))
        )}
      </Card>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[length:var(--text-xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
                    {editingCourse ? 'Edit Course' : 'Add New Course'}
                  </h2>
                  <button onClick={() => setModalOpen(false)} className="p-2 rounded-full text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)]"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input id="course-code" label="Course Code" value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="CSC301" />
                    <Input id="course-units" label="Credit Units" type="number" value={String(form.units)} onChange={e => setForm({...form, units: Number(e.target.value)})} placeholder="3" />
                  </div>
                  <Input id="course-title" label="Course Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Data Structures and Algorithms" />
                  <Input id="course-dept" label="Department" value={form.department} onChange={e => setForm({...form, department: e.target.value})} placeholder="Computer Science" />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[length:var(--text-sm)] font-semibold text-[var(--acade-text)] mb-1.5">Level</label>
                      <select value={form.level} onChange={e => setForm({...form, level: Number(e.target.value)})}
                        className="w-full h-12 px-4 rounded-xl bg-[var(--acade-deep)] border border-[var(--acade-border)] text-[var(--acade-text)] text-[length:var(--text-sm)] focus:outline-none focus:border-[var(--acade-primary)]">
                        {[100,200,300,400,500].map(l => <option key={l} value={l}>{l}L</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[length:var(--text-sm)] font-semibold text-[var(--acade-text)] mb-1.5">Semester</label>
                      <select value={form.semester} onChange={e => setForm({...form, semester: Number(e.target.value)})}
                        className="w-full h-12 px-4 rounded-xl bg-[var(--acade-deep)] border border-[var(--acade-border)] text-[var(--acade-text)] text-[length:var(--text-sm)] focus:outline-none focus:border-[var(--acade-primary)]">
                        <option value={1}>First Semester</option>
                        <option value={2}>Second Semester</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--acade-border-subtle)]">
                  <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
                  <Button variant="danger" size="sm" loading={saving} onClick={handleSave}>{editingCourse ? 'Save Changes' : 'Add Course'}</Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
