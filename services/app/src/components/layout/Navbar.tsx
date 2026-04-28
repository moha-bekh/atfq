import { Link } from 'react-router-dom'
import { Button } from "../ui/Button"
import { ATFQLogo } from '@/assets/icons/ATFQLogo'
import { useAuthStore } from '@/features/auth/stores/auth.store' // Import du store
import { useLogout } from '@/features/auth/hooks/useLogout' // Import du logout

export function Navbar() {
  // Séparation des sélecteurs pour éviter la boucle infinie (Maximum update depth exceeded)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  
  const { logout } = useLogout();

  return (
    <nav className="sticky top-0 z-50 w-full bg-bg/80 backdrop-blur-md border-main/10">
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
              <div className="flex items-center gap-4">
                {user?.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.username} 
                    className="w-8 h-8 rounded-full border border-main/20"
                  />
                ) : (
                  <span className="text-xs uppercase tracking-widest text-text/60">
                    {user?.username || "Account"}
                  </span>
                )}
                <button 
                  onClick={logout}
                  className="text-[10px] uppercase tracking-tighter text-red-500/50 hover:text-red-500 transition-colors"
                >
                  [ Logout ]
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </nav>
  )
}
