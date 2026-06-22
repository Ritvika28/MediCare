import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Calendar, FileText, Pill, Bell, User, Users, Stethoscope,
  Building2, BarChart3, Settings, Bot, Menu, LogOut, Moon, Sun, Activity,
  AlertTriangle, Clock, Calculator, HeartPulse, Droplet, MapPin, ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/Button';
import { api } from '@/api/axios';
import { cn } from '@/lib/utils';


const navByRole = {
  patient: [
    { to: '/patient', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/patient/hospitals', icon: Building2, label: 'Find Hospitals' },
    { to: '/doctors', icon: Stethoscope, label: 'Find Doctors' },
    { to: '/patient/records', icon: FileText, label: 'Medical Records' },
    { to: '/patient/prescriptions', icon: Pill, label: 'Prescription Vault' },
    { to: '/patient/medicine-reminder', icon: Clock, label: 'Medicine Reminder' },
    { to: '/patient/health-analytics', icon: BarChart3, label: 'Health Analytics' },
    { to: '/patient/health-calculators', icon: Calculator, label: 'Health Calculators' },
    { to: '/patient/health-risk-assessment', icon: HeartPulse, label: 'Health Risk Assessment' },
    { to: '/patient/blood-banks', icon: Droplet, label: 'Blood Bank Finder' },
    { to: '/patient/nearby-labs', icon: MapPin, label: 'Nearby Labs' },
    { to: '/patient/emergency-hub', icon: AlertTriangle, label: 'Emergency Hub' },
    { to: '/patient/ai-assistant', icon: Bot, label: 'AI Health Assistant' },
    { to: '/patient/profile', icon: User, label: 'Profile' },
    { to: '/patient/notifications', icon: Bell, label: 'Notifications' },
  ],
  doctor: [
    { to: '/doctor', icon: LayoutDashboard, label: 'Overview' },
    { to: '/doctor/appointments', icon: Calendar, label: 'Appointments' },
    { to: '/doctor/queue', icon: Users, label: 'Queue' },
    { to: '/doctor/patients', icon: Users, label: 'Patients' },
    { to: '/doctor/schedule', icon: Activity, label: 'Schedule' },
    { to: '/doctor/profile', icon: User, label: 'Profile' },
  ],
  admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Overview' },
    { to: '/admin/hospitals', icon: Building2, label: 'Hospitals' },
    { to: '/admin/beds', icon: Activity, label: 'Beds' },
    { to: '/admin/emergency', icon: Activity, label: 'Emergency' },
    { to: '/admin/doctors', icon: Stethoscope, label: 'Doctors' },
    { to: '/admin/patients', icon: Users, label: 'Patients' },
    { to: '/admin/departments', icon: Building2, label: 'Departments' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ],
};

// Derive breadcrumbs from the current URL path segments
function useBreadcrumbs(role, navItems) {
  const location = useLocation();
  const segments = location.pathname.replace(/^\//, '').split('/').filter(Boolean);

  const crumbs = [];
  let accumulated = '';

  segments.forEach((seg, idx) => {
    accumulated += `/${seg}`;
    // Try to find a label for this path
    const match = navItems.find((n) => n.to === accumulated);
    const label = match
      ? match.label
      : seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ label, path: accumulated, isLast: idx === segments.length - 1 });
  });

  return crumbs;
}

export function DashboardLayout({ role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const navItems = navByRole[role] || [];
  const breadcrumbs = useBreadcrumbs(role, navItems);
  const location = useLocation();

  // Live unread notification count for the bell badge
  const { data: notifData } = useQuery({
    queryKey: ['notification-summary'],
    queryFn: () => api.get('/notifications', { params: { limit: 1 } }).then(r => r.data),
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled: !!user,
  });
  const unreadCount = notifData?.unreadCount ?? 0;

  // Only show back button when not on the root dashboard page
  const isRoot = location.pathname === `/${role}` || location.pathname === `/${role}/`;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-6 dark:border-slate-800">
          <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-teal-600 shadow">
            <Stethoscope className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-black text-teal-700 dark:text-teal-400 tracking-tight text-lg">MediCare</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-3 overflow-y-auto h-[calc(100vh-8rem)]">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === `/${role}`}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/80'
                )
              }
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-3 px-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 text-sm font-black text-white shadow">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{user?.firstName} {user?.lastName}</p>
              <p className="truncate text-[10px] capitalize text-slate-500 font-semibold">{user?.role}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors rounded-xl text-sm font-semibold" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 lg:px-6">
          {/* Left: Hamburger + Back + Breadcrumbs */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button className="lg:hidden shrink-0" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </button>

            {!isRoot && (
              <button
                onClick={() => navigate(-1)}
                className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-xs font-bold hidden sm:inline">Back</span>
              </button>
            )}

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1 min-w-0 overflow-hidden" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.path} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 shrink-0" />}
                  {crumb.isLast ? (
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      to={crumb.path}
                      className="text-xs font-semibold text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors truncate max-w-[120px]"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
          </div>

          {/* Right: Theme + Bell */}
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl">
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </Button>
            <Link to={`/${role}/notifications`}>
              <Button variant="ghost" size="icon" className="rounded-xl relative">
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow border border-white dark:border-slate-900">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
