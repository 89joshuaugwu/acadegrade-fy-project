'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Save, Bell, Shield, Trash2, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  updatePassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils/cn';
import { updateDocument } from '@/lib/firebase/firestore';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { Select } from '@/components/ui/Select';
const STUDENT_LEVELS = Array.from({length: 10}, (_, i) => (i + 1) * 100);

export default function SettingsPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { isFeatureDisabled } = usePlatformSettings();
  const disableEditProfile = isFeatureDisabled('edit_profile');
  
  // Profile State
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [programme, setProgramme] = useState('');
  const [level, setLevel] = useState(100);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [recordMode, setRecordMode] = useState<'fromScratch' | 'complete'>('fromScratch');
  const [gradeMode, setGradeMode] = useState<'cgpa' | 'pi'>('cgpa');
  
  // Notification Preferences
  const [notifPrefs, setNotifPrefs] = useState({
    semesterSaved: true,
    degreeClass: true,
    aiInsights: true,
    adminBroadcasts: true
  });

  // Initialize state when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || (profile as any).name || '');
      setDepartment(profile.department || (profile as any).dept || '');
      setProgramme(profile.programme || '');
      setLevel(profile.currentLevel || (profile as any).level || 100);
      setAvatarUrl(profile.avatarUrl || '');
      setRecordMode(profile.recordMode || 'fromScratch');
      setGradeMode(profile.gradeMode || 'cgpa');
      
      if (profile.notificationPreferences) {
        setNotifPrefs({
          semesterSaved: profile.notificationPreferences.semesterSaved ?? true,
          degreeClass: profile.notificationPreferences.degreeClass ?? true,
          aiInsights: profile.notificationPreferences.aiInsights ?? true,
          adminBroadcasts: profile.notificationPreferences.adminBroadcasts ?? true,
        });
      }
    }
  }, [profile]);

  const [savingProfile, setSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [passwordModal, setPasswordModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [pendingRecordMode, setPendingRecordMode] = useState<'fromScratch' | 'complete' | null>(null);
  const [savingRecordMode, setSavingRecordMode] = useState(false);
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);
  
  // Delete State
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Google-SSO accounts have no password to re-authenticate with —
  // they need a Google popup instead of a password field.
  const isGoogleAccount = auth.currentUser?.providerData?.[0]?.providerId === 'google.com';

  // 1. Avatar Upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Uploading avatar...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'acadegrade_avatars'); // Must match cloudinary unsigned preset

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/dgqukbs8n/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.secure_url) {
        setAvatarUrl(data.secure_url);
        await updateDocument(`users/${user?.uid}`, { avatarUrl: data.secure_url });
        toast.success('Avatar updated', { id: toastId });
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload avatar. Check Cloudinary preset.', { id: toastId });
    }
  };

  // 2. Save Profile
  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await updateDocument(`users/${user.uid}`, {
        fullName,
        name: fullName, // Legacy compatibility
        department,
        dept: department, // Legacy compatibility
        programme,
        currentLevel: level,
        level: level, // Legacy compatibility
      });
      toast.success('Profile updated');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // 3. Save Toggles
  const handleToggleRecordMode = (mode: 'fromScratch' | 'complete') => {
    if (!user || mode === recordMode) return;
    setPendingRecordMode(mode);
  };

  const confirmRecordModeChange = async () => {
    if (!user || !pendingRecordMode) return;
    setSavingRecordMode(true);
    try {
      await updateDocument(`users/${user.uid}`, { recordMode: pendingRecordMode });
      setRecordMode(pendingRecordMode);
      setPendingRecordMode(null);
      toast.success('Record mode updated');
    } catch {
      toast.error('Could not update record mode');
    } finally {
      setSavingRecordMode(false);
    }
  };

  const handleToggleGradeMode = async (mode: 'cgpa' | 'pi') => {
    if (!user) return;
    setGradeMode(mode);
    await updateDocument(`users/${user.uid}`, { gradeMode: mode });
    toast.success('Default metric updated');
  };

  // 4. Notifications
  const requestFCM = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser does not support notifications');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      toast.success('Notification permission granted!');
    } else {
      toast.error('Permission denied');
    }
  };

  const handleTogglePreference = async (key: keyof typeof notifPrefs, value: boolean) => {
    if (!user) return;
    const newPrefs = { ...notifPrefs, [key]: value };
    setNotifPrefs(newPrefs);
    try {
      await updateDocument(`users/${user.uid}`, { notificationPreferences: newPrefs });
      toast.success('Notification preferences updated');
    } catch (err) {
      toast.error('Failed to update preferences');
      // Revert on error
      setNotifPrefs(notifPrefs);
    }
  };

  // 5. Change Password
  const handleChangePassword = async () => {
    if (!auth.currentUser || !auth.currentUser.email) return;
    setChangingPwd(true);
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPassword);
      toast.success('Password updated successfully');
      setPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setChangingPwd(false);
    }
  };

  // 6. Delete Account
  // Full flow: re-authenticate (password or Google popup) -> call the
  // server-side wipe (deletes semesters, courses, analytics, notifications,
  // share codes, shared transcripts, the profile doc, and the RTDB counter)
  // -> the server also deletes the Firebase Auth user via Admin SDK, which
  // avoids the client "requires recent login" failure entirely.
  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;
    setDeleting(true);
    try {
      // Step 1: Re-authenticate so Firebase accepts the deletion as fresh.
      if (isGoogleAccount) {
        await reauthenticateWithPopup(auth.currentUser, new GoogleAuthProvider());
      } else {
        if (!auth.currentUser.email) throw new Error('No email on this account to verify.');
        if (!deletePassword) throw new Error('Please enter your password to confirm.');
        const cred = EmailAuthProvider.credential(auth.currentUser.email, deletePassword);
        await reauthenticateWithCredential(auth.currentUser, cred);
      }

      // Step 2: Ask the server to wipe every trace of this account's data,
      // then delete the Auth user itself.
      const idToken = await auth.currentUser.getIdToken(true);
      const res = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to delete account');
      }

      toast.success('Account and all associated data deleted');
      window.location.href = '/';
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-8">
      <div>
        <h1 className="text-[length:var(--text-2xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
          Settings
        </h1>
        <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mt-1">
          Manage your account preferences and security.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Sidebar Navigation */}
        <div className="hidden md:flex flex-col gap-2 sticky top-24 h-fit">
          {[
            { id: 'profile', label: 'Profile', danger: false },
            { id: 'academic', label: 'Academic Setup', danger: false },
            { id: 'notifications', label: 'Notifications', danger: false },
            { id: 'security', label: 'Security & Danger', danger: true }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                document.getElementById(`section-${tab.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={cn(
                "text-left font-bold text-[length:var(--text-sm)] p-3 rounded-xl transition-all duration-200 border-l-4",
                tab.danger ? "hover:bg-[var(--acade-danger)]/10 text-[var(--acade-danger)] border-transparent hover:border-[var(--acade-danger)]" 
                           : "hover:bg-[var(--acade-surface)] text-[var(--acade-text-muted)] border-transparent hover:border-[var(--acade-border-subtle)] focus:border-[var(--acade-primary)] focus:text-[var(--acade-text)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="md:col-span-2 space-y-8">
          
          {/* PROFILE SECTION */}
          <section id="section-profile" className="relative bg-[var(--acade-deep)]/60 backdrop-blur-xl border border-[var(--acade-border)] rounded-2xl p-6 scroll-mt-24 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] mb-6">Public Profile</h2>
            
            <div className="flex items-center gap-6 mb-8">
              <div className="relative group cursor-pointer w-24 h-24" onClick={() => fileInputRef.current?.click()}>
                <img 
                  src={avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user?.uid} 
                  alt="Avatar" 
                  className="w-full h-full rounded-full object-cover border-4 border-[var(--acade-deep)] shadow-lg transition-transform duration-300 group-hover:scale-105"
                />
                <button 
                  className="absolute inset-0 bg-[var(--acade-primary)]/80 backdrop-blur-sm rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-95 group-hover:scale-105"
                >
                  <Camera size={24} className="text-white mb-1" />
                  <span className="text-[10px] text-white font-bold tracking-wider uppercase">Upload</span>
                </button>
                <input type="file" hidden ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--acade-text)]">Profile Picture</h3>
                <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)]">JPG, GIF or PNG. 1MB max.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} disabled={disableEditProfile} />
              <Input label="Matric Number" value={profile?.matric || ''} disabled hint="Contact admin to change matric" />
              <Input label="Department" value={department} onChange={e => setDepartment(e.target.value)} disabled={disableEditProfile} />
              <Input label="Programme" value={programme} onChange={e => setProgramme(e.target.value)} disabled={disableEditProfile} />
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)]">Current Level</label>
                <Select 
                  options={STUDENT_LEVELS.map(l => ({ value: l.toString(), label: `${l}L` }))}
                  value={level.toString()}
                  onChange={(val) => setLevel(parseInt(val))}
                  disabled={disableEditProfile}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveProfile} disabled={savingProfile || disableEditProfile} title={disableEditProfile ? "Profile editing is temporarily disabled for maintenance" : ""}>
                <Save size={16} className="mr-2" /> {savingProfile ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </section>

          {/* ACADEMIC SETUP SECTION */}
          <section id="section-academic" className="relative bg-[var(--acade-deep)]/60 backdrop-blur-xl border border-[var(--acade-border)] rounded-2xl p-6 scroll-mt-24 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] mb-6">Academic Setup</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[var(--acade-text)] text-[length:var(--text-sm)]">Record Mode</h4>
                  <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] mt-1">From Scratch builds up, Complete builds backwards.</p>
                </div>
                <div className="flex items-center gap-2 bg-[var(--acade-deep)] p-1 rounded-xl border border-[var(--acade-border)]">
                  <button onClick={() => handleToggleRecordMode('fromScratch')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${recordMode === 'fromScratch' ? 'bg-[var(--acade-surface)] text-[var(--acade-text)] shadow-sm' : 'text-[var(--acade-text-muted)]'}`}>Scratch</button>
                  <button onClick={() => handleToggleRecordMode('complete')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${recordMode === 'complete' ? 'bg-[var(--acade-surface)] text-[var(--acade-text)] shadow-sm' : 'text-[var(--acade-text-muted)]'}`}>Complete</button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[var(--acade-text)] text-[length:var(--text-sm)]">Default Metric</h4>
                  <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] mt-1">What to show prominently on the dashboard.</p>
                </div>
                <div className="flex items-center gap-2 bg-[var(--acade-deep)] p-1 rounded-xl border border-[var(--acade-border)]">
                  <button onClick={() => handleToggleGradeMode('cgpa')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${gradeMode === 'cgpa' ? 'bg-[var(--acade-primary-dim)] text-[var(--acade-primary-glow)]' : 'text-[var(--acade-text-muted)]'}`}>CGPA</button>
                  <button onClick={() => handleToggleGradeMode('pi')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${gradeMode === 'pi' ? 'bg-[var(--acade-primary-dim)] text-[var(--acade-primary-glow)]' : 'text-[var(--acade-text-muted)]'}`}>PI</button>
                </div>
              </div>
            </div>
          </section>

          {/* NOTIFICATIONS SECTION */}
          <section id="section-notifications" className="relative bg-[var(--acade-deep)]/60 backdrop-blur-xl border border-[var(--acade-border)] rounded-2xl p-6 scroll-mt-24 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] mb-6 flex items-center gap-2">
              <Bell size={20} /> Notifications
            </h2>
            
            <div className="p-4 bg-[var(--acade-primary-dim)] border border-[var(--acade-primary)]/20 rounded-xl mb-6 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-[var(--acade-text)] text-[length:var(--text-sm)]">Push Notifications</h4>
                <p className="text-[length:var(--text-xs)] text-[var(--acade-primary-glow)] mt-1">Get alerts on your device.</p>
              </div>
              <Button variant="outline" size="sm" onClick={requestFCM}>Enable</Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-[var(--acade-border-subtle)]">
                <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-medium">Semester saved successfully</span>
                <Switch checked={notifPrefs.semesterSaved} onCheckedChange={(val) => handleTogglePreference('semesterSaved', val)} />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[var(--acade-border-subtle)]">
                <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-medium">Degree class projections change</span>
                <Switch checked={notifPrefs.degreeClass} onCheckedChange={(val) => handleTogglePreference('degreeClass', val)} />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[var(--acade-border-subtle)]">
                <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-medium">AI insights are ready</span>
                <Switch checked={notifPrefs.aiInsights} onCheckedChange={(val) => handleTogglePreference('aiInsights', val)} />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-medium">Admin broadcasts</span>
                <Switch checked={notifPrefs.adminBroadcasts} onCheckedChange={(val) => handleTogglePreference('adminBroadcasts', val)} />
              </div>
            </div>
          </section>

          {/* SECURITY & DANGER SECTION */}
          <section id="section-security" className="relative bg-[var(--acade-deep)]/60 backdrop-blur-xl border border-[var(--acade-border)] rounded-2xl p-6 scroll-mt-24 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] mb-6 flex items-center gap-2">
              <Shield size={20} /> Security & Data
            </h2>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 bg-[var(--acade-deep)] rounded-xl border border-[var(--acade-border)]">
                <div>
                  <h4 className="font-bold text-[var(--acade-text)] text-[length:var(--text-sm)]">Password</h4>
                  <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] mt-1">Update your password securely.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setPasswordModal(true)}>
                  <KeyRound size={16} className="mr-2" /> Change
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-[var(--acade-danger-dim)] rounded-xl border border-[var(--acade-danger)]/20">
                <div>
                  <h4 className="font-bold text-[var(--acade-danger)] text-[length:var(--text-sm)]">Danger Zone</h4>
                  <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] mt-1">Permanently delete your account and all records.</p>
                </div>
                <Button variant="danger" size="sm" onClick={() => setDeleteModal(true)}>
                  <Trash2 size={16} className="mr-2" /> Delete
                </Button>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* Record Mode Confirmation Modal */}
      <Modal
        open={pendingRecordMode !== null}
        onClose={() => !savingRecordMode && setPendingRecordMode(null)}
        title="Change record mode?"
        description="Your existing semesters and courses will stay safe. This only changes how AcadeGrade builds future cumulative calculations."
      >
        <div className="mt-4 rounded-xl border border-[var(--acade-border)] bg-[var(--acade-deep)] p-4">
          <p className="text-[length:var(--text-sm)] font-semibold text-[var(--acade-text)]">
            {pendingRecordMode === 'complete' ? 'Switch to Complete Record' : 'Switch to From Scratch'}
          </p>
          <p className="mt-1 text-[length:var(--text-xs)] leading-relaxed text-[var(--acade-text-muted)]">
            {pendingRecordMode === 'complete'
              ? 'Use this when you are entering an academic history that began before AcadeGrade.'
              : 'Use this when AcadeGrade should calculate your record starting from your first saved semester.'}
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setPendingRecordMode(null)} disabled={savingRecordMode}>Keep current</Button>
          <Button size="sm" onClick={confirmRecordModeChange} loading={savingRecordMode}>Confirm change</Button>
        </div>
      </Modal>

      {/* Password Modal */}
      <Modal open={passwordModal} onClose={() => setPasswordModal(false)} title="Change Password">
        <div className="space-y-4">
          <Input label="Current Password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          <Input label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <Button fullWidth onClick={handleChangePassword} disabled={changingPwd || !currentPassword || !newPassword}>
            {changingPwd ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteModal}
        onClose={() => {
          setDeleteModal(false);
          setDeleteConfirm('');
          setDeletePassword('');
        }}
        title="Delete Account"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--acade-text-muted)]">
            This action cannot be undone. This will permanently delete your account, semesters, courses,
            AI analytics, notifications, and any share codes or shared transcripts you've created.
          </p>
          <div className="bg-[var(--acade-deep)] p-4 rounded-xl font-mono text-center font-bold tracking-widest text-[var(--acade-danger)]">
            DELETE
          </div>
          <Input
            label="Type DELETE to confirm"
            value={deleteConfirm}
            onChange={e => setDeleteConfirm(e.target.value)}
          />
          {!isGoogleAccount && (
            <Input
              label="Confirm your password"
              type="password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              hint="Required to verify it's really you before we wipe your data."
            />
          )}
          {isGoogleAccount && (
            <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)]">
              You'll be asked to confirm via a Google sign-in popup before deletion proceeds.
            </p>
          )}
          <Button
            variant="danger"
            fullWidth
            onClick={handleDeleteAccount}
            disabled={deleting || deleteConfirm !== 'DELETE' || (!isGoogleAccount && !deletePassword)}
          >
            {deleting ? 'Deleting...' : 'Permanently Delete'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
