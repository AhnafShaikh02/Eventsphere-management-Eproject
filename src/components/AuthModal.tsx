import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  KeyRound,
  LogOut,
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

type AuthStep = 'role-select' | 'login' | 'register' | 'reset';

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
  const [step, setStep] = useState<AuthStep>(defaultTab);
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

  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [issuedCodeHint, setIssuedCodeHint] = useState<string | null>(null);

  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileCompany, setProfileCompany] = useState(currentUser?.company || '');
  const [profileTitle, setProfileTitle] = useState(currentUser?.title || '');
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || '');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setSelectedRole(defaultRole);
  }, [defaultRole]);

  React.useEffect(() => {
    if (isOpen) {
      setStep(defaultTab);
      setPostSelectTarget(defaultTab === 'register' ? 'register' : 'login');
      setError(null);
    }
  }, [isOpen, defaultTab]);

  React.useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name);
      setProfileCompany(currentUser.company || '');
      setProfileTitle(currentUser.title || '');
      setProfilePhone(currentUser.phone || '');
    }
  }, [currentUser]);

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
            : `${activeRoleMeta.title} Portal · ${step === 'register' ? 'Sign Up' : step === 'reset' ? 'Reset Password' : 'Sign In'}`
      }
    >
      {error && (
        <div className="mb-4 rounded-xl border border-[#F97362]/50 bg-[#F97362]/12 px-3.5 py-2.5 text-xs font-medium text-[#C2410C] dark:text-[#FDA4AF]">
          {error}
        </div>
      )}

      {currentUser ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-[#F4F7F5] p-4 dark:border-[#10B981]/20 dark:bg-[#09120D]">
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
                      : 'border-slate-200 bg-[#F4F7F5] hover:border-[#10B981]/45 dark:border-[#10B981]/18 dark:bg-[#09120D]'
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-[#10B981]/18">
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

          <div className="rounded-xl border border-slate-200 bg-[#F4F7F5] p-3.5 dark:border-[#10B981]/18 dark:bg-[#09120D]">
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
              onClick={() => {
                setStep('role-select');
                setError(null);
              }}
            >
              Change Role ({activeRoleMeta.title})
            </Button>

            <div className="flex gap-1.5">
              {(['login', 'register', 'reset'] as const).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={step === t ? 'primary' : 'ghost'}
                  onClick={() => {
                    setStep(t);
                    setError(null);
                  }}
                >
                  {t === 'login' ? 'Sign In' : t === 'register' ? 'Sign Up' : 'Reset'}
                </Button>
              ))}
            </div>
          </div>

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
                <Button variant="text" onClick={() => setStep('reset')}>
                  Forgot password?
                </Button>
                <Button
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
                <div className="space-y-3 rounded-xl border border-slate-200 bg-[#F4F7F5] p-3.5 dark:border-[#10B981]/18 dark:bg-[#09120D]">
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
                              logoColor === hex ? 'border-white scale-110 shadow' : 'border-transparent opacity-75'
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

          {step === 'reset' && (
            <form onSubmit={handleCompleteReset} className="space-y-3.5">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Account Email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.io"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || !email}
                  onClick={handleRequestReset}
                  leftIcon={<KeyRound className="h-3.5 w-3.5" />}
                >
                  Send Code
                </Button>
              </div>

              {issuedCodeHint && (
                <div className="rounded-xl border border-[#34D399]/40 bg-[#34D399]/12 px-3.5 py-2.5 font-mono text-xs text-emerald-900 dark:text-[#34D399]">
                  One-time reset code: <strong>{issuedCodeHint}</strong>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Reset Code"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="8-char code"
                  className="font-mono uppercase"
                />
                <Input
                  label="New Password"
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <Button type="submit" variant="primary" fullWidth loading={busy}>
                Confirm Password Reset
              </Button>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
};
