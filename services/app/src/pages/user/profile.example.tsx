
import { useState } from 'react'
import { useSettings } from '@/context/SettingsContext'
import { useForm } from 'react-hook-form'
import Button from '@/components/shared/Button'
import Input from '@/components/shared/Input'

import GithubIcon from '@/assets/github.svg?react'
import GoogleIcon from '@/assets/google.svg?react'
import ATFQLogoIcon from '@/assets/atfq-logo.svg?react'

type Section = 'stats' | 'appearance' | 'identity'

export default function Profile() {
  const [activeSection, setActiveSection] = useState<Section>('identity')
  const {
    theme, setTheme,
    font, setFont,
    customColors, setCustomColor, resetCustomColors
  } = useSettings()

  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm({
    defaultValues: {
      username: "moha-bekh",
      email: "moha@gmail.com",
    }
  })

  const [isEditing, setIsEditing] = useState(false)
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [showCustom, setShowCustom] = useState(false)

  const navItems = [
    { id: 'stats', label: 'Terminal Stats' },
    { id: 'appearance', label: 'Interface Theme' },
    { id: 'identity', label: 'Identity & Security' },
  ] as const

  return (
    // h-screen + overflow-hidden sur le container principal empêche la page entière de scroller
    <div className="max-w-[1000px] mx-auto pt-10 h-[calc(100vh-80px)] flex flex-col overflow-hidden font-main">

      {/* --- HEADER (Toujours visible) --- */}
      <div className="flex items-center gap-6 mb-10 border-b border-main/10 pb-8 shrink-0">
        <div className="w-20 h-20 rounded-2xl bg-sub-alt/20 border-2 border-main/20 flex items-center justify-center shadow-inner overflow-hidden relative">
          <ATFQLogoIcon className="w-12 h-12 text-main absolute opacity-20" />
          <img src="/public/moha.png" alt="Profile" className="w-full h-full object-cover z-10" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-text italic leading-tight uppercase tracking-tighter italic">moha-bekh</h1>
          <p className="text-sub font-mono text-[10px] uppercase tracking-[0.4em]">Level: 42</p>
        </div>
      </div>

      {/* --- WRAPPER SIDEBAR + CONTENT (Lui seul définit la zone de scroll) --- */}
      <div className="flex flex-col md:flex-row gap-12 items-start flex-1 overflow-hidden pb-10">

        {/* --- SIDEBAR (Fixe) --- */}
        <aside className="w-full md:w-64 flex flex-col gap-1 shrink-0">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                setIsEditing(false);
              }}
              className={`text-left px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200
                ${activeSection === item.id
                  ? 'bg-main text-bg shadow-lg shadow-main/10 translate-x-1'
                  : 'text-sub hover:bg-main/10 hover:text-text'}`}
            >
              {item.label}
            </button>
          ))}

          <div className="mt-8 pt-6 border-t border-main/10 px-2 flex flex-col gap-4">
            <button className="text-left text-[10px] uppercase tracking-widest text-sub-alt font-bold hover:text-main transition-opacity">
              Logout Protocol
            </button>
            <button className="text-left text-[10px] uppercase tracking-widest text-error/50 font-bold hover:text-error transition-opacity">
              Delete Account
            </button>
          </div>
        </aside>

        {/* --- MAIN CONTENT (SCROLL INTERNE SEULEMENT) --- */}
        <main className="flex-1 h-full overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-main/20 scrollbar-track-transparent">
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20">

            {/* SECTION: STATS */}
            {activeSection === 'stats' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <StatCard label="Average Speed" value="84" unit="WPM" color="text-main" />
                <StatCard label="Input Accuracy" value="98.2" unit="%" color="text-text" />
                <StatCard label="Wiki Commands" value="1,248" color="text-text" />
                <StatCard label="Last Rank" value="S+" color="text-main" />
              </div>
            )}

            {/* SECTION: APPEARANCE */}
            {activeSection === 'appearance' && (
              <div className="space-y-12">
                <section>
                  <h3 className="text-xl font-display font-bold text-text mb-6 italic tracking-tight">Interface Themes</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {['base', 'husqy', 'paper'].map((t) => (
                      <button
                        key={t}
                        onClick={() => { resetCustomColors(); setTheme(t as any); setShowCustom(false); }}
                        className={`px-4 py-4 border-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all
                          ${theme === t && !showCustom ? 'border-main text-main bg-main/5 ring-4 ring-main/5' : 'border-sub/10 text-sub hover:border-sub'}`}
                      >
                        {t}
                      </button>
                    ))}
                    <button onClick={() => setShowCustom(!showCustom)} className={`px-4 py-4 border-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${showCustom ? 'border-main text-main bg-main/5' : 'border-sub/10 text-sub hover:border-sub'}`}>
                      {showCustom ? '[ CLOSE ]' : '[ CUSTOM ]'}
                    </button>
                  </div>

                  {showCustom && (
                    <div className="mt-6 p-6 bg-sub-alt/5 border border-main/10 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                      <ColorOption label="Background" value={customColors.bg} onChange={(v) => setCustomColor('bg', v)} />
                      <ColorOption label="Main Accent" value={customColors.main} onChange={(v) => setCustomColor('main', v)} />
                      <ColorOption label="Text Primary" value={customColors.text} onChange={(v) => setCustomColor('text', v)} />
                      <ColorOption label="Sub Color" value={customColors.sub} onChange={(v) => setCustomColor('sub', v)} />
                      <ColorOption label="Sub Alt" value={customColors['sub-alt']} onChange={(v) => setCustomColor('sub-alt', v)} />
                      <ColorOption label="Error" value={customColors.error} onChange={(v) => setCustomColor('error', v)} />
                      <ColorOption label="Extra Error" value={customColors['extra-error']} onChange={(v) => setCustomColor('extra-error', v)} />
                    </div>
                  )}
                </section>

                {/* Typography reste ici */}
                <section className="pt-10 border-t border-main/10">
                  <h4 className="text-[10px] font-bold text-sub uppercase tracking-[0.2em] mb-6 font-mono italic">Typography Engine</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {['Plus Jakarta Sans', 'JetBrains Mono', 'Bricolage Grotesque'].map((f) => (
                      <button key={f} onClick={() => setFont(f)} style={{ fontFamily: f }} className={`px-4 py-4 border-2 rounded-xl text-center transition-all ${font === f ? 'border-main text-main bg-main/5 font-bold' : 'border-sub/10 text-sub hover:border-sub'}`}>
                        <p className="text-[10px] tracking-widest uppercase">{f.split(' ')[0]}</p>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* SECTION: IDENTITY */}
            {activeSection === 'identity' && (
              <div className="space-y-12">
                <section>
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-display font-bold text-text italic tracking-tight">Identity Security</h3>
                    <button onClick={() => { if (isEditing) reset(); setIsEditing(!isEditing); }} className="text-[10px] uppercase font-bold text-main underline">
                      {isEditing ? '[ CANCEL_UPDATE ]' : '[ EDIT_PROFILE ]'}
                    </button>
                  </div>

                  <form onSubmit={handleSubmit((data) => setIsEditing(false))} className="grid gap-6 max-w-md">
                    <Input label="Terminal Username" readOnly={!isEditing} {...register("username")} className={!isEditing ? "opacity-60" : ""} />
                    <Input label="Encryption Email" readOnly={!isEditing} {...register("email")} className={!isEditing ? "opacity-60" : ""} />

                    {isEditing && (
                      <div className="space-y-6 pt-6 border-t border-main/10 animate-in slide-in-from-top-2">
                        <Input label="Current Password" type="password" placeholder="••••••••" {...register("currentPassword")} />
                        <Input label="New Password" type="password" placeholder="••••••••" {...register("newPassword")} />
                        <Input label="Confirm New Password" type="password" placeholder="••••••••" {...register("confirmPassword")} />
                        <Button type="submit" variant="primary">COMMIT_CHANGES</Button>
                      </div>
                    )}
                  </form>
                </section>

                <section className="pt-10 border-t border-main/10">
                  <h4 className="text-[10px] font-bold text-sub uppercase mb-6 font-mono tracking-widest italic opacity-60">Security Protocol</h4>
                  <div className="p-6 bg-sub-alt/5 border border-main/10 rounded-xl flex items-center justify-between max-w-md shadow-inner">
                    <p className="text-sm font-bold text-text uppercase">Two-Factor Authentication</p>
                    <button onClick={() => setIs2FAEnabled(!is2FAEnabled)} className={`w-11 h-6 rounded-full transition-all relative border-2 ${is2FAEnabled ? 'bg-main border-main' : 'bg-transparent border-sub/30'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${is2FAEnabled ? 'left-6 bg-bg' : 'left-0.5 bg-sub/50'}`} />
                    </button>
                  </div>
                </section>

                <section className="pt-10 border-t border-main/10">
                  <h4 className="text-[10px] font-bold text-sub uppercase mb-6 font-mono opacity-60 italic">Linked Protocols</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 p-4 bg-main/5 border-2 border-main rounded-2xl">
                      <GithubIcon className="w-6 h-6 text-main" />
                      <div>
                        <p className="text-[10px] font-bold text-main uppercase">Verified</p>
                        <p className="text-sm text-text font-mono italic text-[11px]">github/moha-bekh</p>
                      </div>
                    </div>
                    <button className="flex items-center gap-4 p-4 border-2 border-sub/20 rounded-2xl hover:border-main/50 transition-all group">
                      <GoogleIcon className="w-6 h-6 text-sub group-hover:text-main" />
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-sub uppercase group-hover:text-main tracking-widest">Disconnected</p>
                        <p className="text-sm text-sub group-hover:text-text font-bold">Link Google ID</p>
                      </div>
                    </button>
                  </div>
                </section>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function ColorOption({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between p-3 border border-main/5 rounded-lg bg-bg/50 group hover:border-main/20 transition-colors">
      <span className="text-[9px] font-mono text-sub uppercase tracking-widest font-bold">{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-5 bg-transparent border-none cursor-pointer" />
    </div>
  )
}

function StatCard({ label, value, unit, color }: { label: string, value: string, unit?: string, color: string }) {
  return (
    <div className="p-6 bg-sub-alt/5 border border-main/5 rounded-2xl group hover:border-main/20 transition-all">
      <p className="text-[10px] uppercase text-sub font-bold tracking-[0.3em] mb-3 font-mono">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-mono font-bold ${color}`}>{value}</span>
        {unit && <span className="text-xs text-sub font-mono font-bold italic">{unit}</span>}
      </div>
    </div>
  )
}
