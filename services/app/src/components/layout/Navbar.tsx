import { Link } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { Button } from "../ui/Button"
import { ATFQLogo } from '@/assets/icons/ATFQLogo'
import { useAppStore } from '@/stores/app.store'
import { useLogout } from '@/features/auth/hooks/useLogout'

export function Navbar() {
  const { 
    isAuthenticated, 
    user, 
    profile, 
    roles 
  } = useAppStore();
  const { logout } = useLogout();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdminOrMod = roles?.some(role => ['admin', 'moderator'].includes(role.toLowerCase()));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full bg-bg/80 backdrop-blur-md border-b border-main/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between p-4 md:px-8">

        {/* LOGO */}
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <ATFQLogo className="text-main w-10 h-10" />
        </Link>

        {/* LINKS */}
        <div className="flex items-center gap-6">
          <Button to="/wiki" variant="outline" className="text-xs px-6 uppercase">
            Wiki
          </Button>

          <div className="flex items-center gap-4">
            {!isAuthenticated ? (
              <Button to="/login" variant="primary" className="text-xs px-6 uppercase">
                Sign in
              </Button>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="group flex items-center gap-3 p-1 rounded-2xl hover:bg-main/5 transition-all"
                >
                  <div className="w-8 h-8 rounded-xl bg-sub-alt/20 border border-main/20 flex items-center justify-center overflow-hidden shrink-0">
                    {profile?.profile_picture_url ? (
                      <img 
                        src={profile.profile_picture_url} 
                        alt={user?.username} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-main uppercase">
                        {user?.username?.[0]}
                      </span>
                    )}
                  </div>
                  <span className="hidden md:block text-xs font-bold uppercase tracking-widest text-text group-hover:text-main transition-colors">
                    {user?.username}
                  </span>
                </button>

                {/* DROPDOWN MENU */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-bg border border-main/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 flex flex-col gap-1">
                      
                      <Link 
                        to="/profile" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-sub hover:text-main hover:bg-main/5 rounded-xl transition-all"
                      >
                        Profile Settings
                      </Link>

                      {isAdminOrMod && (
                        <Link 
                          to="/dashboard" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-main hover:bg-main/10 rounded-xl transition-all"
                        >
                          Terminal Dashboard
                        </Link>
                      )}

                      <div className="h-px bg-main/5 my-1 mx-2" />

                      <button 
                        onClick={() => {
                          setIsDropdownOpen(false);
                          logout();
                        }}
                        className="flex items-center px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-error/60 hover:text-error hover:bg-error/5 rounded-xl transition-all text-left"
                      >
                        Logout Protocol
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </nav>
  )
}
