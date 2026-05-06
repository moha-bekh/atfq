import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAppStore } from '@/stores/app.store';
import { useProfile } from '../hooks/useProfile';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleCircle } from '@/assets/icons/GoogleCircle';
import { GithubCircle } from '@/assets/icons/GithubCircle';

type Section = 'auth' | 'roles' | 'appearance';

export const ProfileView = () => {
  const [activeSection, setActiveSection] = useState<Section>('auth');
  
  const { 
    user, 
    profile, 
    roles,
    permissions,
    theme, 
    font, 
    customColors,
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
    isLoading, 
    isUploading,
    updateTheme: updateThemeApi, 
    uploadPicture, 
    removePicture,
    requestRole, 
    deleteProfile 
  } = useProfile();

  // Forms
  const { register: regUsername, handleSubmit: handleUsernameSubmit } = useForm({
    defaultValues: { username: user?.username }
  });
  const { register: regEmail, handleSubmit: handleEmailSubmit } = useForm({
    defaultValues: { newEmail: user?.email }
  });
  const { register: regPassword, handleSubmit: handlePasswordSubmit, reset: resetPassword } = useForm();

  // UI States
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [requestedRole, setRequestedRole] = useState('');
  const [requestReason, setRequestReason] = useState('');

  const navItems = [
    { id: 'auth', label: 'Authentication' },
    { id: 'roles', label: 'Roles & Access' },
    { id: 'appearance', label: 'Interface' },
  ] as const;

  // --- HANDLERS ---

  const onUpdateUsername = async (data: any) => {
    console.log("Service Auth: Update username", data);
    // Note: Username update might need a separate endpoint in Auth service
    // For now we just simulate success
    setIsEditingUsername(false);
  };

  const onUpdateEmail = async (data: any) => {
    console.log("Service Auth: Update email", data);
    setIsEditingEmail(false);
  };

  const onUpdatePassword = async (data: any) => {
    if (data.newPassword !== data.confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    console.log("Service Auth: Update password", data);
    resetPassword();
    setIsEditingPassword(false);
    alert("Password updated successfully");
  };

  const onSaveTheme = async (t: string) => {
    updateThemeStore({ name: t });
    await updateThemeApi({
      theme: {
        name: t,
        is_preset: true,
        font_main: font,
        colors: customColors
      }
    });
    // The profile in the store will be updated by useProfile's onSuccess 
    // but we can also manually refresh it for certainty.
    await refreshProfile();
  };

  const onDeleteAccount = async () => {
    if (deleteConfirmationText !== user?.username) {
      alert("Confirmation text does not match username");
      return;
    }
    await deleteProfile();
    alert("Protocol Initiated: Account has been scheduled for deletion.");
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadPicture(file);
    }
  };

  if (isLoading) return <div className="p-10 text-center uppercase font-bold tracking-widest animate-pulse">Initializing Data Stream...</div>;

  return (
    <div className="max-w-[1000px] mx-auto pt-10 h-[calc(100vh-80px)] flex flex-col overflow-hidden font-main text-text">

      {/* --- HEADER --- */}
      <div className="flex items-center gap-6 mb-10 border-b border-main/10 pb-8 shrink-0">
        <div className="group relative w-20 h-20 rounded-2xl bg-sub-alt/20 border-2 border-main/20 flex items-center justify-center shadow-inner overflow-hidden">
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
            <label className="absolute inset-0 bg-bg/60 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <span className="text-[8px] font-bold text-main uppercase text-center px-2">Update Photo</span>
              <input type="file" className="hidden" onChange={onFileChange} accept="image/*" />
            </label>
          )}
        </div>
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-display font-bold text-text italic leading-tight uppercase tracking-tighter italic">{user?.username}</h1>
            {profile?.profile_picture_url && !isUploading && (
              <button 
                onClick={async () => {
                  if (confirm("Remove profile picture?")) {
                    await removePicture();
                  }
                }}
                className="text-[10px] uppercase tracking-widest text-error/60 hover:text-error font-bold transition-colors"
              >
                [ REMOVE_PHOTO ]
              </button>
            )}
          </div>
          <div className="flex gap-2 mt-1">
            {profile?.roles?.map(role => (
              <span key={role} className="text-bg bg-main px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">
                {role}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-12 items-start flex-1 overflow-hidden pb-10">

        {/* --- SIDEBAR --- */}
        <aside className="w-full md:w-64 flex flex-col gap-1 shrink-0">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`text-left px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200
                ${activeSection === item.id
                  ? 'bg-main text-bg shadow-lg shadow-main/10 translate-x-1'
                  : 'text-sub hover:bg-main/10 hover:text-text'}`}
            >
              {item.label}
            </button>
          ))}

          <div className="mt-8 pt-6 border-t border-main/10 px-2 flex flex-col gap-4">
            <button 
              onClick={() => logout()}
              className="text-left text-[10px] uppercase tracking-widest text-sub-alt font-bold hover:text-main transition-opacity"
            >
              Logout Protocol
            </button>
          </div>
        </aside>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-1 h-full overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-main/20 scrollbar-track-transparent">
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20 max-w-2xl">

            {/* SECTION: AUTH (AUTH SERVICE) */}
            {activeSection === 'auth' && (
              <div className="space-y-12">
                <section>
                  <h3 className="text-xl font-display font-bold text-text mb-8 italic tracking-tight">Security Credentials</h3>
                  
                  <div className="space-y-6">
                    {/* Username Update */}
                    <form onSubmit={handleUsernameSubmit(onUpdateUsername)} className="grid gap-4 p-6 bg-sub-alt/5 border border-main/10 rounded-2xl relative group">
                       <Input 
                        label="Terminal Username" 
                        {...regUsername("username")} 
                        readOnly={!isEditingUsername}
                        onClick={() => setIsEditingUsername(true)}
                        className={!isEditingUsername ? "cursor-pointer hover:border-main/30 transition-colors" : ""}
                      />
                      {isEditingUsername && (
                        <div className="flex gap-2 animate-in slide-in-from-top-2">
                          <Button type="submit" variant="primary">COMMIT_USERNAME</Button>
                          <Button type="button" variant="outline" onClick={(e) => { e.stopPropagation(); setIsEditingUsername(false); }}>CANCEL</Button>
                        </div>
                      )}
                    </form>

                    {/* Email Update with Click-to-Edit */}
                    <form onSubmit={handleEmailSubmit(onUpdateEmail)} className="grid gap-4 p-6 bg-sub-alt/5 border border-main/10 rounded-2xl relative">
                      <Input 
                        label="Encryption Email" 
                        {...regEmail("newEmail")} 
                        readOnly={!isEditingEmail}
                        onClick={() => setIsEditingEmail(true)}
                        className={!isEditingEmail ? "cursor-pointer hover:border-main/30 transition-colors" : ""}
                      />
                      {isEditingEmail && (
                        <div className="flex gap-2 animate-in slide-in-from-top-2">
                          <Button type="submit" variant="primary">UPDATE_EMAIL</Button>
                          <Button type="button" variant="outline" onClick={(e) => { e.stopPropagation(); setIsEditingEmail(false); }}>CANCEL</Button>
                        </div>
                      )}
                    </form>

                    {/* Password Update with Confirmation */}
                    <form onSubmit={handlePasswordSubmit(onUpdatePassword)} className="grid gap-4 p-6 bg-sub-alt/5 border border-main/10 rounded-2xl">
                      {!isEditingPassword ? (
                        <Input 
                          label="Security Password" 
                          type="password" 
                          value="********" 
                          readOnly 
                          onClick={() => setIsEditingPassword(true)}
                          className="cursor-pointer hover:border-main/30 transition-colors"
                        />
                      ) : (
                        <div className="space-y-4 animate-in slide-in-from-top-2">
                          <Input label="Current Password" type="password" {...regPassword("currentPassword")} required />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input label="New Password" type="password" {...regPassword("newPassword")} required />
                            <Input label="Confirm New Password" type="password" {...regPassword("confirmPassword")} required />
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" variant="primary">ROTATE_CREDENTIALS</Button>
                            <Button type="button" variant="outline" onClick={() => { setIsEditingPassword(false); resetPassword(); }}>CANCEL</Button>
                          </div>
                        </div>
                      )}
                    </form>
                  </div>
                </section>

                <section className="pt-10 border-t border-main/10">
                  <h4 className="text-[10px] font-bold text-sub uppercase mb-6 font-mono tracking-widest italic opacity-60">Authentication Layers</h4>
                  <div className="p-6 bg-sub-alt/5 border border-main/10 rounded-xl flex items-center justify-between shadow-inner">
                    <p className="text-sm font-bold text-text uppercase">Multi-Factor Authentication</p>
                    <button onClick={() => setIs2FAEnabled(!is2FAEnabled)} className={`w-11 h-6 rounded-full transition-all relative border-2 ${is2FAEnabled ? 'bg-main border-main' : 'bg-transparent border-sub/30'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${is2FAEnabled ? 'left-6 bg-bg' : 'left-0.5 bg-sub/50'}`} />
                    </button>
                  </div>
                </section>

                <section className="pt-10 border-t border-main/10">
                  <h4 className="text-[10px] font-bold text-sub uppercase mb-6 font-mono opacity-60 italic">Identity Providers</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 p-4 bg-main/5 border-2 border-main rounded-2xl">
                      <GithubCircle className="w-6 h-6 text-main" />
                      <div>
                        <p className="text-[10px] font-bold text-main uppercase">Linked</p>
                        <p className="text-sm text-text font-mono italic text-[11px]">github/{user?.username}</p>
                      </div>
                    </div>
                    <button className="flex items-center gap-4 p-4 border-2 border-sub/20 rounded-2xl hover:border-main/50 transition-all group text-left">
                      <GoogleCircle className="w-6 h-6 text-sub group-hover:text-main" />
                      <div>
                        <p className="text-[10px] font-bold text-sub uppercase group-hover:text-main tracking-widest">Available</p>
                        <p className="text-sm text-sub group-hover:text-text font-bold">Connect Google</p>
                      </div>
                    </button>
                  </div>
                </section>

                <section className="pt-10 border-t border-error/20">
                  <h4 className="text-[10px] font-bold text-error uppercase mb-6 font-mono tracking-widest italic opacity-60">Danger Zone</h4>
                  <div className="p-6 bg-error/5 border border-error/20 rounded-2xl">
                    {!showDeleteConfirm ? (
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-text uppercase">Terminate Account</p>
                          <p className="text-[10px] text-sub uppercase mt-1">This action is irreversible. All data will be purged.</p>
                        </div>
                        <Button variant="outline" className="border-error/30 text-error hover:bg-error/10" onClick={() => setShowDeleteConfirm(true)}>
                          DELETE_ACCOUNT
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
                        <div className="flex gap-2">
                          <Button 
                            variant="primary" 
                            className="bg-error text-white border-error hover:bg-error/80 flex-1"
                            onClick={onDeleteAccount}
                          >
                            CONFIRM_TERMINATION
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmationText(''); }}
                          >
                            ABORT
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
                  <div className="p-6 bg-sub-alt/5 border border-main/10 rounded-2xl">
                    <p className="text-[10px] uppercase text-sub font-bold tracking-[0.2em] mb-4">Active Permissions</p>
                    <div className="flex flex-wrap gap-2">
                      {profile?.permissions?.map(perm => (
                        <span key={perm} className="px-2 py-1 bg-main/10 border border-main/20 text-main rounded text-[10px] font-mono">
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="pt-10 border-t border-main/10">
                  <h4 className="text-[10px] font-bold text-sub uppercase mb-6 font-mono tracking-widest italic opacity-60">Request Role Elevation</h4>
                  <form onSubmit={async (e) => { 
                    e.preventDefault(); 
                    await requestRole({ requested_role: requestedRole, reason: requestReason });
                    alert("Request sent to Role Service"); 
                  }} className="grid gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-sub uppercase tracking-widest ml-1">Desired Role</label>
                      <select 
                        value={requestedRole}
                        onChange={(e) => setRequestedRole(e.target.value)}
                        className="w-full bg-bg border-2 border-sub/20 rounded-xl px-4 py-3 text-sm text-text focus:border-main transition-all outline-none"
                        required
                      >
                        <option value="">Select a role...</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <Input 
                      label="Justification" 
                      placeholder="Why do you need these permissions?" 
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      required
                    />
                    <Button type="submit" variant="outline">SUBMIT_REQUEST</Button>
                  </form>
                </section>
              </div>
            )}

            {/* SECTION: APPEARANCE (USER SERVICE) */}
            {activeSection === 'appearance' && (
              <div className="space-y-12">
                <section>
                  <h3 className="text-xl font-display font-bold text-text mb-8 italic tracking-tight">Visual Interface</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {['base', 'husqy', 'paper'].map((t) => (
                      <button
                        key={t}
                        onClick={() => { resetCustomColors(); onSaveTheme(t); setShowCustom(false); }}
                        className={`px-4 py-4 border-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all
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
                      className={`px-4 py-4 border-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${theme === 'custom' ? 'border-main text-main bg-main/5' : 'border-sub/10 text-sub hover:border-sub'}`}
                    >
                      {showCustom ? '[ CLOSE ]' : '[ CUSTOM ]'}
                    </button>
                  </div>

                  {showCustom && (
                    <div className="space-y-6 animate-in slide-in-from-top-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 p-6 bg-sub-alt/5 border border-main/10 rounded-2xl">
                        <ColorOption label="Background" value={customColors['bg']} onChange={(v) => setCustomColor('bg', v)} />
                        <ColorOption label="Main Accent" value={customColors['main']} onChange={(v) => setCustomColor('main', v)} />
                        <ColorOption label="Caret" value={customColors['caret']} onChange={(v) => setCustomColor('caret', v)} />
                        <ColorOption label="Text Primary" value={customColors['text']} onChange={(v) => setCustomColor('text', v)} />
                        <ColorOption label="Sub Color" value={customColors['sub']} onChange={(v) => setCustomColor('sub', v)} />
                        <ColorOption label="Sub Alt" value={customColors['sub-alt']} onChange={(v) => setCustomColor('sub-alt', v)} />
                        <ColorOption label="Error" value={customColors['error']} onChange={(v) => setCustomColor('error', v)} />
                        <ColorOption label="Extra Error" value={customColors['extra-error']} onChange={(v) => setCustomColor('extra-error', v)} />
                      </div>
                      <div className="flex justify-end">
                        <Button variant="primary" onClick={() => onSaveTheme('custom')}>SAVE_CUSTOM_THEME</Button>
                      </div>
                    </div>
                  )}
                </section>

                <section className="pt-10 border-t border-main/10">
                  <h4 className="text-[10px] font-bold text-sub uppercase mb-6 font-mono tracking-widest italic opacity-60">Typography Engine</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {['Plus Jakarta Sans', 'JetBrains Mono', 'Bricolage Grotesque'].map((f) => (
                      <button key={f} onClick={() => updateThemeStore({ font_main: f })} style={{ fontFamily: f }} className={`px-4 py-4 border-2 rounded-xl text-center transition-all ${font === f ? 'border-main text-main bg-main/5 font-bold' : 'border-sub/10 text-sub hover:border-sub'}`}>
                        <p className="text-[10px] tracking-widest uppercase">{f.split(' ')[0]}</p>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        </main>
      </div>
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
