import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  Shield,
  ShieldCheck,
  Ticket,
  User,
} from 'lucide-react';
import type { ExhibitorProfile, UserAccount, UserRole } from '../types/eventsphere';
import { eventSphereApi } from '../services/eventSphereClient';
import { Button, Checkbox, Input, Modal, Select, Textarea } from './ui';

interface AuthModalProps {
  isOpen: boolean;
  currentUser: UserAccount | null;
  token: string | null;
  defaultRole?: UserRole;
  defaultTab?: 'role-select' | 'login' | 'register' | 'reset';
  onClose: () => void;
  onAuthenticated: (token: string, user: UserAccount) => void;
  onLogout: () => void;
  onToast: (msg: string) => void;
}

type AuthStep =
  | 'role-select'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'verify-otp'
  | 'new-password';

const ROLE_CARDS: Array<{
  role: UserRole;
  code: string;
  title: string;
  description: string;
  accent: string;
  icon: React.ReactNode;
}> = [
  {
    role: 'admin',
    code: '01',
    title: 'Organizer',
    description: 'Create expos, approve exhibitors, manage floor booths, schedules, and analytics.',
    accent: '#10B981',
    icon: <Shield className="h-5 w-5" />,
  },
  {
    role: 'exhibitor',
    code: '02',
    title: 'Exhibitor',
    description: 'Apply to expos, reserve floor booths, showcase products, and manage booth staff.',
    accent: '#F97362',
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    role: 'attendee',
    code: '03',
    title: 'Attendee',
    description: 'Explore expos, claim digital passes, build your schedule, and message booths.',
    accent: '#2DD4BF',
    icon: <Ticket className="h-5 w-5" />,
  },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  currentUser,
  token,
  defaultRole = 'attendee',
  defaultTab = 'role-select',
  onClose,
  onAuthenticated,
  onLogout,
  onToast,
}) => {
  const initialStep: AuthStep = defaultTab === 'reset' ? 'forgot-password' : defaultTab;
  const [step, setStep] = useState<AuthStep>(initialStep);
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);
  const [postSelectTarget, setPostSelectTarget] = useState<'login' | 'register'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState<ExhibitorProfile['category']>('Robotics & AI');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [logoColor, setLogoColor] = useState('#10B981');
  const [productsRaw, setProductsRaw] = useState('');
  const [documentsRaw, setDocumentsRaw] = useState('');
  const [organizerInviteCode, setOrganizerInviteCode] = useState('');
  const [gdprConsent, setGdprConsent] = useState(true);

  // Dedicated 3-Step Password Reset State (OTP is never exposed or stored in clear UI hints)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [otpExpiresInSec, setOtpExpiresInSec] = useState(0);
  const [resendCooldownSec, setResendCooldownSec] = useState(0);
  const [resetSessionToken, setResetSessionToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileCompany, setProfileCompany] = useState(currentUser?.company || '');
  const [profileTitle, setProfileTitle] = useState(currentUser?.title || '');
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || '');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setSelectedRole(defaultRole);
  }, [defaultRole]);

  useEffect(() => {
    if (isOpen) {
      const targetStep: AuthStep = defaultTab === 'reset' ? 'forgot-password' : defaultTab;
      setStep(targetStep);
      setPostSelectTarget(defaultTab === 'register' ? 'register' : 'login');
      setError(null);
      setNotice(null);
    } else if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p === '/forgot-password' || p === '/verify-otp' || p === '/reset-password') {
        window.history.replaceState(null, '', '/');
      }
    }
  }, [isOpen, defaultTab]);

  // Sync browser URL path cleanly for the dedicated password reset screens
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    if (step === 'forgot-password') {
      window.history.replaceState(null, '', '/forgot-password');
    } else if (step === 'verify-otp') {
      window.history.replaceState(null, '', '/verify-otp');
    } else if (step === 'new-password') {
      window.history.replaceState(null, '', '/reset-password');
    } else {
      const p = window.location.pathname;
      if (p === '/forgot-password' || p === '/verify-otp' || p === '/reset-password') {
        window.history.replaceState(null, '', '/');
      }
    }
  }, [isOpen, step]);

  // 5-minute OTP expiry & 60-second resend cooldown timers
  useEffect(() => {
    if (otpExpiresInSec <= 0 && resendCooldownSec <= 0) return;
    const timer = window.setInterval(() => {
      setOtpExpiresInSec((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpExpiresInSec, resendCooldownSec]);

  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name);
      setProfileCompany(currentUser.company || '');
      setProfileTitle(currentUser.title || '');
      setProfilePhone(currentUser.phone || '');
    }
  }, [currentUser]);

  const passwordChecks = useMemo(
    () => [
      { label: 'At least 8 characters', met: newPassword.length >= 8 },
      { label: 'Uppercase letter (A-Z)', met: /[A-Z]/.test(newPassword) },
      { label: 'Lowercase letter (a-z)', met: /[a-z]/.test(newPassword) },
      { label: 'Number (0-9)', met: /\d/.test(newPassword) },
      { label: 'Special character (!@#$%)', met: /[^A-Za-z0-9]/.test(newPassword) },
    ],
    [newPassword],
  );
  const strengthScore = passwordChecks.filter((c) => c.met).length;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

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
      role: selectedRole,
      company: company || undefined,
      phone: phone || undefined,
      category: selectedRole === 'exhibitor' ? category : undefined,
      description: selectedRole === 'exhibitor' ? description : undefined,
      website: selectedRole === 'exhibitor' ? website : undefined,
      logoColor: selectedRole === 'exhibitor' ? logoColor : undefined,
      products:
        selectedRole === 'exhibitor'
          ? productsRaw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      documents:
        selectedRole === 'exhibitor'
          ? documentsRaw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      organizerInviteCode: selectedRole === 'admin' ? organizerInviteCode : undefined,
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

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your registered email address.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await eventSphereApi.forgotPassword(cleanEmail);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOtpDigits(['', '', '', '', '', '']);
    setResetSessionToken(null);
    setOtpExpiresInSec(res.data.expiresInSeconds ?? 300);
    setResendCooldownSec(res.data.cooldownSeconds ?? 60);
    setNotice(res.data.message);
    setStep('verify-otp');
    onToast('Verification email requested. Check your Gmail inbox.');
    window.setTimeout(() => otpInputRefs.current[0]?.focus(), 80);
  };

  const handleOtpDigitChange = (index: number, raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly) {
      setOtpDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }
    if (digitsOnly.length > 1) {
      const split = digitsOnly.slice(0, 6).split('');
      setOtpDigits((prev) => prev.map((_, idx) => split[idx] || ''));
      const focusIdx = Math.min(5, split.length - 1);
      otpInputRefs.current[focusIdx]?.focus();
      return;
    }
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digitsOnly;
      return next;
    });
    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit verification code from your email.');
      return;
    }
    if (otpExpiresInSec <= 0) {
      setError('This verification code has expired. Please request a new code.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await eventSphereApi.verifyResetOtp({ email: email.trim().toLowerCase(), otp });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResetSessionToken(res.data.resetSessionToken);
    setOtpDigits(['', '', '', '', '', '']);
    setNewPassword('');
    setConfirmPassword('');
    setNotice(res.data.message);
    setStep('new-password');
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetSessionToken) {
      setError('Please verify your 6-digit email code first.');
      setStep('forgot-password');
      return;
    }
    if (strengthScore < 5) {
      setError('Please choose a strong password meeting all security requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('New password and confirmation do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await eventSphereApi.resetPassword({
      email: email.trim().toLowerCase(),
      resetSessionToken,
      newPassword,
      confirmPassword,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResetSessionToken(null);
    setNewPassword('');
    setConfirmPassword('');
    setPassword('');
    setNotice('Password reset successful! Sign in with your new password.');
    onToast('Password updated! You may now sign in.');
    setStep('login');
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
      phone: profilePhone,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onAuthenticated(res.data.token, res.data.user);
    onToast('Profile updated');
  };

  const activeRoleMeta = ROLE_CARDS.find((r) => r.role === selectedRole) || ROLE_CARDS[2];
  const isResetFlow =
    step === 'forgot-password' || step === 'verify-otp' || step === 'new-password';

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={step === 'role-select' && !currentUser ? '2xl' : 'lg'}
      icon={<ShieldCheck className="h-5 w-5" />}
      title={
        currentUser
          ? 'Account & Profile'
          : step === 'role-select'
            ? 'Choose Your EventSphere Portal'
            : step === 'forgot-password'
              ? 'Forgot Password · Email Verification'
              : step === 'verify-otp'
                ? 'Verify 6-Digit Email Code'
                : step === 'new-password'
                  ? 'Create New Password'
                  : `${activeRoleMeta.title} Portal · ${step === 'register' ? 'Sign Up' : 'Sign In'}`
      }
    >
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-[#F97362]/50 bg-[#F97362]/12 px-3.5 py-2.5 text-xs font-medium text-[#C2410C] dark:text-[#FDA4AF]"
        >
          {error}
        </div>
      )}
      {notice && !error && (
        <div
          role="status"
          className="mb-4 flex items-start gap-2 rounded-xl border border-[#10B981]/45 bg-[#10B981]/10 px-3.5 py-2.5 text-xs font-medium text-[#065F46] dark:text-[#6EE7B7]"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
          <span>{notice}</span>
        </div>
      )}

      {currentUser ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#104E35]/18 bg-[#E4EDE7] p-4 dark:border-[#2A6F52]/36 dark:bg-[#09120D]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#059669] to-[#34D399] text-[#02120B]">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-sm font-bold">{currentUser.name}</div>
                <div className="font-mono text-xs text-[#466153] dark:text-[#8EAD9E]">
                  {currentUser.email} · {currentUser.role === 'admin' ? 'ORGANIZER' : currentUser.role.toUpperCase()}
                </div>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              leftIcon={<LogOut className="h-3.5 w-3.5" />}
              onClick={() => {
                onLogout();
                onToast('Signed out');
                onClose();
              }}
            >
              Sign Out
            </Button>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3.5">
            <div className="font-mono text-xs font-semibold uppercase tracking-wider text-[#466153] dark:text-[#8EAD9E]">
              Profile Details
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Full Name"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
              <Input
                label="Phone"
                type="tel"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="+44 20 7946 0100"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Company / Organization"
                value={profileCompany}
                onChange={(e) => setProfileCompany(e.target.value)}
              />
              <Input
                label="Role / Job Title"
                value={profileTitle}
                onChange={(e) => setProfileTitle(e.target.value)}
              />
            </div>
            <Button type="submit" variant="primary" fullWidth loading={busy}>
              Save Profile Changes
            </Button>
          </form>
        </div>
      ) : step === 'role-select' ? (
        <div className="space-y-6">
          <p className="text-sm text-[#466153] dark:text-[#8EAD9E]">
            Select your role to enter a tailored workspace, or launch a verified demo account immediately.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            {ROLE_CARDS.map((card) => {
              const active = selectedRole === card.role;
              return (
                <button
                  key={card.role}
                  type="button"
                  onClick={() => setSelectedRole(card.role)}
                  className={`group flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                    active
                      ? 'border-[#10B981] bg-[#10B981]/10 shadow-[0_12px_30px_rgba(16,185,129,0.16)] dark:border-[#34D399] dark:bg-[#10B981]/12'
                      : 'border-[#104E35]/18 bg-[#E4EDE7] hover:border-[#10B981]/50 dark:border-[#2A6F52]/36 dark:bg-[#09120D]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-[#02120B]"
                        style={{ backgroundColor: card.accent }}
                      >
                        {card.icon}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#466153] dark:text-[#8EAD9E]">
                        {card.code}
                      </span>
                    </div>
                    <h3 className="mt-3.5 font-display text-base font-bold">{card.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#466153] dark:text-[#8EAD9E]">
                      {card.description}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#059669] dark:text-[#34D399]">
                    {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                    <span>{active ? 'Selected' : 'Select role'}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#104E35]/16 pt-4 dark:border-[#2A6F52]/32">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => setStep(postSelectTarget)}
              >
                Continue as {activeRoleMeta.title}
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => setStep(postSelectTarget === 'register' ? 'login' : 'register')}
              >
                {postSelectTarget === 'register' ? 'Existing Account Sign In' : 'Create New Account'}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-[#104E35]/18 bg-[#E4EDE7] p-3.5 dark:border-[#2A6F52]/36 dark:bg-[#09120D]">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#466153] dark:text-[#8EAD9E]">
              <span>Instant Verification Accounts (JWT + bcrypt)</span>
              <Calendar className="h-3.5 w-3.5 text-[#10B981]" />
            </div>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
              <Button
                variant="secondary"
                size="sm"
                loading={busy}
                onClick={() => handleDemoSignIn('organizer@eventsphere.io', 'ExpoAdmin2026!')}
              >
                Demo Organizer
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={busy}
                onClick={() => handleDemoSignIn('exhibitor@lumina-robotics.io', 'Exhibitor2026!')}
              >
                Demo Exhibitor
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={busy}
                onClick={() => handleDemoSignIn('attendee@eventsphere.io', 'Attendee2026!')}
              >
                Demo Attendee
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {!isResetFlow ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                onClick={() => {
                  setStep('role-select');
                  setError(null);
                  setNotice(null);
                }}
              >
                Change Role ({activeRoleMeta.title})
              </Button>

              <div className="flex gap-1.5">
                {(['login', 'register'] as const).map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={step === t ? 'primary' : 'ghost'}
                    onClick={() => {
                      setStep(t);
                      setError(null);
                      setNotice(null);
                    }}
                  >
                    {t === 'login' ? 'Sign In' : 'Sign Up'}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setStep('login');
                    setError(null);
                    setNotice(null);
                  }}
                >
                  Back to Sign In
                </Button>
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
                  Gmail Security Reset
                </span>
              </div>

              {/* 3-Step Password Reset Progress Indicator */}
              <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#104E35]/18 bg-[#E4EDE7] p-2 dark:border-[#2A6F52]/36 dark:bg-[#09120D]">
                {[
                  { id: 'forgot-password', num: '01', label: 'Email' },
                  { id: 'verify-otp', num: '02', label: '6-Digit OTP' },
                  { id: 'new-password', num: '03', label: 'New Password' },
                ].map((s, idx) => {
                  const stepOrder = ['forgot-password', 'verify-otp', 'new-password'];
                  const currentIdx = stepOrder.indexOf(step);
                  const completed = idx < currentIdx;
                  const active = s.id === step;
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all ${
                        active
                          ? 'bg-[#10B981]/18 text-[#065F46] ring-1 ring-[#10B981]/50 dark:text-[#34D399]'
                          : completed
                            ? 'text-[#059669] dark:text-[#6EE7B7]'
                            : 'text-[#466153]/75 dark:text-[#8EAD9E]/65'
                      }`}
                    >
                      <span className="font-mono text-[10px]">
                        {completed ? '✓' : s.num}
                      </span>
                      <span className="truncate">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.io"
              />
              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <div className="flex items-center justify-between text-xs">
                <Button
                  type="button"
                  variant="text"
                  onClick={() => {
                    setError(null);
                    setNotice(null);
                    setStep('forgot-password');
                  }}
                >
                  Forgot password?
                </Button>
                <Button
                  type="button"
                  variant="text"
                  onClick={() => {
                    if (selectedRole === 'admin') {
                      handleDemoSignIn('organizer@eventsphere.io', 'ExpoAdmin2026!');
                    } else if (selectedRole === 'exhibitor') {
                      handleDemoSignIn('exhibitor@lumina-robotics.io', 'Exhibitor2026!');
                    } else {
                      handleDemoSignIn('attendee@eventsphere.io', 'Attendee2026!');
                    }
                  }}
                >
                  Use Demo {activeRoleMeta.title}
                </Button>
              </div>
              <Button type="submit" variant="primary" fullWidth loading={busy}>
                Sign In to {activeRoleMeta.title} Portal
              </Button>
            </form>
          )}

          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Full Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+44 20 7946 0100"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Work Email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.io"
                />
                <Input
                  label={selectedRole === 'exhibitor' ? 'Company Name' : 'Company / Org (optional)'}
                  required={selectedRole === 'exhibitor'}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Nova Robotics"
                />
              </div>

              {selectedRole === 'exhibitor' && (
                <div className="space-y-3 rounded-xl border border-[#104E35]/18 bg-[#E4EDE7] p-3.5 dark:border-[#2A6F52]/36 dark:bg-[#09120D]">
                  <div className="font-mono text-[11px] font-semibold text-[#059669] dark:text-[#34D399]">
                    Exhibitor Showcase Details
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select
                      label="Industry Sector"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ExhibitorProfile['category'])}
                      options={[
                        { value: 'Robotics & AI', label: 'Robotics & AI' },
                        { value: 'Clean Energy', label: 'Clean Energy' },
                        { value: 'Cloud & Security', label: 'Cloud & Security' },
                        { value: 'Spatial Computing', label: 'Spatial Computing' },
                        { value: 'Biotech & MedTech', label: 'Biotech & MedTech' },
                      ]}
                    />
                    <Input
                      label="Website"
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://company.io"
                    />
                  </div>
                  <Textarea
                    label="Company Overview"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Hardware or platform capabilities to showcase at the expo..."
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Featured Products (comma-separated)"
                      value={productsRaw}
                      onChange={(e) => setProductsRaw(e.target.value)}
                      placeholder="Arm M4, FleetOS"
                    />
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#466153] dark:text-[#8EAD9E]">
                        Brand Accent Color
                      </label>
                      <div className="flex items-center gap-2">
                        {['#10B981', '#34D399', '#F97362', '#38BDF8', '#A78BFA'].map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => setLogoColor(hex)}
                            className={`h-7 w-7 rounded-lg border-2 ${
                              logoColor === hex ? 'border-[#091911] ring-2 ring-[#10B981]/45 scale-110 shadow dark:border-[#A7F3D0]' : 'border-transparent opacity-75'
                            }`}
                            style={{ backgroundColor: hex }}
                            aria-label={`Brand color ${hex}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <Input
                    label="Compliance / Pitch Docs (comma-separated)"
                    value={documentsRaw}
                    onChange={(e) => setDocumentsRaw(e.target.value)}
                    placeholder="Safety-Cert.pdf, Booth-Deck.pdf"
                  />
                </div>
              )}

              {selectedRole === 'admin' && (
                <Input
                  label="Organizer Provisioning Invite Code"
                  required
                  value={organizerInviteCode}
                  onChange={(e) => setOrganizerInviteCode(e.target.value)}
                  placeholder="EVENTSPHERE-ORG-2026"
                  hint="Server-verified code required for Organizer/Admin privileges."
                />
              )}

              <Input
                label="Password (min 6 characters)"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />

              <Checkbox
                checked={gdprConsent}
                onChange={(e) => setGdprConsent(e.target.checked)}
                label="I consent to EventSphere processing my registration data in accordance with GDPR policies."
              />

              <Button type="submit" variant="primary" fullWidth loading={busy}>
                Create {activeRoleMeta.title} Account
              </Button>
            </form>
          )}

          {step === 'forgot-password' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="rounded-xl border border-[#104E35]/18 bg-[#E4EDE7] p-4 dark:border-[#2A6F52]/36 dark:bg-[#09120D]">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#10B981]/15 text-[#059669] dark:text-[#34D399]">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-[#091911] dark:text-[#ECFDF5]">
                      Reset via Registered Gmail
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#466153] dark:text-[#8EAD9E]">
                      Enter the email address registered to your EventSphere account. We will send a 6-digit one-time verification code directly to your inbox (valid for 5 minutes).
                    </p>
                  </div>
                </div>
              </div>

              <Input
                label="Registered Email Address"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={busy}
                leftIcon={<KeyRound className="h-4 w-4" />}
              >
                Send 6-Digit Verification Code
              </Button>
            </form>
          )}

          {step === 'verify-otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="rounded-xl border border-[#104E35]/18 bg-[#E4EDE7] p-4 dark:border-[#2A6F52]/36 dark:bg-[#09120D]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-[#466153] dark:text-[#8EAD9E]">
                      Check your Gmail inbox
                    </div>
                    <div className="mt-0.5 font-mono text-xs font-bold text-[#091911] dark:text-[#ECFDF5]">
                      {email.trim().toLowerCase()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('forgot-password');
                      setError(null);
                      setNotice(null);
                    }}
                    className="text-xs font-semibold text-[#059669] underline-offset-4 hover:underline dark:text-[#34D399]"
                  >
                    Change email
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[#104E35]/14 pt-2.5 text-xs dark:border-[#2A6F52]/30">
                  <span className="flex items-center gap-1.5 text-[#466153] dark:text-[#8EAD9E]">
                    <Clock className="h-3.5 w-3.5 text-[#10B981]" />
                    <span>Code expiration</span>
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      otpExpiresInSec > 60
                        ? 'text-[#059669] dark:text-[#34D399]'
                        : 'text-[#C2410C] dark:text-[#FDA4AF]'
                    }`}
                  >
                    {otpExpiresInSec > 0 ? formatCountdown(otpExpiresInSec) : 'Expired'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#466153] dark:text-[#8EAD9E]">
                  Enter 6-Digit Verification Code
                </label>
                <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      aria-label={`Verification code digit ${idx + 1}`}
                      className="h-12 w-full rounded-xl border border-[#104E35]/28 bg-[#F4F8F5] text-center font-mono text-xl font-bold text-[#091911] transition-all focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 dark:border-[#2A6F52]/55 dark:bg-[#08100B] dark:text-[#34D399] dark:focus:border-[#34D399]"
                    />
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={busy}
                disabled={otpDigits.join('').length !== 6 || otpExpiresInSec <= 0}
              >
                Verify Code &amp; Continue
              </Button>

              <div className="flex items-center justify-between border-t border-[#104E35]/16 pt-3 text-xs dark:border-[#2A6F52]/32">
                <span className="text-[#466153] dark:text-[#8EAD9E]">
                  Didn&apos;t receive the email?
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy || resendCooldownSec > 0}
                  onClick={() => handleRequestOtp()}
                  leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                >
                  {resendCooldownSec > 0
                    ? `Resend in ${resendCooldownSec}s`
                    : 'Resend Code'}
                </Button>
              </div>
            </form>
          )}

          {step === 'new-password' && (
            <form onSubmit={handleCompleteReset} className="space-y-4">
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    label="New Password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    className="absolute top-[30px] right-3 text-[#466153] hover:text-[#091911] dark:text-[#8EAD9E] dark:hover:text-[#ECFDF5]"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    label="Confirm New Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute top-[30px] right-3 text-[#466153] hover:text-[#091911] dark:text-[#8EAD9E] dark:hover:text-[#ECFDF5]"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Password Strength Meter & Checklist */}
              <div className="rounded-xl border border-[#104E35]/18 bg-[#E4EDE7] p-3.5 dark:border-[#2A6F52]/36 dark:bg-[#09120D]">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-[#466153] dark:text-[#8EAD9E]">
                    <Lock className="h-3.5 w-3.5 text-[#10B981]" />
                    <span>Password Strength</span>
                  </span>
                  <span
                    className={`font-mono ${
                      strengthScore >= 5
                        ? 'text-[#059669] dark:text-[#34D399]'
                        : strengthScore >= 3
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-[#C2410C] dark:text-[#FDA4AF]'
                    }`}
                  >
                    {strengthScore === 5 ? 'Strong' : strengthScore >= 3 ? 'Fair' : 'Weak'} ({strengthScore}/5)
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#104E35]/15 dark:bg-[#1B3325]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(strengthScore / 5) * 100}%`,
                      background:
                        strengthScore === 5
                          ? 'linear-gradient(90deg, #059669, #34D399)'
                          : strengthScore >= 3
                            ? '#F59E0B'
                            : '#F97362',
                    }}
                  />
                </div>
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {passwordChecks.map((rule) => (
                    <div
                      key={rule.label}
                      className={`flex items-center gap-1.5 text-[11px] ${
                        rule.met
                          ? 'font-medium text-[#059669] dark:text-[#6EE7B7]'
                          : 'text-[#466153]/80 dark:text-[#8EAD9E]/70'
                      }`}
                    >
                      <Check className={`h-3 w-3 ${rule.met ? 'opacity-100' : 'opacity-30'}`} />
                      <span>{rule.label}</span>
                    </div>
                  ))}
                  <div
                    className={`flex items-center gap-1.5 text-[11px] ${
                      passwordsMatch
                        ? 'font-medium text-[#059669] dark:text-[#6EE7B7]'
                        : 'text-[#466153]/80 dark:text-[#8EAD9E]/70'
                    }`}
                  >
                    <Check className={`h-3 w-3 ${passwordsMatch ? 'opacity-100' : 'opacity-30'}`} />
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={busy}
                disabled={strengthScore < 5 || !passwordsMatch}
              >
                Save New Password
              </Button>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
};
