import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';

export function EmergencyButton() {
  const location = useLocation();

  // Hide the floating button if the user is already on the emergency page
  if (location.pathname === '/patient/emergency') {
    return null;
  }

  return (
    <Link to="/patient/emergency" className="fixed bottom-6 right-6 z-50">
      <Button
        variant="destructive"
        className="rounded-full shadow-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform duration-300 bg-red-600 hover:bg-red-700 animate-pulse border-2 border-white dark:border-slate-800 h-12 px-5"
      >
        <AlertTriangle className="h-5 w-5 text-white" />
        <span className="font-extrabold uppercase tracking-wider text-xs text-white">Emergency SOS</span>
      </Button>
    </Link>
  );
}
