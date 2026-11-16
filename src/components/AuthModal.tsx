import React, { useState } from 'react';
import { KeyRound, LogOut, ShieldCheck, User, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { UserAccount } from '../types/eventsphere';
import { eventSphereApi } from '../services/eventSphereClient';

interface AuthModalProps {
  isOpen: boolean;
  currentUser: UserAccount | null;
  token: string | null;
  defaultRole?: 'exhibitor' | 'attendee';
  onClose: () => void;
  onAuthenticated: (token: string, user: UserAccount) => void;
  onLogout: () => void;
  onToast: (msg: string) => void;
}

type AuthTab = 'login' | 'register' | 'reset';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  currentUser,
  token,
  defaultRole = 'attendee',
  onClose,
  onAuthenticated,
  onLogout,
  onToast,
}) => {
  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState<'exhibitor' | 'attendee'>(defaultRole);
  const [gdprConsent, setGdprConsent] = useState(true);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [issuedCodeHint, setIssuedCodeHint] = useState<string | null>(null);

  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileCompany, setProfileCompany] = useState(currentUser?.company || '');
  const [profileTitle, setProfileTitle] = useState(currentUser?.title || '');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setRole(defaultRole);
  }, [defaultRole]);

  React.useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name);
      setProfileCompany(currentUser.company || '');
      setProfileTitle(currentUser.title || '');
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleDemoSignIn = async (demoEmail: string, demoPassword: string) => {
    setBusy(true);
    setError(null);
    const res = await eventSphereApi.login({ email: demoEmail, password: demoPassword });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onAuthenticated(res.data.token, res.data.user);
    onToast(`Signed in as ${res.data.user.name} (${res.data.user.role})`);
    onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await eventSphereApi.login({ email, password });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onAuthenticated(res.data.token, res.data.user);
    onToast(`Welcome back, ${res.data.user.name}`);
    onClose();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await eventSphereApi.register({
      name,
      email,
      password,
      role,
      company,
      gdprConsent,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onAuthenticated(res.data.token, res.data.user);
    onToast(`Account created for ${res.data.user.name} (${res.data.user.role})`);
    onClose();
  };

  const handleRequestReset = async () => {
    setBusy(true);
    setError(null);
    const res = await eventSphereApi.forgotPassword(email);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setIssuedCodeHint(res.data.demoResetCode || res.data.message);
    onToast('One-time reset code issued (valid 15m).');
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await eventSphereApi.resetPassword({ email, token: resetCode, newPassword });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onToast('Password updated! You may now sign in.');
    setTab('login');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    const res = await eventSphereApi.updateProfile(token, {
      name: profileName,
      company: profileCompany,
      title: profileTitle,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onAuthenticated(res.data.token, res.data.user);
    onToast('Profile updated');
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="surface-luxe w-full max-w-lg rounded-2xl border border-[#10B981]/25 bg-white p-6 text-[#09140E] dark:border-[#10B981]/25 dark:bg-[#040705] dark:text-[#ECFDF5]"
      >
        <div className="flex items-center justify-between border-b border-[#10B981]/18 pb-3 dark:border-[#10B981]/20">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#10B981] dark:text-[#34D399]" />
            <h2 className="font-display text-lg font-bold">
              {currentUser ? 'Account & Profile' : 'EventSphere Access'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account modal"
            className="rounded-lg p-1.5 text-[#466153] hover:bg-[#E8EFEA] dark:text-[#8EAD9E] dark:hover:bg-[#10B981]/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-[#F97362]/50 bg-[#F97362]/12 px-3 py-2 text-xs font-medium text-[#F97362]">
            {error}
          </div>
        )}

        {currentUser ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-[#10B981]/18 bg-[#E8EFEA] p-3.5 dark:border-[#10B981]/20 dark:bg-[#09120D]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#059669] to-[#34D399] text-[#02120B]">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">{currentUser.name}</div>
                  <div className="font-mono text-xs text-[#466153] dark:text-[#8EAD9E]">
                    {currentUser.email} · {currentUser.role.toUpperCase()}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onToast('Signed out');
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#10B981]/25 px-3 py-1.5 text-xs font-semibold hover:border-[#F97362] hover:text-[#F97362] dark:border-[#10B981]/25"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div className="text-xs font-semibold text-[#466153] dark:text-[#8EAD9E]">
                Edit Profile
              </div>
              <div>
                <label className="text-xs font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-sm dark:border-[#10B981]/20 dark:bg-[#09120D]"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium">Company / Organization</label>
                  <input
                    type="text"
                    value={profileCompany}
                    onChange={(e) => setProfileCompany(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-sm dark:border-[#10B981]/20 dark:bg-[#09120D]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Role / Title</label>
                  <input
                    type="text"
                    value={profileTitle}
                    onChange={(e) => setProfileTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-sm dark:border-[#10B981]/20 dark:bg-[#09120D]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="btn-luxe w-full rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] py-2.5 text-xs font-bold text-[#02120B] disabled:opacity-50"
              >
                Save Profile Changes
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-4">
            <div className="rounded-xl border border-[#10B981]/20 bg-[#E8EFEA] p-3 dark:border-[#10B981]/20 dark:bg-[#09120D]">
              <div className="text-[11px] font-semibold text-[#466153] dark:text-[#8EAD9E]">
                Instant Role Access (JWT + bcrypt)
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDemoSignIn('organizer@eventsphere.io', 'ExpoAdmin2026!')}
                  className="btn-luxe rounded-lg bg-gradient-to-r from-[#10B981] to-[#2DD4BF] px-2.5 py-2 text-xs font-bold text-[#02120B]"
                >
                  Organizer Admin
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDemoSignIn('exhibitor@lumina-robotics.io', 'Exhibitor2026!')}
                  className="btn-luxe rounded-lg bg-[#F97362] px-2.5 py-2 text-xs font-bold text-[#1A0B09]"
                >
                  Exhibitor
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDemoSignIn('attendee@eventsphere.io', 'Attendee2026!')}
                  className="btn-luxe rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] px-2.5 py-2 text-xs font-bold text-[#02120B]"
                >
                  Attendee
                </button>
              </div>
            </div>

            <div className="mt-4 flex gap-2 border-b border-[#10B981]/18 pb-2 dark:border-[#10B981]/20">
              {(['login', 'register', 'reset'] as AuthTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTab(t);
                    setError(null);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    tab === t
                      ? 'bg-gradient-to-r from-[#059669] to-[#34D399] text-[#02120B]'
                      : 'text-[#466153] hover:bg-[#E8EFEA] dark:text-[#8EAD9E] dark:hover:bg-[#10B981]/10'
                  }`}
                >
                  {t === 'login' ? 'Sign In' : t === 'register' ? 'Create Account' : 'Reset Password'}
                </button>
              ))}
            </div>

            {tab === 'login' && (
              <form onSubmit={handleLogin} className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-medium">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.io"
                    className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-sm dark:border-[#10B981]/20 dark:bg-[#09120D]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-sm dark:border-[#10B981]/20 dark:bg-[#09120D]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-luxe w-full rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] py-2.5 text-xs font-bold text-[#02120B] disabled:opacity-50"
                >
                  Sign In
                </button>
              </form>
            )}

            {tab === 'register' && (
              <form onSubmit={handleRegister} className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-sm dark:border-[#10B981]/20 dark:bg-[#09120D]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'exhibitor' | 'attendee')}
                      className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-sm dark:border-[#10B981]/20 dark:bg-[#09120D]"
                    >
                      <option value="attendee">Attendee</option>
                      <option value="exhibitor">Exhibitor</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-sm dark:border-[#10B981]/20 dark:bg-[#09120D]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Company (optional)</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-sm dark:border-[#10B981]/20 dark:bg-[#09120D]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium">Password (min 6 characters)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-sm dark:border-[#10B981]/20 dark:bg-[#09120D]"
                  />
                </div>
                <label className="flex items-start gap-2 text-xs text-[#466153] dark:text-[#8EAD9E]">
                  <input
                    type="checkbox"
                    checked={gdprConsent}
                    onChange={(e) => setGdprConsent(e.target.checked)}
                    className="mt-0.5 rounded accent-[#10B981]"
                  />
                  <span>
                    I consent to EventSphere processing my registration data in accordance with GDPR policies.
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-luxe w-full rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] py-2.5 text-xs font-bold text-[#02120B] disabled:opacity-50"
                >
                  Create Account
                </button>
              </form>
            )}

            {tab === 'reset' && (
              <form onSubmit={handleCompleteReset} className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-medium">Account Email</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.io"
                      className="flex-1 rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-sm dark:border-[#10B981]/20 dark:bg-[#09120D]"
                    />
                    <button
                      type="button"
                      disabled={busy || !email}
                      onClick={handleRequestReset}
                      className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] px-3 py-2 text-xs font-bold text-[#02120B] disabled:opacity-50"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Send Code</span>
                    </button>
                  </div>
                </div>

                {issuedCodeHint && (
                  <div className="rounded-lg border border-[#34D399]/40 bg-[#34D399]/12 px-3 py-2 font-mono text-xs text-emerald-900 dark:text-[#34D399]">
                    One-time reset code: <strong>{issuedCodeHint}</strong>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium">Reset Code</label>
                    <input
                      type="text"
                      required
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="8-char code"
                      className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 font-mono text-sm uppercase dark:border-[#10B981]/20 dark:bg-[#09120D]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">New Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#10B981]/25 bg-white px-3 py-2 text-sm dark:border-[#10B981]/20 dark:bg-[#09120D]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-luxe w-full rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] py-2.5 text-xs font-bold text-[#02120B] disabled:opacity-50"
                >
                  Confirm Password Reset
                </button>
              </form>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
