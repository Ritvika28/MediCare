import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Calendar, FileText, Pill, Bell, User, Users, Stethoscope,
  Building2, BarChart3, Settings, MessageSquare, Bot, Menu, LogOut, Moon, Sun, Activity,
  AlertTriangle, Video, Clock, Calculator, HeartPulse, Droplet, MapPin,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { EmergencyButton } from '@/components/EmergencyButton';

const navByRole = {
  patient: [
    { to: '/patient', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/patient/hospitals', icon: Building2, label: 'Find Hospitals' },
    { to: '/doctors', icon: Stethoscope, label: 'Find Doctors' },
    { to: '/patient/appointments', icon: Calendar, label: 'Appointments' },
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

export function DashboardLayout({ role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const navItems = navByRole[role] || [];

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
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6 dark:border-slate-800">
          <Stethoscope className="h-7 w-7 text-teal-600" />
          <span className="font-bold text-teal-700 dark:text-teal-400">MediCare</span>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === `/${role}`}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-medium text-teal-700">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="truncate text-xs capitalize text-slate-500">{user?.role}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 lg:px-8">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Link to={`/${role}/notifications`}>
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 relative">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <Outlet />
          </motion.div>
          {role === 'patient' && <EmergencyButton />}
        </main>
      </div>
    </div>
  );
}
