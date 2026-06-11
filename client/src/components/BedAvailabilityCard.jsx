import { Bed, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

export function BedAvailabilityCard({ beds }) {
  if (!beds) return null;
  
  const items = [
    { label: 'ICU Beds', available: beds.icuAvailable || 0, total: beds.icuBeds || 10 },
    { label: 'Emergency Beds', available: beds.emergencyAvailable || 0, total: beds.emergencyBeds || 20 },
    { label: 'General Beds', available: beds.generalAvailable || 0, total: beds.generalBeds || 50 },
  ];

  return (
    <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <CardHeader className="pb-3 border-b dark:border-slate-800/80">
        <CardTitle className="text-base flex items-center gap-2">
          <Bed className="h-5 w-5 text-teal-600" /> Real-time Bed Inventory
        </CardTitle>
      </CardHeader>
      
      <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
        {items.map((item) => {
          const ratio = item.total > 0 ? item.available / item.total : 0;
          
          let colorStyle = '';
          if (item.available === 0) {
            colorStyle = 'bg-rose-500/10 border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400';
          } else if (ratio < 0.3) {
            colorStyle = 'bg-amber-500/10 border-amber-200 dark:border-amber-900/30 text-amber-600 dark:text-amber-400';
          } else {
            colorStyle = 'bg-emerald-500/10 border-emerald-250 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400';
          }

          return (
            <div
              key={item.label}
              className={`rounded-xl border p-4 text-center transition flex flex-col justify-between items-center ${colorStyle}`}
            >
              <div className="flex flex-col items-center">
                <Bed className="h-6 w-6 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{item.label}</span>
              </div>
              <div className="mt-2.5">
                <span className="text-xl font-extrabold">{item.available}</span>
                <span className="text-xs opacity-75 font-semibold"> / {item.total} free</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
