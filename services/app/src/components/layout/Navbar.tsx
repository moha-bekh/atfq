import { Link } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { Button } from "../ui/Button"
import { ATFQLogo } from '@/assets/icons/ATFQLogo'
import { useAppStore } from '@/stores/app.store'
import { useLogout } from '@/features/auth/hooks/useLogout'
import { getProfilePictureUrl } from '@/features/user/utils/profilePicture'

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
  const profilePictureUrl = getProfilePictureUrl(profile?.profile_picture_url);

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
    <nav className="sticky top-0 z-50 w-full bg-bg/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-6 sm:px-16 lg:px-24">

        {/* LOGO */}
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <ATFQLogo className="text-main w-12 h-12" />
        </Link>

        {/* LINKS */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Button to="/wiki" variant="outline" className="hidden h-9 px-3 text-base normal-case sm:flex">
            Wiki
          </Button>

          <div className="flex items-center gap-4">
            {!isAuthenticated ? (
              <Button to="/login" variant="primary" className="h-9 px-3 text-base normal-case">
                Sign in
              </Button>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="group flex h-10 items-center gap-3 rounded-lg hover:bg-main/5 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-sub-alt/20 border-2 border-main/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {profilePictureUrl ? (
                      <img 
                        src={profilePictureUrl} 
                        alt={user?.username} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-main uppercase">
                        {user?.username?.[0]}
                      </span>
                    )}
                  </div>
                </button>

                {/* DROPDOWN MENU */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-main/10 bg-bg shadow-2xl shadow-black/40 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-main/10">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-sub">Signed in as</p>
                      <p className="mt-1 truncate text-sm font-bold text-text">{user?.username}</p>
                    </div>
                    <div className="p-2 flex flex-col gap-1">
                      
                      <Link 
                        to="/profile" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center rounded-lg px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-sub transition-all hover:bg-main/5 hover:text-main"
                      >
                        Profile Settings
                      </Link>

                      {isAdminOrMod && (
                        <Link 
                          to="/dashboard" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center rounded-lg px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-main transition-all hover:bg-main/10"
                        >
                          Dashboard
                        </Link>
                      )}

                      <div className="h-px bg-main/5 my-1 mx-2" />

                      <button 
                        onClick={() => {
                          setIsDropdownOpen(false);
                          logout();
                        }}
                        className="flex items-center rounded-lg px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-error/70 transition-all hover:bg-error/5 hover:text-error"
                      >
                        Logout
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
