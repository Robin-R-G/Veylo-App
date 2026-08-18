'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/services/authService';
import { PageHeader } from '@/components/ui/PageHeader';
import { UpgradePrompt } from '@/components/ui/UpgradePrompt';
import { getEntitlementsForTier } from '@/lib/services/entitlementEngine';
import { PlanTier, StaffMember, StaffRole } from '@/types';
import { mockStorage } from '@/lib/services/mockStorage';

export default function StaffSettingsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [planTier, setPlanTier] = useState<PlanTier>('FREE');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<StaffRole>('VIEWER');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [staffLimit, setStaffLimit] = useState(0);

  useEffect(() => {
    setMounted(true);
    const session = authService.getSession();
    if (!session || session.role === 'RIDER') {
      router.replace('/login');
      return;
    }

    // Get plan tier from org
    const org = mockStorage.getState().organization;
    const tier = org?.planTier || 'FREE';
    setPlanTier(tier);
    setStaffLimit(getEntitlementsForTier(tier).allowStaffAccounts ? 10 : 0);

    // Load staff from mock storage
    const stored = localStorage.getItem('veylo_staff');
    if (stored) {
      setStaff(JSON.parse(stored));
    }
  }, [router]);

  if (!mounted) return null;

  const entitlements = getEntitlementsForTier(planTier);
  const canManageStaff = entitlements.allowStaffAccounts;
  const atLimit = staff.length >= staffLimit && staffLimit > 0;

  const handleInvite = () => {
    setInviteError('');
    setInviteSuccess('');

    if (!inviteEmail.trim() || !inviteName.trim()) {
      setInviteError('Name and email are required.');
      return;
    }

    if (atLimit) {
      setInviteError(`Staff limit reached (${staffLimit} seats). Upgrade to add more.`);
      return;
    }

    if (staff.some(s => s.email === inviteEmail)) {
      setInviteError('This email is already invited.');
      return;
    }

    const newStaff: StaffMember = {
      id: `staff_${Date.now().toString(36)}`,
      organizationId: 'org_demo_1',
      userId: `staff_user_${Date.now().toString(36)}`,
      email: inviteEmail,
      name: inviteName,
      role: inviteRole,
      invitedAt: new Date().toISOString(),
      status: 'INVITED',
      createdAt: new Date().toISOString(),
    };

    const updated = [...staff, newStaff];
    setStaff(updated);
    localStorage.setItem('veylo_staff', JSON.stringify(updated));

    setInviteSuccess(`Invitation sent to ${inviteEmail}`);
    setInviteEmail('');
    setInviteName('');
    setInviteRole('VIEWER');
    setTimeout(() => {
      setShowInvite(false);
      setInviteSuccess('');
    }, 2000);
  };

  const handleRemove = (id: string) => {
    if (!confirm('Remove this staff member?')) return;
    const updated = staff.filter(s => s.id !== id);
    setStaff(updated);
    localStorage.setItem('veylo_staff', JSON.stringify(updated));
  };

  const handleToggleStatus = (id: string) => {
    const updated = staff.map(s =>
      s.id === id ? { ...s, status: (s.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE') as StaffMember['status'] } : s
    );
    setStaff(updated);
    localStorage.setItem('veylo_staff', JSON.stringify(updated));
  };

  const ROLE_LABELS: Record<StaffRole, string> = {
    MANAGER: 'Manager',
    DISPATCHER: 'Dispatcher',
    VIEWER: 'Viewer',
  };

  const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
    MANAGER: 'Full access to vehicles, trips, invoices, and settings',
    DISPATCHER: 'Can manage vehicles and trips, view invoices',
    VIEWER: 'Read-only access to dashboard and reports',
  };

  if (!canManageStaff) {
    return (
      <div className="space-y-6 px-4 sm:px-6">
        <PageHeader
          title="Staff Accounts"
          subtitle="Manage your team members and their permissions"
          icon="group"
          backHref="/settings"
        />
        <UpgradePrompt
          feature="Staff Accounts"
          currentTier={planTier}
          requiredTier="BUSINESS"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <PageHeader
        title="Staff Accounts"
        subtitle={`${staff.length}/${staffLimit === 999 ? '∞' : staffLimit} seats used`}
        icon="group"
        backHref="/settings"
        action={
          !atLimit ? (
            <button
              onClick={() => setShowInvite(true)}
              className="px-4 py-2.5 rounded-lg bg-primary text-on-primary font-semibold text-xs flex items-center gap-1.5 shadow hover:opacity-90 transition-all"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              Invite Staff
            </button>
          ) : undefined
        }
      />

      {/* Invite Form */}
      {showInvite && (
        <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-sm text-on-surface">Invite Staff Member</h3>

          {inviteError && (
            <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex gap-2 items-center">
              <span className="material-symbols-outlined text-sm">error</span>
              {inviteError}
            </div>
          )}

          {inviteSuccess && (
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs flex gap-2 items-center">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              {inviteSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Email</label>
              <input
                type="email"
                placeholder="rahul@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5">Role</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.keys(ROLE_LABELS) as StaffRole[]).map(role => (
                <button
                  key={role}
                  onClick={() => setInviteRole(role)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    inviteRole === role
                      ? 'border-primary bg-primary-container/20'
                      : 'border-outline-variant hover:bg-surface-container-low'
                  }`}
                >
                  <p className="text-xs font-bold text-on-surface">{ROLE_LABELS[role]}</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">{ROLE_DESCRIPTIONS[role]}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleInvite}
              className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all"
            >
              Send Invitation
            </button>
            <button
              onClick={() => setShowInvite(false)}
              className="px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Staff List */}
      {staff.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-outline-variant p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant block mb-2">group</span>
          <p className="text-sm font-semibold text-on-surface">No staff members yet</p>
          <p className="text-xs text-on-surface-variant mt-1">Invite your team to help manage your fleet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map(member => (
            <div
              key={member.id}
              className="bg-surface rounded-2xl border border-outline-variant p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm flex-shrink-0">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">{member.name}</p>
                  <p className="text-xs text-on-surface-variant truncate">{member.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                      {ROLE_LABELS[member.role]}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      member.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                      member.status === 'INVITED' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {member.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggleStatus(member.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    member.status === 'ACTIVE'
                      ? 'text-amber-700 hover:bg-amber-50'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {member.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => handleRemove(member.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role Permissions Reference */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-6 space-y-3">
        <h3 className="font-bold text-sm text-on-surface">Role Permissions</h3>
        <div className="text-xs text-on-surface-variant space-y-2">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-sm text-primary mt-0.5">admin_panel_settings</span>
            <div>
              <p className="font-semibold text-on-surface">Manager</p>
              <p>Full access to vehicles, trips, invoices, settings, and billing.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-sm text-primary mt-0.5">local_shipping</span>
            <div>
              <p className="font-semibold text-on-surface">Dispatcher</p>
              <p>Can manage vehicles, approve/reject trips, and view invoices. Cannot access settings or billing.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-sm text-primary mt-0.5">visibility</span>
            <div>
              <p className="font-semibold text-on-surface">Viewer</p>
              <p>Read-only access to dashboard, vehicles, and reports. Cannot make any changes.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
