import React, { useMemo, useState } from 'react';
import {
  Bell,
  Building2,
  Calendar,
  Compass,
  Eye,
  FileText,
  Grid,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Package,
  Plus,
  Send,
  Settings,
  Trash2,
  Users,
} from 'lucide-react';
import type { EventSphereSnapshot, ExhibitorProfile, UserAccount } from '../../types/eventsphere';
import { STATUS_HEX } from '../../three/expoModels';
import { eventSphereApi } from '../../services/eventSphereClient';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  SearchInput,
  Select,
  StatCard,
  Textarea,
} from '../ui';
import { PrivacyAndComplianceCard } from '../PrivacyAndComplianceCard';
import { DashboardLayout, type PortalNavItem } from './DashboardLayout';

interface ExhibitorPortalProps {
  snapshot: EventSphereSnapshot;
  currentUser: UserAccount;
  authToken: string;
  unreadNotifications: number;
  onRefreshState: () => Promise<void>;
  onOpen3DFloor: () => void;
  onInspectBoothOnFloor: (boothId: string) => void;
  onOpenNotifications: () => void;
  onOpenProfileModal: () => void;
  onLogout: () => void;
  onToast: (msg: string) => void;
}

export const ExhibitorPortal: React.FC<ExhibitorPortalProps> = ({
  snapshot,
  currentUser,
  authToken,
  unreadNotifications,
  onRefreshState,
  onOpen3DFloor,
  onInspectBoothOnFloor,
  onOpenNotifications,
  onOpenProfileModal,
  onLogout,
  onToast,
}) => {
  const [section, setSection] = useState('overview');
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const myExhibitor = useMemo(
    () =>
      snapshot.exhibitors.find((e) => e.userId === currentUser.id) ||
      snapshot.exhibitors[0],
    [snapshot.exhibitors, currentUser.id],
  );

  const myBooths = useMemo(
    () => snapshot.booths.filter((b) => myExhibitor && b.exhibitorId === myExhibitor.id),
    [snapshot.booths, myExhibitor],
  );

  const myApplications = useMemo(
    () => snapshot.applications.filter((a) => !myExhibitor || a.exhibitorId === myExhibitor.id),
    [snapshot.applications, myExhibitor],
  );

  const [profileForm, setProfileForm] = useState({
    companyName: myExhibitor?.companyName || '',
    category: (myExhibitor?.category || 'Robotics & AI') as ExhibitorProfile['category'],
    tagline: myExhibitor?.tagline || '',
    description: myExhibitor?.description || '',
    contactEmail: myExhibitor?.contactEmail || currentUser.email,
    phone: myExhibitor?.phone || '',
    website: myExhibitor?.website || '',
    logoColor: myExhibitor?.logoColor || '#D4AF63',
  });

  const [appForm, setAppForm] = useState({
    expoId: snapshot.expos[0]?.id || 'expo-2026-global',
    productsSummary: '',
    documentsRaw: 'Safety-Compliance.pdf, Booth-Power-Spec.pdf',
  });

  const [newProduct, setNewProduct] = useState('');
  const [newStaff, setNewStaff] = useState('');
  const [chatChannel, setChatChannel] = useState('organizer');
  const [chatDraft, setChatDraft] = useState('');
  const [releaseBoothId, setReleaseBoothId] = useState<string | null>(null);

  const navItems: PortalNavItem[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'profile', label: 'Company Profile', icon: <Building2 className="h-4 w-4" /> },
    { id: 'expos', label: 'My Expos', icon: <Calendar className="h-4 w-4" /> },
    { id: 'applications', label: 'Applications', icon: <FileText className="h-4 w-4" />, badgeCount: myApplications.length },
    { id: 'booth-selection', label: 'Booth Selection', icon: <Grid className="h-4 w-4" /> },
    { id: 'my-booth', label: 'My Booth', icon: <MapPin className="h-4 w-4" />, badgeCount: myBooths.length },
    { id: 'products', label: 'Products & Services', icon: <Package className="h-4 w-4" /> },
    { id: 'staff', label: 'Staff Management', icon: <Users className="h-4 w-4" /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" />, badgeCount: unreadNotifications },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myExhibitor) return;
    setBusy(true);
    const res = await eventSphereApi.updateExhibitorProfile(authToken, myExhibitor.id, profileForm);
    setBusy(false);
    if (!res.ok) return onToast(res.error);
    onToast('Company profile updated');
    await onRefreshState();
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myExhibitor) return;
    setBusy(true);
    const res = await eventSphereApi.submitApplication(authToken, {
      expoId: appForm.expoId,
      companyName: myExhibitor.companyName,
      category: myExhibitor.category,
      productsSummary: appForm.productsSummary,
      documents: appForm.documentsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setBusy(false);
    if (!res.ok) return onToast(res.error);
    onToast('Application submitted to Organizer team');
    setAppForm((p) => ({ ...p, productsSummary: '' }));
    await onRefreshState();
  };

  const handleReserveBooth = async (boothId: string) => {
    setBusy(true);
    const res = await eventSphereApi.reserveBooth(authToken, boothId);
    setBusy(false);
    if (!res.ok) return onToast(res.error);
    onToast(`Booth ${res.data.number} reserved!`);
    await onRefreshState();
  };

  return (
    <DashboardLayout
      roleTitle={myExhibitor?.companyName || 'Exhibitor Workspace'}
      roleAccent="#F97362"
      currentUser={currentUser}
      navItems={navItems}
      activeSection={section}
      unreadNotifications={unreadNotifications}
      onSelectSection={setSection}
      onOpen3DFloor={onOpen3DFloor}
      onOpenNotifications={onOpenNotifications}
      onLogout={onLogout}
    >
      {section === 'overview' && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Assigned Booths"
              value={myBooths.length}
              sublabel={myBooths.map((b) => b.number).join(', ') || 'Select a booth'}
              icon={<MapPin className="h-5 w-5" />}
              tone="coral"
            />
            <StatCard
              label="Application Status"
              value={(myApplications[0]?.status || 'ready').replace('_', ' ')}
              sublabel={`${myApplications.length} submitted`}
              icon={<FileText className="h-5 w-5" />}
              tone="emerald"
            />
            <StatCard
              label="Profile Views"
              value={myExhibitor?.profileViews || 0}
              sublabel="Tracked across 3D & catalog"
              icon={<Eye className="h-5 w-5" />}
              tone="teal"
            />
            <StatCard
              label="Showcased Products"
              value={myExhibitor?.products.length || 0}
              sublabel={`${myExhibitor?.staff.length || 0} staff registered`}
              icon={<Package className="h-5 w-5" />}
              tone="violet"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card padding="md">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold">Booth Assignment Summary</h2>
                <Button variant="text" onClick={() => setSection('booth-selection')}>
                  Reserve Booth
                </Button>
              </div>
              {myBooths.length === 0 ? (
                <div className="mt-3">
                  <EmptyState
                    icon={<Grid className="h-5 w-5" />}
                    title="No booth reserved yet"
                    description="Once your application is approved, claim any available champagne gold booth on the live floor plan."
                    action={
                      <Button variant="primary" size="sm" onClick={() => setSection('booth-selection')}>
                        Browse Floor Booths
                      </Button>
                    }
                  />
                </div>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {myBooths.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-xl border border-[#272732]/18 bg-[#E6E7EE] p-3.5 dark:border-[#2D2D3A]/34 dark:bg-[#0E0E13]"
                    >
                      <div>
                        <div className="font-display text-sm font-bold">
                          Booth {b.number} · {b.zone}
                        </div>
                        <div className="font-mono text-xs text-[#525463] dark:text-[#9497A6]">
                          {b.size} · ${b.priceUsd.toLocaleString()} · {b.trafficCount} visits
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => onInspectBoothOnFloor(b.id)}>
                        Inspect 3D
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card padding="md">
              <h2 className="font-display text-base font-bold">Quick Actions</h2>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                <Button variant="primary" onClick={() => setSection('booth-selection')}>
                  Pick Open Booth
                </Button>
                <Button variant="secondary" onClick={() => setSection('profile')}>
                  Edit Company Showcase
                </Button>
                <Button variant="outline" onClick={() => setSection('products')}>
                  Manage Products ({myExhibitor?.products.length || 0})
                </Button>
                <Button variant="outline" onClick={() => setSection('messages')}>
                  Message Organizer
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {section === 'profile' && myExhibitor && (
        <Card padding="lg">
          <h2 className="font-display text-lg font-bold">Company Showcase Profile</h2>
          <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Company Name"
                required
                value={profileForm.companyName}
                onChange={(e) => setProfileForm((p) => ({ ...p, companyName: e.target.value }))}
              />
              <Select
                label="Industry Sector"
                value={profileForm.category}
                onChange={(e) =>
                  setProfileForm((p) => ({ ...p, category: e.target.value as ExhibitorProfile['category'] }))
                }
                options={[
                  { value: 'Robotics & AI', label: 'Robotics & AI' },
                  { value: 'Clean Energy', label: 'Clean Energy' },
                  { value: 'Cloud & Security', label: 'Cloud & Security' },
                  { value: 'Spatial Computing', label: 'Spatial Computing' },
                  { value: 'Biotech & MedTech', label: 'Biotech & MedTech' },
                ]}
              />
            </div>
            <Input
              label="Headline Tagline"
              value={profileForm.tagline}
              onChange={(e) => setProfileForm((p) => ({ ...p, tagline: e.target.value }))}
            />
            <Textarea
              label="Full Company Description"
              rows={3}
              value={profileForm.description}
              onChange={(e) => setProfileForm((p) => ({ ...p, description: e.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="Contact Email"
                type="email"
                value={profileForm.contactEmail}
                onChange={(e) => setProfileForm((p) => ({ ...p, contactEmail: e.target.value }))}
              />
              <Input
                label="Phone"
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
              />
              <Input
                label="Website"
                value={profileForm.website}
                onChange={(e) => setProfileForm((p) => ({ ...p, website: e.target.value }))}
              />
            </div>
            <div>
              <div className="mb-1.5 text-xs font-semibold text-[#525463] dark:text-[#9497A6]">
                Booth Brand Color Swatch
              </div>
              <div className="flex gap-2">
                {['#D4AF63', '#E8C987', '#F97362', '#38BDF8', '#C58B3B', '#F59E0B'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setProfileForm((p) => ({ ...p, logoColor: hex }))}
                    className={`h-8 w-8 rounded-lg border-2 ${
                      profileForm.logoColor === hex ? 'border-[#0B0B0E] ring-2 ring-[#D4AF63]/45 scale-110 shadow dark:border-[#F3DCAA]' : 'border-transparent opacity-75'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" variant="primary" loading={busy}>
              Save Company Profile
            </Button>
          </form>
        </Card>
      )}

      {section === 'expos' && (
        <div className="grid gap-4 md:grid-cols-2">
          {snapshot.expos.map((expo) => (
            <Card key={expo.id} padding="md">
              <div className="flex items-center justify-between">
                <Badge tone={expo.status === 'live' ? 'emerald' : 'teal'}>{expo.status}</Badge>
                <span className="font-mono text-xs text-[#525463] dark:text-[#9497A6]">{expo.date}</span>
              </div>
              <h3 className="mt-2 font-display text-base font-bold">{expo.title}</h3>
              <p className="mt-1 text-xs text-[#525463] dark:text-[#9497A6]">{expo.location}</p>
              <p className="mt-2 text-xs text-[#525463] dark:text-[#9497A6]">{expo.description}</p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setAppForm((p) => ({ ...p, expoId: expo.id }));
                  setSection('applications');
                }}
              >
                Apply to Exhibit
              </Button>
            </Card>
          ))}
        </div>
      )}

      {section === 'applications' && (
        <div className="grid gap-5 lg:grid-cols-5">
          <Card padding="md" className="lg:col-span-2">
            <h2 className="font-display text-base font-bold">New Expo Application</h2>
            <form onSubmit={handleApply} className="mt-3 space-y-3">
              <Select
                label="Target Expo"
                value={appForm.expoId}
                onChange={(e) => setAppForm((p) => ({ ...p, expoId: e.target.value }))}
                options={snapshot.expos.map((e) => ({ value: e.id, label: e.title }))}
              />
              <Textarea
                label="Products & Live Demo Summary"
                rows={3}
                required
                value={appForm.productsSummary}
                onChange={(e) => setAppForm((p) => ({ ...p, productsSummary: e.target.value }))}
                placeholder="Describe hardware, power drop needs, and live demos..."
              />
              <Input
                label="Compliance Docs (comma-separated)"
                value={appForm.documentsRaw}
                onChange={(e) => setAppForm((p) => ({ ...p, documentsRaw: e.target.value }))}
              />
              <Button type="submit" variant="primary" fullWidth loading={busy}>
                Submit Application
              </Button>
            </form>
          </Card>

          <div className="space-y-3 lg:col-span-3">
            {myApplications.map((app) => (
              <Card key={app.id} padding="md">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-bold">{app.companyName}</span>
                  <Badge
                    tone={
                      app.status === 'approved'
                        ? 'emerald'
                        : app.status === 'rejected'
                          ? 'coral'
                          : app.status === 'info_requested'
                            ? 'amber'
                            : 'violet'
                    }
                  >
                    {app.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs text-[#525463] dark:text-[#9497A6]">{app.productsSummary}</p>
                {(app.reviewerNote || app.rejectionReason) && (
                  <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-300">
                    Organizer Note: {app.reviewerNote || app.rejectionReason}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {section === 'booth-selection' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Filter booths by code or zone..."
              className="w-full sm:w-72"
            />
            <Button variant="outline" leftIcon={<Compass className="h-4 w-4" />} onClick={onOpen3DFloor}>
              Pick in 3D Hall
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {snapshot.booths
              .filter((b) =>
                !searchQuery
                  ? true
                  : `${b.number} ${b.zone} ${b.status}`.toLowerCase().includes(searchQuery.toLowerCase()),
              )
              .map((b) => {
                const isMine = myExhibitor && b.exhibitorId === myExhibitor.id;
                return (
                  <Card key={b.id} padding="md" className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-display text-base font-bold">Booth {b.number}</span>
                        <span
                          className="h-2.5 w-2.5 rounded-xs"
                          style={{ backgroundColor: STATUS_HEX[b.status] }}
                        />
                      </div>
                      <div className="mt-1 font-mono text-xs text-[#525463] dark:text-[#9497A6]">
                        {b.zone} · {b.size}
                      </div>
                      <div className="mt-1 font-mono text-sm font-bold text-[#8A621C] dark:text-[#E8C987]">
                        ${b.priceUsd.toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      {b.status === 'available' ? (
                        <Button
                          size="sm"
                          variant="primary"
                          loading={busy}
                          onClick={() => handleReserveBooth(b.id)}
                        >
                          Reserve Atomically
                        </Button>
                      ) : isMine ? (
                        <Badge tone="emerald">Your Booth</Badge>
                      ) : (
                        <Badge tone="neutral">{b.exhibitorName || b.status}</Badge>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => onInspectBoothOnFloor(b.id)}>
                        Inspect 3D
                      </Button>
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {section === 'my-booth' && (
        <div className="space-y-4">
          {myBooths.length === 0 ? (
            <EmptyState
              icon={<MapPin className="h-5 w-5" />}
              title="No active booth allocation"
              description="Visit Booth Selection to claim an open floor booth."
              action={
                <Button variant="primary" onClick={() => setSection('booth-selection')}>
                  Select Booth
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {myBooths.map((b) => (
                <Card key={b.id} padding="md">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold">Booth {b.number}</h3>
                    <Badge tone="emerald">{b.status}</Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-[#525463] dark:text-[#9497A6]">
                    {b.zone} · {b.size} · ${b.priceUsd.toLocaleString()} · {b.trafficCount} floor visits
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="primary" onClick={() => onInspectBoothOnFloor(b.id)}>
                      Inspect in 3D
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setReleaseBoothId(b.id)}
                    >
                      Release Booth
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {section === 'products' && myExhibitor && (
        <Card padding="lg" className="space-y-4">
          <h2 className="font-display text-lg font-bold">Products &amp; Services Catalog</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newProduct.trim()) return;
              const nextProducts = [...myExhibitor.products, newProduct.trim()];
              const res = await eventSphereApi.updateExhibitorProfile(authToken, myExhibitor.id, {
                products: nextProducts,
              });
              if (res.ok) {
                setNewProduct('');
                onToast('Product added');
                await onRefreshState();
              } else {
                onToast(res.error);
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newProduct}
              onChange={(e) => setNewProduct(e.target.value)}
              placeholder="Add product or live demo module..."
              className="flex-1 rounded-xl border border-[#272732]/20 bg-[#F8F8FB] px-3.5 py-2 text-sm text-[#0B0B0E] placeholder:text-[#5E6070] focus:border-[#D4AF63] focus:outline-none dark:border-[#2D2D3A]/38 dark:bg-[#0E0E13] dark:text-[#F2F3F7] dark:placeholder:text-[#737685]"
            />
            <Button type="submit" variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
              Add Product
            </Button>
          </form>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {myExhibitor.products.map((prod) => (
              <div
                key={prod}
                className="flex items-center justify-between rounded-xl border border-[#272732]/18 bg-[#E6E7EE] px-4 py-3 text-sm font-semibold dark:border-[#2D2D3A]/34 dark:bg-[#0E0E13]"
              >
                <span>{prod}</span>
                <Button
                  variant="icon"
                  size="sm"
                  onClick={async () => {
                    const nextProducts = myExhibitor.products.filter((p) => p !== prod);
                    await eventSphereApi.updateExhibitorProfile(authToken, myExhibitor.id, {
                      products: nextProducts,
                    });
                    onToast('Product removed');
                    await onRefreshState();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-[#F97362]" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {section === 'staff' && myExhibitor && (
        <Card padding="lg" className="space-y-4">
          <h2 className="font-display text-lg font-bold">On-Booth Staff Roster</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newStaff.trim()) return;
              const nextStaff = [...myExhibitor.staff, newStaff.trim()];
              const res = await eventSphereApi.updateExhibitorProfile(authToken, myExhibitor.id, {
                staff: nextStaff,
              });
              if (res.ok) {
                setNewStaff('');
                onToast('Staff member added');
                await onRefreshState();
              } else {
                onToast(res.error);
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newStaff}
              onChange={(e) => setNewStaff(e.target.value)}
              placeholder="Staff full name..."
              className="flex-1 rounded-xl border border-[#272732]/20 bg-[#F8F8FB] px-3.5 py-2 text-sm text-[#0B0B0E] placeholder:text-[#5E6070] focus:border-[#D4AF63] focus:outline-none dark:border-[#2D2D3A]/38 dark:bg-[#0E0E13] dark:text-[#F2F3F7] dark:placeholder:text-[#737685]"
            />
            <Button type="submit" variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
              Add Staff
            </Button>
          </form>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {myExhibitor.staff.map((member) => (
              <div
                key={member}
                className="flex items-center justify-between rounded-xl border border-[#272732]/18 bg-[#E6E7EE] px-4 py-3 text-sm font-semibold dark:border-[#2D2D3A]/34 dark:bg-[#0E0E13]"
              >
                <span>{member}</span>
                <Button
                  variant="icon"
                  size="sm"
                  onClick={async () => {
                    const nextStaff = myExhibitor.staff.filter((s) => s !== member);
                    await eventSphereApi.updateExhibitorProfile(authToken, myExhibitor.id, {
                      staff: nextStaff,
                    });
                    onToast('Staff member removed');
                    await onRefreshState();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-[#F97362]" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {section === 'messages' && (
        <Card padding="md" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold">Direct Messaging</h2>
            <Select
              value={chatChannel}
              onChange={(e) => setChatChannel(e.target.value)}
              className="w-60"
              options={[
                { value: 'organizer', label: 'Organizer Desk' },
                ...(myExhibitor ? [{ value: myExhibitor.id, label: 'My Booth Inbox' }] : []),
                ...snapshot.exhibitors
                  .filter((ex) => ex.id !== myExhibitor?.id)
                  .map((ex) => ({ value: ex.id, label: `Neighbor: ${ex.companyName}` })),
              ]}
            />
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-[#272732]/18 bg-[#E6E7EE] p-3 dark:border-[#2D2D3A]/34 dark:bg-[#0E0E13]">
            {snapshot.messages
              .filter((m) => m.recipientChannel === chatChannel)
              .map((m) => (
                <div key={m.id} className="rounded-lg border border-[#272732]/16 bg-[#FFFFFF] p-2.5 text-xs dark:border-[#2D2D3A]/30 dark:bg-[#131319]">
                  <div className="flex justify-between font-semibold">
                    <span>{m.senderName}</span>
                    <span className="font-mono text-[10px] text-[#525463] dark:text-[#9497A6]">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-1 text-[#525463] dark:text-[#D4D6E0]">{m.body}</p>
                </div>
              ))}
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!chatDraft.trim()) return;
              const res = await eventSphereApi.sendMessage(authToken, {
                recipientChannel: chatChannel,
                recipientLabel: chatChannel === 'organizer' ? 'Organizer Desk' : 'Booth Thread',
                body: chatDraft.trim(),
              });
              if (res.ok) {
                setChatDraft('');
                await onRefreshState();
              } else {
                onToast(res.error);
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              placeholder="Write a message..."
              className="flex-1 rounded-xl border border-[#272732]/20 bg-[#F8F8FB] px-3.5 py-2 text-sm text-[#0B0B0E] placeholder:text-[#5E6070] focus:border-[#D4AF63] focus:outline-none dark:border-[#2D2D3A]/38 dark:bg-[#0E0E13] dark:text-[#F2F3F7] dark:placeholder:text-[#737685]"
            />
            <Button type="submit" variant="primary" leftIcon={<Send className="h-3.5 w-3.5" />}>
              Send
            </Button>
          </form>
        </Card>
      )}

      {section === 'notifications' && (
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Notifications</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await eventSphereApi.markNotificationsRead(authToken);
                onToast('Marked read');
                await onRefreshState();
              }}
            >
              Mark All Read
            </Button>
          </div>
          {snapshot.notifications.map((n) => (
            <div key={n.id} className="rounded-xl border border-[#272732]/18 bg-[#E6E7EE] p-3 text-xs dark:border-[#2D2D3A]/34 dark:bg-[#0E0E13]">
              <div className="flex justify-between font-bold">
                <span>{n.title}</span>
                <Badge tone="emerald">{n.kind}</Badge>
              </div>
              <p className="mt-1 text-[#525463] dark:text-[#9497A6]">{n.message}</p>
            </div>
          ))}
        </Card>
      )}

      {section === 'settings' && (
        <div className="space-y-5">
          <Card padding="lg" className="space-y-4">
            <h2 className="font-display text-lg font-bold">Account Settings</h2>
            <p className="text-xs text-[#525463] dark:text-[#9497A6]">
              Account: <strong>{currentUser.name}</strong> ({currentUser.email})
            </p>
            <Button variant="primary" onClick={onOpenProfileModal}>
              Edit Personal Account Details
            </Button>
          </Card>

          <PrivacyAndComplianceCard
            currentUser={currentUser}
            authToken={authToken}
            onRefreshState={onRefreshState}
            onLogout={onLogout}
            onToast={onToast}
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(releaseBoothId)}
        title="Release Reserved Booth?"
        description="This immediately opens the booth on the live 3D floor plan for other exhibitors."
        confirmLabel="Release Booth"
        busy={busy}
        onCancel={() => setReleaseBoothId(null)}
        onConfirm={async () => {
          if (!releaseBoothId) return;
          setBusy(true);
          const res = await eventSphereApi.releaseBooth(authToken, releaseBoothId);
          setBusy(false);
          setReleaseBoothId(null);
          if (!res.ok) return onToast(res.error);
          onToast(`Booth ${res.data.number} released`);
          await onRefreshState();
        }}
      />
    </DashboardLayout>
  );
};
