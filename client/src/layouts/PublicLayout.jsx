import { Link, Outlet } from 'react-router-dom';
import { Stethoscope, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

export function PublicLayout() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user } = useAuth();

  const dashboardPath = user?.role ? `/${user.role}` : '/patient';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <Stethoscope className="h-7 w-7 text-teal-600" />
            <span className="text-xl font-bold text-teal-700 dark:text-teal-400">MediCare</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/" className="text-sm font-medium hover:text-teal-600">Home</Link>
            <Link to="/about" className="text-sm font-medium hover:text-teal-600">About</Link>
            <Link to="/doctors" className="text-sm font-medium hover:text-teal-600">Doctors</Link>
            <Link to="/contact" className="text-sm font-medium hover:text-teal-600">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            {isAuthenticated ? (
              <Link to={dashboardPath}>
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost">Login</Button></Link>
                <Link to="/signup"><Button>Sign Up</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>
      <Outlet />
      <footer className="border-t border-slate-200 bg-slate-50 py-12 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} MediCare Hospital Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
