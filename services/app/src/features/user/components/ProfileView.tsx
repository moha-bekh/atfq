import { useMemo, useRef, useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores/app.store';
import { useProfile } from '../hooks/useProfile';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useAuthManagement } from '@/features/auth/hooks/useAuthManagement';
import { useOAuth } from '@/features/auth/hooks/useOAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { userApi } from '@/features/user/api';
import type { UserSearchResult } from '@/features/user/types';
import { GoogleCircle } from '@/assets/icons/GoogleCircle';
import { GithubCircle } from '@/assets/icons/GithubCircle';

type Section = 'auth' | 'roles' | 'friends' | 'appearance';
type RoleRequestFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'canceled';
type UsernameForm = { username: string };
type EmailForm = { newEmail: string };
type PasswordForm = {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
};
type ApiErrorPayload = { error?: string };
type ApiError = Error & {
  response?: {
    json: () => Promise<ApiErrorPayload>;
  };
};

const ROLE_REQUEST_PAGE_SIZE = 5;
const ROLE_PRIORITY = ['admin', 'moderator', 'user'];
const TEXT_FONTS = ['Plus Jakarta Sans', 'JetBrains Mono', 'Bricolage Grotesque'];
const DISPLAY_FONTS = ['Bricolage Grotesque', 'Plus Jakarta Sans', 'JetBrains Mono'];
const PRESET_THEMES = [
  'base',
  'husqy',
  'paper',
  'graphite',
  'aurora',
  'lagoon',
  'ember',
  'orchid',
  'circuit',
  'daybreak',
];
const PERMISSION_COPY: Record<string, { title: string; description: string }> = {
  'profile:write': {
    title: 'Manage your profile',
    description: 'Update your profile settings, appearance, and account preferences.',
  },
  'wiki:submit': {
    title: 'Submit wiki drafts',
    description: 'Create or edit wiki articles and send them for moderation.',
  },
  'wiki:publish': {
    title: 'Publish wiki changes',
    description: 'Review, approve, or reject pending wiki contributions.',
  },
  'roles:assign': {
    title: 'Manage user roles',
    description: 'Assign or remove roles for other users.',
  },
  'requests:review': {
    title: 'Review role requests',
    description: 'Approve or reject requests for elevated access.',
  },
};

const getHighestRole = (roles?: string[]) => {
  if (!roles?.length) return null;

  return [...roles].sort((a, b) => {
    const aRank = ROLE_PRIORITY.indexOf(a.toLowerCase());
    const bRank = ROLE_PRIORITY.indexOf(b.toLowerCase());

    return (aRank === -1 ? ROLE_PRIORITY.length : aRank) - (bRank === -1 ? ROLE_PRIORITY.length : bRank);
  })[0];
};

const getRoleRank = (role: string) => ROLE_PRIORITY.indexOf(role.toLowerCase());

const hasRoleAccess = (roles: string[] | undefined, requestedRole: string) => {
  const requestedRank = getRoleRank(requestedRole);

  if (!roles?.length || requestedRank === -1) return false;

  return roles.some((activeRole) => {
    const activeRank = getRoleRank(activeRole);

    if (activeRank === -1) return activeRole.toLowerCase() === requestedRole.toLowerCase();

    return activeRank <= requestedRank;
  });
};

const describePermission = (permission: string) => {
  const knownPermission = PERMISSION_COPY[permission];

  if (knownPermission) return knownPermission;

  const readableTitle = permission
    .split(':')
    .flatMap((part) => part.split(/[-_]/))
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');

  return {
    title: readableTitle || 'Custom access',
    description: 'Additional access enabled for this account.',
  };
};

const getApiErrorMessage = async (error: unknown, fallback: string) => {
  const apiError = error as Partial<ApiError>;

  try {
    const errorData = await apiError.response?.json();
    return errorData?.error || apiError.message || fallback;
  } catch {
    return apiError.message || fallback;
  }
};

const StatusDisplay = ({ type, message }: { type: 'success' | 'error', message: string }) => (
  <div className={`mt-2 text-[10px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-1 ${type === 'error' ? 'text-error' : 'text-main'}`}>
    {type === 'error' ? '⚠ ' : '✓ '} {message}
  </div>
);

export const ProfileView = () => {
  const [activeSection, setActiveSection] = useState<Section>('auth');
  const photoMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  
  const { 
    user, 
    profile: storedProfile, 
    updateTheme: updateThemeStore,
    setCustomColor,
    resetCustomColors,
    applyTheme,
    refreshProfile
  } = useAppStore();

  const { logout } = useLogout();

  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  const { 
    profile: fetchedProfile,
    isLoading, 
    isError,
    availablePermissions,
    isPermissionsLoading,
    isPermissionsError,
    roleRequests,
    friends,
    isRoleRequestsLoading,
    isRoleRequestsError,
    isFriendsLoading,
    isFriendsError,
    isUploading,
    isRequestingRole,
    isCancelingRoleRequest,
    isLeavingRole,
    isAcceptingFriend,
    isSendingFriendRequest,
    isRemovingFriend,
    updateTheme: updateThemeApi, 
    uploadPicture, 
    removePicture,
    requestRole, 
    cancelRoleRequest,
    leaveRole,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
  } = useProfile();

  const {
    updateEmail,
    updateUsername,
    updatePassword,
    deleteAccount,
    enableMfa,
    disableMfa,
  } = useAuthManagement();

  const {
    getOAuthUrl,
    unlinkProvider,
    isUnlinking,
    linkedProviders,
    isLoadingProviders
  } = useOAuth();

  const profile = fetchedProfile ?? storedProfile;

  // Forms
  const { register: regUsername, handleSubmit: handleUsernameSubmit, reset: resetUsername } = useForm<UsernameForm>({
    defaultValues: { username: user?.username ?? '' }
  });
  const { register: regEmail, handleSubmit: handleEmailSubmit, reset: resetEmail } = useForm<EmailForm>({
    defaultValues: { newEmail: user?.email ?? '' }
  });
  const { register: regPassword, handleSubmit: handlePasswordSubmit, reset: resetPassword } = useForm<PasswordForm>();

  // UI States
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(user?.mfa_enabled || false);
  const [showCustom, setShowCustom] = useState(false);
  const [requestedRole, setRequestedRole] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [roleRequestFilter, setRoleRequestFilter] = useState<RoleRequestFilter>('all');
  const [visibleRoleRequestCount, setVisibleRoleRequestCount] = useState(ROLE_REQUEST_PAGE_SIZE);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendSearchResults, setFriendSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);
  const [cancelRequestTarget, setCancelRequestTarget] = useState<{
    requestId: string;
    role: string;
  } | null>(null);
  const [leaveRoleTarget, setLeaveRoleTarget] = useState<string | null>(null);
  const requestableRoles = ['moderator', 'admin'];

  useEffect(() => {
    if (user) {
      setIs2FAEnabled(user.mfa_enabled);
    }
  }, [user]);

  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
    target: 'username' | 'email' | 'password' | 'mfa' | 'account' | 'role' | 'friends';
  } | null>(null);

  useEffect(() => {
    if (location.state?.error) {
      setStatus({ type: 'error', message: location.state.error, target: 'mfa' }); // Use mfa target for general profile errors
      // Clear the state to avoid repeating the error on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    setVisibleRoleRequestCount(ROLE_REQUEST_PAGE_SIZE);
  }, [roleRequestFilter, roleRequests.length]);

  useEffect(() => {
    if (!isPhotoMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Node && photoMenuRef.current?.contains(target)) {
        return;
      }

      setIsPhotoMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPhotoMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPhotoMenuOpen]);

  const navItems = [
    { id: 'auth', label: 'Authentication' },
    { id: 'roles', label: 'Roles & Access' },
    { id: 'friends', label: 'Friends' },
    { id: 'appearance', label: 'Interface' },
  ] as const;

  // --- HANDLERS ---

  const onUpdateUsername: SubmitHandler<UsernameForm> = async (data) => {
    try {
      await updateUsername({ new_username: data.username });
      setIsEditingUsername(false);
      setStatus({ type: 'success', message: 'Username updated', target: 'username' });
    } catch {
      setStatus({ type: 'error', message: 'Username already taken or invalid', target: 'username' });
    }
  };

  const onUpdateEmail: SubmitHandler<EmailForm> = async (data) => {
    try {
      await updateEmail({ new_email: data.newEmail });
      setIsEditingEmail(false);
      setStatus({ type: 'success', message: 'Email updated', target: 'email' });
    } catch {
      setStatus({ type: 'error', message: 'Email already taken or invalid', target: 'email' });
    }
  };

  const onUpdatePassword: SubmitHandler<PasswordForm> = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match', target: 'password' });
      return;
    }
    try {
      await updatePassword({ 
        old_password: data.currentPassword || "", 
        new_password: data.newPassword 
      });
      resetPassword();
      setIsEditingPassword(false);
      setStatus({ type: 'success', message: user?.has_password ? 'Password rotated successfully' : 'Password set successfully', target: 'password' });
      
      // Update local state to reflect that user now has a password
      if (user) {
        useAppStore.getState().setUser({ ...user, has_password: true });
      }
    } catch (error) {
      const message = await getApiErrorMessage(error, 'Failed to set password');
      setStatus({ type: 'error', message, target: 'password' });
    }
  };

  const onDeleteAccount = async () => {
    if (deleteConfirmationText !== user?.username) {
      setStatus({ type: 'error', message: 'Confirmation username mismatch', target: 'account' });
      return;
    }

    const refreshToken = useAppStore.getState().refreshToken;
    if (!refreshToken) {
      setStatus({ type: 'error', message: 'Authentication session expired', target: 'account' });
      return;
    }

    try {
      await deleteAccount({ refresh_token: refreshToken });
    } catch {
      setStatus({ type: 'error', message: 'Account termination failed', target: 'account' });
    }
  };

  const handleMfaToggle = async () => {
    if (!is2FAEnabled) {
      try {
        const response = await enableMfa('TOTP');
        setStatus({ type: 'success', message: `MFA Seed: ${response.secret_base32}`, target: 'mfa' });
        if (user) {
          useAppStore.getState().setUser({ ...user, mfa_enabled: true });
        }
      } catch {
        setStatus({ type: 'error', message: 'MFA activation failed', target: 'mfa' });
      }
    } else {
      try {
        await disableMfa();
        setStatus({ type: 'success', message: 'MFA deactivated successfully', target: 'mfa' });
        if (user) {
          useAppStore.getState().setUser({ ...user, mfa_enabled: false });
        }
      } catch {
        setStatus({ type: 'error', message: 'MFA deactivation failed', target: 'mfa' });
      }
    }
  };

  const handleUnlink = async (provider: 'google' | 'github') => {
    try {
      await unlinkProvider(provider);
      setStatus({ type: 'success', message: `${provider} unlinked successfully`, target: 'mfa' });
    } catch {
      setStatus({ type: 'error', message: `Failed to unlink ${provider}`, target: 'mfa' });
    }
  };

  const onSaveTheme = async (t: string) => {
    updateThemeStore({ name: t });
    await updateThemeApi({
      theme: {
        name: t,
        is_preset: true,
        font_main: useAppStore.getState().font,
        font_display: useAppStore.getState().displayFont,
        colors: useAppStore.getState().customColors
      }
    });
    // The profile in the store will be updated by useProfile's onSuccess 
    // but we can also manually refresh it for certainty.
    await refreshProfile();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadPicture(file);
    }
  };

  const onRequestRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (hasRoleAccess(profile?.roles, requestedRole)) {
      setStatus({ type: 'error', message: 'You already have all permissions for this role', target: 'role' });
      return;
    }

    if (roleRequests.some((request) => (
      request.requested_role.toLowerCase() === requestedRole.toLowerCase() &&
      (request.status || 'pending').toLowerCase() === 'pending'
    ))) {
      setStatus({ type: 'error', message: 'A pending request already exists for this role', target: 'role' });
      return;
    }

    try {
      await requestRole({ requested_role: requestedRole, reason: requestReason });
      setRequestedRole('');
      setRequestReason('');
      setStatus({ type: 'success', message: 'Role request sent for review', target: 'role' });
    } catch (error) {
      const message = await getApiErrorMessage(error, 'Role request failed');
      setStatus({ type: 'error', message, target: 'role' });
    }
  };

  const onSearchFriends = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = friendSearchQuery.trim();

    if (query.length < 2) {
      setFriendSearchResults([]);
      return;
    }

    setIsSearchingFriends(true);
    try {
      const result = await userApi.searchUsers(query);
      setFriendSearchResults(result.users);
    } catch {
      setStatus({ type: 'error', message: 'Unable to search users', target: 'friends' });
    } finally {
      setIsSearchingFriends(false);
    }
  };

  const formatRoleRequestDate = (value?: string | null) => {
    if (!value) return 'unknown';

    const dotTimestamp = value.match(/^(\d+)\.(\d+)$/);
    const date = dotTimestamp
      ? new Date(Number(dotTimestamp[1]) * 1000)
      : new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const roleStatusClass = (status?: string) => {
    const normalizedStatus = status?.toLowerCase();

    if (normalizedStatus === 'approved') return 'border-main/30 bg-main/10 text-main';
    if (normalizedStatus === 'rejected') return 'border-error/30 bg-error/10 text-error';
    if (normalizedStatus === 'canceled') return 'border-sub/30 bg-sub-alt/10 text-sub';

    return 'border-sub/20 bg-sub-alt/10 text-sub';
  };

  const filteredRoleRequests = useMemo(() => {
    if (roleRequestFilter === 'all') return roleRequests;

    return roleRequests.filter((request) => (request.status || 'pending').toLowerCase() === roleRequestFilter);
  }, [roleRequestFilter, roleRequests]);

  const visibleRoleRequests = filteredRoleRequests.slice(0, visibleRoleRequestCount);
  const hasMoreRoleRequests = visibleRoleRequests.length < filteredRoleRequests.length;
  const highestRole = getHighestRole(profile?.roles);
  const selectedRoleHasAccess = requestedRole !== '' && hasRoleAccess(profile?.roles, requestedRole);
  const selectedRoleHasPendingRequest = requestedRole !== '' && roleRequests.some((request) => (
    request.requested_role.toLowerCase() === requestedRole.toLowerCase() &&
    (request.status || 'pending').toLowerCase() === 'pending'
  ));
  const allRequestableRolesCovered = requestableRoles.every((role) => hasRoleAccess(profile?.roles, role));
  const canSubmitRoleRequest = requestedRole !== '' &&
    !selectedRoleHasAccess &&
    !selectedRoleHasPendingRequest;

  if (isLoading) return <div className="p-10 pt-16 text-center uppercase font-bold tracking-widest animate-pulse">Initializing Data Stream...</div>;

  const { theme, font, displayFont, customColors } = useAppStore.getState();

  return (
    <div className="mx-auto mt-6 flex min-h-[calc(100vh-128px)] w-full max-w-[1000px] flex-col overflow-visible px-4 pb-8 pt-4 font-main text-text sm:px-6 sm:pb-10 lg:h-[calc(100vh-128px)] lg:overflow-hidden lg:px-0">

      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-10 border-b border-main/10 pb-6 sm:pb-8 shrink-0">
        <div ref={photoMenuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsPhotoMenuOpen((current) => !current)}
            className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-sub-alt/20 border-2 border-main/20 flex items-center justify-center shadow-inner overflow-hidden"
            aria-label="Profile picture actions"
          >
            {isUploading ? (
              <div className="absolute inset-0 bg-bg/80 z-30 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-main border-t-transparent rounded-full animate-spin" />
              </div>
            ) : null}
            
            {profile?.profile_picture_url ? (
              <img src={profile.profile_picture_url} alt="Profile" className="w-full h-full object-cover z-10" />
            ) : (
              <div className="w-full h-full bg-main/10 flex items-center justify-center text-main font-bold">
                {user?.username?.[0]?.toUpperCase()}
              </div>
            )}
            
            {!isUploading && (
              <div className="absolute inset-0 bg-bg/60 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[8px] font-bold text-main uppercase text-center px-2">Photo</span>
              </div>
            )}
          </button>
          <input id="profile-photo-input" type="file" className="hidden" onChange={onFileChange} accept="image/*" />
          {isPhotoMenuOpen && !isUploading && (
            <div className="absolute left-0 top-full z-40 mt-2 w-40 overflow-hidden rounded-lg border border-main/10 bg-bg shadow-2xl shadow-black/30">
              <label
                htmlFor="profile-photo-input"
                onClick={() => setIsPhotoMenuOpen(false)}
                className="block cursor-pointer px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-sub transition-colors hover:bg-main/5 hover:text-main"
              >
                Upload
              </label>
              {profile?.profile_picture_url && (
                <button
                  type="button"
                  onClick={async () => {
                    setIsPhotoMenuOpen(false);
                    await removePicture();
                  }}
                  className="block w-full px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-error/70 transition-colors hover:bg-error/5 hover:text-error"
                >
                  Remove
                </button>
              )}
            </div>
          )}
        </div>
        <div className="min-w-0 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h1 className="break-words font-display text-2xl font-bold italic uppercase leading-tight text-text sm:text-3xl">{user?.username}</h1>
          </div>
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-1">
            {highestRole && (
              <span className="text-bg bg-main px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">
                {highestRole}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-start flex-1 min-h-0 overflow-visible lg:overflow-hidden pb-8 sm:pb-10">

        {/* --- SIDEBAR --- */}
        <aside className="w-full md:w-64 flex md:flex-col gap-2 md:gap-1 shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`shrink-0 md:shrink text-left px-4 sm:px-5 py-3 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200
                ${activeSection === item.id
                  ? 'bg-main text-bg shadow-lg shadow-main/10 md:translate-x-1'
                  : 'text-sub hover:bg-main/10 hover:text-text'}`}
            >
              {item.label}
            </button>
          ))}

          <div className="hidden md:flex mt-8 pt-6 border-t border-main/10 px-2 flex-col gap-4">
            <button 
              onClick={() => logout()}
              className="text-left text-[10px] uppercase tracking-widest text-sub-alt font-bold hover:text-main transition-opacity"
            >
              Logout
            </button>
          </div>
        </aside>
        <button
          onClick={() => logout()}
          className="md:hidden text-left text-[10px] uppercase tracking-widest text-sub-alt font-bold hover:text-main transition-opacity"
        >
          Logout
        </button>

        {/* --- MAIN CONTENT --- */}
        <main className="w-full min-w-0 flex-1 lg:h-full overflow-visible lg:overflow-y-auto lg:pr-4 scrollbar-thin scrollbar-thumb-main/20 scrollbar-track-transparent">
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-12 sm:pb-20 max-w-2xl">

            {/* SECTION: AUTH (AUTH SERVICE) */}
            {activeSection === 'auth' && (
              <div className="space-y-12">
                <section>
                  <h3 className="text-xl font-display font-bold text-text mb-8 italic tracking-tight">Security Credentials</h3>
                  
                  <div className="space-y-6">
                    {/* Username Update */}
                    <form onSubmit={handleUsernameSubmit(onUpdateUsername)} className="grid gap-4 p-4 sm:p-6 bg-sub-alt/5 border border-main/10 rounded-lg relative group">
                       <Input 
                        label="Terminal Username" 
                        {...regUsername("username")} 
                        readOnly={!isEditingUsername}
                        onClick={() => setIsEditingUsername(true)}
                        className={!isEditingUsername ? "cursor-pointer hover:border-main/30 transition-colors" : ""}
                      />
                      {status?.target === 'username' && <StatusDisplay type={status.type} message={status.message} />}
                      {isEditingUsername && (
                        <div className="flex flex-col sm:flex-row gap-2 animate-in slide-in-from-top-2">
                          <Button type="submit" variant="primary" className="w-full sm:w-auto">Save username</Button>
                          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={(e) => { 
                            e.stopPropagation(); 
                            setIsEditingUsername(false); 
                            resetUsername({ username: user?.username });
                          }}>Cancel</Button>
                        </div>
                      )}
                    </form>

                    {/* Email Update with Click-to-Edit */}
                    <form onSubmit={handleEmailSubmit(onUpdateEmail)} className="grid gap-4 p-4 sm:p-6 bg-sub-alt/5 border border-main/10 rounded-lg relative">
                      <Input 
                        label="Encryption Email" 
                        {...regEmail("newEmail")} 
                        readOnly={!isEditingEmail}
                        onClick={() => setIsEditingEmail(true)}
                        className={!isEditingEmail ? "cursor-pointer hover:border-main/30 transition-colors" : ""}
                      />
                      {status?.target === 'email' && <StatusDisplay type={status.type} message={status.message} />}
                      {isEditingEmail && (
                        <div className="flex flex-col sm:flex-row gap-2 animate-in slide-in-from-top-2">
                          <Button type="submit" variant="primary" className="w-full sm:w-auto">Save email</Button>
                          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={(e) => { 
                            e.stopPropagation(); 
                            setIsEditingEmail(false); 
                            resetEmail({ newEmail: user?.email });
                          }}>Cancel</Button>
                        </div>
                      )}
                    </form>

                    {/* Password Update with Confirmation */}
                    <form onSubmit={handlePasswordSubmit(onUpdatePassword)} className="grid gap-4 p-4 sm:p-6 bg-sub-alt/5 border border-main/10 rounded-lg">
                      {!isEditingPassword ? (
                        <Input 
                          label={user?.has_password ? "Security Password" : "Set Security Password"} 
                          type="password" 
                          value="********" 
                          readOnly 
                          onClick={() => setIsEditingPassword(true)}
                          className="cursor-pointer hover:border-main/30 transition-colors"
                        />
                      ) : (
                        <div className="space-y-4 animate-in slide-in-from-top-2">
                          {user?.has_password && (
                            <Input label="Current Password" type="password" {...regPassword("currentPassword")} required />
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input label="New Password" type="password" {...regPassword("newPassword")} required />
                            <Input label="Confirm New Password" type="password" {...regPassword("confirmPassword")} required />
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button type="submit" variant="primary" className="w-full sm:w-auto">
                              {user?.has_password ? "Update password" : "Set password"}
                            </Button>
                            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => { setIsEditingPassword(false); resetPassword(); }}>Cancel</Button>
                          </div>
                        </div>
                      )}
                      {status?.target === 'password' && <StatusDisplay type={status.type} message={status.message} />}
                    </form>
                  </div>
                </section>

                <section className="pt-10 border-t border-main/10">
                  <h4 className="text-[10px] font-bold text-sub uppercase mb-6 font-mono tracking-widest italic opacity-60">Authentication Layers</h4>
                  <div className="p-4 sm:p-6 bg-sub-alt/5 border border-main/10 rounded-lg flex items-center justify-between gap-4 shadow-inner">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text uppercase">Multi-Factor Authentication</p>
                      {status?.target === 'mfa' && <StatusDisplay type={status.type} message={status.message} />}
                    </div>
                    <button 
                      onClick={handleMfaToggle} 
                      className={`w-11 h-6 rounded-full transition-all relative border-2 shrink-0 ${is2FAEnabled ? 'bg-main border-main' : 'bg-transparent border-sub/30'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${is2FAEnabled ? 'left-6 bg-bg' : 'left-0.5 bg-sub/50'}`} />
                    </button>
                  </div>
                </section>

                <section className="pt-10 border-t border-main/10">
                  <h4 className="text-[10px] font-bold text-sub uppercase mb-6 font-mono opacity-60 italic">Identity Providers</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* GitHub Provider */}
                    {linkedProviders.find(p => p.name === 'github') ? (
                      <div className="flex items-center justify-between gap-3 p-4 bg-main/5 border-2 border-main rounded-lg animate-in zoom-in-95 min-w-0">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <GithubCircle className="w-6 h-6 text-main" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-main uppercase tracking-widest">Linked</p>
                            <p className="text-text font-mono italic text-[11px] break-all">
                              {linkedProviders.find(p => p.name === 'github')?.provider_id}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUnlink('github')}
                          disabled={isUnlinking}
                          className="text-[10px] font-bold text-main/50 hover:text-error uppercase tracking-widest transition-colors shrink-0"
                        >
                          Unlink
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => getOAuthUrl('github')}
                        disabled={isLoadingProviders}
                        className="flex items-center gap-4 p-4 border-2 border-sub/20 rounded-lg hover:border-main/50 transition-all group text-left disabled:opacity-50"
                      >
                        <GithubCircle className="w-6 h-6 text-sub group-hover:text-main" />
                        <div>
                          <p className="text-[10px] font-bold text-sub uppercase group-hover:text-main tracking-widest">Available</p>
                          <p className="text-sm text-sub group-hover:text-text font-bold uppercase">Connect GitHub</p>
                        </div>
                      </button>
                    )}

                    {/* Google Provider */}
                    {linkedProviders.find(p => p.name === 'google') ? (
                      <div className="flex items-center justify-between gap-3 p-4 bg-main/5 border-2 border-main rounded-lg animate-in zoom-in-95 min-w-0">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <GoogleCircle className="w-6 h-6 text-main" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-main uppercase tracking-widest">Linked</p>
                            <p className="text-text font-mono italic text-[11px] break-all">
                              {linkedProviders.find(p => p.name === 'google')?.provider_id}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUnlink('google')}
                          disabled={isUnlinking}
                          className="text-[10px] font-bold text-main/50 hover:text-error uppercase tracking-widest transition-colors shrink-0"
                        >
                          Unlink
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => getOAuthUrl('google')}
                        disabled={isLoadingProviders}
                        className="flex items-center gap-4 p-4 border-2 border-sub/20 rounded-lg hover:border-main/50 transition-all group text-left disabled:opacity-50"
                      >
                        <GoogleCircle className="w-6 h-6 text-sub group-hover:text-main" />
                        <div>
                          <p className="text-[10px] font-bold text-sub uppercase group-hover:text-main tracking-widest">Available</p>
                          <p className="text-sm text-sub group-hover:text-text font-bold uppercase">Connect Google</p>
                        </div>
                      </button>
                    )}
                  </div>
                </section>

                <section className="pt-10 border-t border-error/20">
                  <h4 className="text-[10px] font-bold text-error uppercase mb-6 font-mono tracking-widest italic opacity-60">Danger Zone</h4>
                  <div className="p-4 sm:p-6 bg-error/5 border border-error/20 rounded-lg">
                    {!showDeleteConfirm ? (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-text uppercase">Terminate Account</p>
                          <p className="text-[10px] text-sub uppercase mt-1">This action is irreversible. All data will be purged.</p>
                        </div>
                        <Button variant="outline" className="w-full sm:w-auto border-error/30 text-error hover:bg-error/10" onClick={() => setShowDeleteConfirm(true)}>
                          Delete account
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <p className="text-[10px] font-bold text-error uppercase tracking-widest">
                          Type <span className="underline">{user?.username}</span> to confirm deletion:
                        </p>
                        <Input 
                          placeholder="Confirm username..." 
                          value={deleteConfirmationText}
                          onChange={(e) => setDeleteConfirmationText(e.target.value)}
                          className="border-error/50 focus:border-error"
                        />
                        {status?.target === 'account' && <StatusDisplay type={status.type} message={status.message} />}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button 
                            variant="primary" 
                            className="flex-1 border-error bg-error text-bg hover:bg-error/80"
                            onClick={onDeleteAccount}
                          >
                            Delete
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmationText(''); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* SECTION: ROLES (ROLE SERVICE) */}
            {activeSection === 'roles' && (
              <div className="space-y-12">
                <section>
                  <h3 className="text-xl font-display font-bold text-text mb-8 italic tracking-tight">Access Authority</h3>
                  <div className="grid gap-6">
                    <div className="p-4 sm:p-6 bg-sub-alt/5 border border-main/10 rounded-lg">
                      <p className="text-[10px] uppercase text-sub font-bold tracking-[0.2em] mb-4">Active Roles</p>
                      <div className="flex flex-wrap gap-2">
                        {profile?.roles?.length ? (
                          profile.roles.map(role => {
                            const canLeaveRole = role.toLowerCase() !== 'user';

                            return (
                              <span key={role} className="inline-flex items-center gap-2 px-2 py-1 bg-main text-bg rounded text-[10px] font-bold uppercase tracking-widest">
                                {role}
                                {canLeaveRole && (
                                  <button
                                    type="button"
                                    onClick={() => setLeaveRoleTarget(role)}
                                    className="text-bg/60 hover:text-bg transition-colors"
                                    title={`Leave ${role}`}
                                  >
                                    x
                                  </button>
                                )}
                              </span>
                            );
                          })
                        ) : (
                          <p className="text-[10px] text-sub uppercase font-bold tracking-widest">No active role returned by api-gateway</p>
                        )}
                      </div>
                    </div>

                    <div className="p-4 sm:p-6 bg-sub-alt/5 border border-main/10 rounded-lg">
                      <p className="text-[10px] uppercase text-sub font-bold tracking-[0.2em] mb-4">What this role lets you do</p>
                      {isError ? (
                        <p className="text-[10px] text-error uppercase font-bold tracking-widest">Unable to load profile permissions</p>
                      ) : (
                        <div className="grid gap-3">
                          {profile?.permissions?.length ? (
                            profile.permissions.map(perm => {
                              const permission = describePermission(perm);

                              return (
                                <div key={perm} className="rounded-lg border border-main/15 bg-main/5 px-4 py-3">
                                  <p className="text-sm font-bold text-main">{permission.title}</p>
                                  <p className="mt-1 text-xs leading-5 text-text/75">{permission.description}</p>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-[10px] text-sub uppercase font-bold tracking-widest">No permission assigned yet</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="p-4 sm:p-6 bg-sub-alt/5 border border-main/10 rounded-lg">
                      <p className="text-[10px] uppercase text-sub font-bold tracking-[0.2em] mb-4">Access catalog</p>
                      {isPermissionsLoading ? (
                        <p className="text-[10px] text-sub uppercase font-bold tracking-widest animate-pulse">Loading from api-gateway...</p>
                      ) : isPermissionsError ? (
                        <p className="text-[10px] text-error uppercase font-bold tracking-widest">Unable to load permission catalog</p>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {availablePermissions.map(perm => {
                            const permission = describePermission(perm);
                            const isEnabled = profile?.permissions?.includes(perm);

                            return (
                              <div
                                key={perm}
                                className={`rounded-lg border px-4 py-3 ${
                                  isEnabled
                                    ? 'border-main/20 bg-main/10'
                                    : 'border-sub/20 bg-transparent opacity-65'
                                }`}
                              >
                                <p className={`text-sm font-bold ${isEnabled ? 'text-main' : 'text-sub'}`}>
                                  {permission.title}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-text/70">{permission.description}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="pt-10 border-t border-main/10">
                  <h4 className="text-[10px] font-bold text-sub uppercase mb-6 font-mono tracking-widest italic opacity-60">Request Role Elevation</h4>
                  <form onSubmit={onRequestRole} className="grid gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-sub uppercase tracking-widest ml-1">Desired Role</label>
                      <select 
                        value={requestedRole}
                        onChange={(e) => setRequestedRole(e.target.value)}
                        className="w-full bg-bg border-2 border-sub/20 rounded-lg px-4 py-3 text-sm text-text focus:border-main transition-all outline-none"
                        required
                      >
                        <option value="">Select a role...</option>
                        {requestableRoles.map((role) => {
                          const hasRole = profile?.roles?.some((activeRole) => activeRole.toLowerCase() === role);
                          const hasAccess = hasRoleAccess(profile?.roles, role);
                          const hasPendingRequest = roleRequests.some((request) => (
                            request.requested_role.toLowerCase() === role &&
                            (request.status || 'pending').toLowerCase() === 'pending'
                          ));

                          return (
                            <option key={role} value={role} disabled={hasAccess || hasPendingRequest}>
                              {role === 'admin' ? 'Administrator' : 'Moderator'}
                              {hasRole ? ' - already active' : ''}
                              {!hasRole && hasAccess ? ' - already has all permissions' : ''}
                              {hasPendingRequest ? ' - pending' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    {allRequestableRolesCovered && (
                      <p className="rounded-lg border border-main/20 bg-main/5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-main">
                        You already have all permissions.
                      </p>
                    )}
                    {requestedRole && !canSubmitRoleRequest && (
                      <p className="text-[10px] text-sub uppercase font-bold tracking-widest">
                        {selectedRoleHasAccess
                          ? 'You already have all permissions for this role.'
                          : 'This role is already waiting for review.'}
                      </p>
                    )}
                    <Input 
                      label="Justification" 
                      placeholder="Why do you need these permissions?" 
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      required
                    />
                    {status?.target === 'role' && <StatusDisplay type={status.type} message={status.message} />}
                    <Button type="submit" variant="outline" disabled={isRequestingRole || !canSubmitRoleRequest}>
                      {isRequestingRole ? 'Submitting...' : 'Submit'}
                    </Button>
                  </form>
                </section>

                <section className="pt-10 border-t border-main/10">
                  <h4 className="text-[10px] font-bold text-sub uppercase mb-6 font-mono tracking-widest italic opacity-60">Role Request History</h4>
                  <div className="flex gap-2 mb-5 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0">
                    {(['all', 'pending', 'approved', 'rejected', 'canceled'] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setRoleRequestFilter(filter)}
                        className={`shrink-0 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all ${
                          roleRequestFilter === filter
                            ? 'border-main bg-main text-bg'
                            : 'border-sub/20 text-sub hover:border-main/40 hover:text-main'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-4">
                    {isRoleRequestsLoading ? (
                      <div className="p-4 sm:p-6 bg-sub-alt/5 border border-main/10 rounded-lg text-[10px] text-sub uppercase font-bold tracking-widest animate-pulse">
                        Loading your role requests...
                      </div>
                    ) : isRoleRequestsError ? (
                      <div className="p-4 sm:p-6 bg-error/5 border border-error/20 rounded-lg text-[10px] text-error uppercase font-bold tracking-widest">
                        Unable to load your role request history
                      </div>
                    ) : filteredRoleRequests.length === 0 ? (
                      <div className="p-4 sm:p-6 bg-sub-alt/5 border border-main/10 rounded-lg text-[10px] text-sub uppercase font-bold tracking-widest">
                        No role request found for this filter
                      </div>
                    ) : (
                      <>
                        {visibleRoleRequests.map((request) => (
                          <article key={request.request_id} className="p-4 sm:p-5 bg-sub-alt/5 border border-main/10 rounded-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-1 bg-main/10 border border-main/20 text-main rounded text-[10px] font-mono">
                                  {request.requested_role}
                                </span>
                                <span className={`px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-widest ${roleStatusClass(request.status)}`}>
                                  {request.status || 'pending'}
                                </span>
                              </div>
                              <span className="text-[10px] text-sub font-mono uppercase">
                                {formatRoleRequestDate(request.updated_at || request.created_at)}
                              </span>
                            </div>
                            <p className="mt-4 text-sm text-text leading-relaxed">
                              {request.reason}
                            </p>
                            {request.status?.toLowerCase() === 'rejected' && (
                              <div className="mt-4 rounded-lg border border-error/20 bg-error/5 p-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-error mb-2">Rejection Reason</p>
                                <p className="text-sm text-text leading-relaxed">
                                  {request.rejection_reason || 'No rejection reason provided.'}
                                </p>
                              </div>
                            )}
                            {(request.status || 'pending').toLowerCase() === 'pending' && (
                              <div className="mt-4 flex justify-stretch sm:justify-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={isCancelingRoleRequest}
                                  onClick={() => setCancelRequestTarget({
                                    requestId: request.request_id,
                                    role: request.requested_role,
                                  })}
                                  className="w-full sm:w-auto border-error/40 text-error hover:bg-error/10 text-[10px] uppercase tracking-widest"
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </article>
                        ))}
                        {hasMoreRoleRequests && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setVisibleRoleRequestCount((count) => count + ROLE_REQUEST_PAGE_SIZE)}
                            className="text-[10px] uppercase tracking-widest"
                          >
                            Load More
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* SECTION: FRIENDS (USER SERVICE) */}
            {activeSection === 'friends' && (
              <div className="space-y-12">
                <section>
                  <h3 className="text-xl font-display font-bold text-text mb-8 italic tracking-tight">Friends Presence</h3>
                  {status?.target === 'friends' && <StatusDisplay type={status.type} message={status.message} />}
                  <form onSubmit={onSearchFriends} className="mb-8 grid gap-3 rounded-lg border border-main/10 bg-sub-alt/5 p-4 sm:p-5">
                    <Input
                      label="Find users"
                      value={friendSearchQuery}
                      onChange={(event) => setFriendSearchQuery(event.target.value)}
                      placeholder="Search by username or email"
                    />
                    <div className="flex justify-end">
                      <Button type="submit" variant="outline" disabled={isSearchingFriends || friendSearchQuery.trim().length < 2}>
                        {isSearchingFriends ? 'Searching...' : 'Search'}
                      </Button>
                    </div>
                    {friendSearchResults.length > 0 && (
                      <div className="grid gap-3 border-t border-main/10 pt-4">
                        {friendSearchResults.map((result) => {
                          const alreadyPending = result.friendship_status === 'pending';
                          const alreadyAccepted = result.friendship_status === 'accepted';

                          return (
                            <div key={result.id} className="flex flex-col gap-3 rounded-lg border border-main/10 bg-bg/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex min-w-0 items-center gap-3">
                                {result.profile_picture_url ? (
                                  <img src={result.profile_picture_url} alt={result.username} className="h-9 w-9 rounded-lg border border-sub/30 object-cover" />
                                ) : (
                                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-sub/30 bg-main/10 text-sm font-bold text-main">
                                    {result.username[0]?.toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-text">{result.username}</p>
                                  <p className="truncate text-[10px] font-mono text-sub">{result.email}</p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={isSendingFriendRequest || alreadyPending || alreadyAccepted}
                                onClick={async () => {
                                  try {
                                    await sendFriendRequest(result.id);
                                    setFriendSearchResults((items) => items.map((item) => (
                                      item.id === result.id ? { ...item, friendship_status: 'pending' } : item
                                    )));
                                    setStatus({ type: 'success', message: 'Friend request sent', target: 'friends' });
                                  } catch {
                                    setStatus({ type: 'error', message: 'Unable to send friend request', target: 'friends' });
                                  }
                                }}
                                className="text-[10px] uppercase tracking-widest"
                              >
                                {alreadyAccepted ? 'Friend' : alreadyPending ? 'Pending' : 'Add'}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </form>
                  <div className="grid gap-4">
                    {isFriendsLoading ? (
                      <div className="p-4 sm:p-6 bg-sub-alt/5 border border-main/10 rounded-lg text-[10px] text-sub uppercase font-bold tracking-widest animate-pulse">
                        Loading friends...
                      </div>
                    ) : isFriendsError ? (
                      <div className="p-4 sm:p-6 bg-error/5 border border-error/20 rounded-lg text-[10px] text-error uppercase font-bold tracking-widest">
                        Unable to load friends
                      </div>
                    ) : friends.length === 0 ? (
                      <div className="p-4 sm:p-6 bg-sub-alt/5 border border-main/10 rounded-lg text-[10px] text-sub uppercase font-bold tracking-widest">
                        No friends yet. Add contributors from wiki pages.
                      </div>
                    ) : (
                      friends.map((friend) => {
                        const label = friend.friend_username || friend.friend_email || friend.friend_id;
                        const isAccepted = friend.status.toLowerCase() === 'accepted';

                        return (
                          <article key={friend.friend_id} className="flex flex-col gap-4 rounded-lg border border-main/10 bg-sub-alt/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              {friend.profile_picture_url ? (
                                <img src={friend.profile_picture_url} alt={label} className="h-10 w-10 rounded-lg border border-sub/30 object-cover" />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sub/30 bg-main/10 text-sm font-bold text-main">
                                  {label[0]?.toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-text">{label}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <span className={`h-2 w-2 rounded-full ${friend.is_online ? 'bg-main' : 'bg-sub/40'}`} />
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-sub">
                                    {friend.is_online ? 'online' : 'offline'}
                                  </span>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-sub/70">
                                    {friend.status}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                              {friend.can_accept && (
                                <Button
                                  type="button"
                                  variant="primary"
                                  disabled={isAcceptingFriend}
                                  onClick={async () => {
                                    try {
                                      await acceptFriendRequest(friend.friend_id);
                                      setStatus({ type: 'success', message: 'Friend request accepted', target: 'friends' });
                                    } catch {
                                      setStatus({ type: 'error', message: 'Unable to accept friend request', target: 'friends' });
                                    }
                                  }}
                                  className="text-[10px] uppercase tracking-widest"
                                >
                                  Accept
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                disabled={isRemovingFriend}
                                onClick={async () => {
                                  try {
                                    await removeFriend(friend.friend_id);
                                    setStatus({
                                      type: 'success',
                                      message: isAccepted ? 'Friend removed' : 'Friend request removed',
                                      target: 'friends',
                                    });
                                  } catch {
                                    setStatus({ type: 'error', message: 'Unable to remove friend', target: 'friends' });
                                  }
                                }}
                                className="border-error/40 text-error hover:bg-error/10 text-[10px] uppercase tracking-widest"
                              >
                                Remove
                              </Button>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* SECTION: APPEARANCE (USER SERVICE) */}
            {activeSection === 'appearance' && (
              <div className="space-y-12">
                <section>
                  <h3 className="text-xl font-display font-bold text-text mb-8 italic tracking-tight">Visual Interface</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {PRESET_THEMES.map((t) => (
                      <button
                        key={t}
                        onClick={() => { resetCustomColors(); onSaveTheme(t); setShowCustom(false); }}
                        className={`px-4 py-4 border-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all
                          ${theme === t && theme !== 'custom' ? 'border-main text-main bg-main/5 ring-4 ring-main/5' : 'border-sub/10 text-sub hover:border-sub'}`}
                      >
                        {t}
                      </button>
                    ))}
                    <button 
                      onClick={() => {
                        const nextShow = !showCustom;
                        setShowCustom(nextShow);
                        if (nextShow) updateThemeStore({ name: 'custom' });
                      }} 
                      className={`px-4 py-4 border-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${theme === 'custom' ? 'border-main text-main bg-main/5' : 'border-sub/10 text-sub hover:border-sub'}`}
                    >
                      {showCustom ? 'Close' : 'Custom'}
                    </button>
                  </div>

                  {showCustom && (
                    <div className="space-y-6 animate-in slide-in-from-top-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 p-4 sm:p-6 bg-sub-alt/5 border border-main/10 rounded-lg">
                        <ColorOption label="Background" value={customColors['bg']} onChange={(v) => setCustomColor('bg', v)} />
                        <ColorOption label="Main Accent" value={customColors['main']} onChange={(v) => setCustomColor('main', v)} />
                        <ColorOption label="Caret" value={customColors['caret']} onChange={(v) => setCustomColor('caret', v)} />
                        <ColorOption label="Text Primary" value={customColors['text']} onChange={(v) => setCustomColor('text', v)} />
                        <ColorOption label="Sub Color" value={customColors['sub']} onChange={(v) => setCustomColor('sub', v)} />
                        <ColorOption label="Sub Alt" value={customColors['sub-alt']} onChange={(v) => setCustomColor('sub-alt', v)} />
                        <ColorOption label="Error" value={customColors['error']} onChange={(v) => setCustomColor('error', v)} />
                        <ColorOption label="Extra Error" value={customColors['extra-error']} onChange={(v) => setCustomColor('extra-error', v)} />
                      </div>
                      <div className="flex justify-stretch sm:justify-end">
                        <Button variant="primary" className="w-full sm:w-auto" onClick={() => onSaveTheme('custom')}>Save theme</Button>
                      </div>
                    </div>
                  )}
                </section>

                <section className="pt-10 border-t border-main/10">
                  <h4 className="text-[10px] font-bold text-sub uppercase mb-6 font-mono tracking-widest italic opacity-60">Typography Engine</h4>
                  <div className="space-y-6">
                    <div>
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-sub">Text font</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {TEXT_FONTS.map((f) => (
                          <button
                            key={f}
                            onClick={() => updateThemeStore({ font_main: f })}
                            style={{ fontFamily: f }}
                            className={`px-4 py-4 border-2 rounded-lg text-center transition-all ${font === f ? 'border-main text-main bg-main/5 font-bold' : 'border-sub/10 text-sub hover:border-sub'}`}
                          >
                            <p className="text-[10px] tracking-widest uppercase">{f}</p>
                            <p className="mt-2 text-sm">Body preview</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-sub">Display font</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {DISPLAY_FONTS.map((f) => (
                          <button
                            key={f}
                            onClick={() => updateThemeStore({ font_display: f })}
                            style={{ fontFamily: f }}
                            className={`px-4 py-4 border-2 rounded-lg text-center transition-all ${displayFont === f ? 'border-main text-main bg-main/5 font-bold' : 'border-sub/10 text-sub hover:border-sub'}`}
                          >
                            <p className="text-[10px] tracking-widest uppercase">{f}</p>
                            <p className="mt-2 text-lg font-bold italic">Title preview</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-stretch sm:justify-end">
                      <Button variant="primary" className="w-full sm:w-auto" onClick={() => onSaveTheme(theme)}>Save typography</Button>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </main>
      </div>

      {cancelRequestTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-bg/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-lg border border-main/20 bg-bg p-6 shadow-2xl shadow-black/30">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-error">
              Cancel Request
            </p>
            <h3 className="mt-3 font-display text-2xl font-bold italic text-text">
              Cancel {cancelRequestTarget.role} request?
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-sub">
              This will move the request to canceled history. You can submit a new request for this role later.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isCancelingRoleRequest}
                onClick={() => setCancelRequestTarget(null)}
                className="text-[10px] uppercase tracking-widest"
              >
                Keep Request
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={isCancelingRoleRequest}
                onClick={async () => {
                  try {
                    await cancelRoleRequest(cancelRequestTarget.requestId);
                    setCancelRequestTarget(null);
                    setStatus({ type: 'success', message: 'Role request canceled', target: 'role' });
                  } catch {
                    setStatus({ type: 'error', message: 'Unable to cancel role request', target: 'role' });
                  }
                }}
                className="border-error bg-error text-[10px] uppercase tracking-widest text-bg hover:bg-error/80"
              >
                {isCancelingRoleRequest ? 'Canceling...' : 'Confirm Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {leaveRoleTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-bg/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-lg border border-main/20 bg-bg p-6 shadow-2xl shadow-black/30">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-error">
              Leave Role
            </p>
            <h3 className="mt-3 font-display text-2xl font-bold italic text-text">
              Leave {leaveRoleTarget}?
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-sub">
              You will immediately lose the permissions attached to this role. You can request it again later if needed.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isLeavingRole}
                onClick={() => setLeaveRoleTarget(null)}
                className="text-[10px] uppercase tracking-widest"
              >
                Keep Role
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={isLeavingRole}
                onClick={async () => {
                  try {
                    await leaveRole(leaveRoleTarget);
                    setLeaveRoleTarget(null);
                    setStatus({ type: 'success', message: 'Role left successfully', target: 'role' });
                  } catch {
                    setStatus({ type: 'error', message: 'Unable to leave role', target: 'role' });
                  }
                }}
                className="border-error bg-error text-[10px] uppercase tracking-widest text-bg hover:bg-error/80"
              >
                {isLeavingRole ? 'Leaving...' : 'Confirm Leave'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function ColorOption({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between p-3 border border-main/5 rounded-lg bg-bg/50 group hover:border-main/20 transition-colors">
      <span className="text-[9px] font-mono text-sub uppercase tracking-widest font-bold">{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-5 bg-transparent border-none cursor-pointer" />
    </div>
  );
}
