import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';

export function EmergencyButton() {
  const location = useLocation();

  // Hide the floating button if the user is already on the emergency page
  if (location.pathname === '/patient/emergency-hub' || location.pathname === '/patient/emergency') {
    return null;
  }

  return (
    <Link to="/patient/emergency-hub" className="fixed bottom-6 right-6 z-50">
      <button
        className="relative group flex items-center justify-center gap-2 h-14 px-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-wider text-xs shadow-[0_0_20px_rgba(225,29,72,0.6)] hover:shadow-[0_0_30px_rgba(225,29,72,0.8)] border-2 border-white dark:border-slate-800 transition-all duration-300 hover:scale-105 active:scale-95"
      >
        <span className="absolute inset-0 rounded-full bg-rose-600 opacity-75 animate-ping pointer-events-none" />
        <AlertTriangle className="h-5 w-5 text-white shrink-0 relative z-10" />
        <span className="relative z-10">EMERGENCY</span>
      </button>
    </Link>
  );
}
