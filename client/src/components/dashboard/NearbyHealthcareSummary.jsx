import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Building2, Stethoscope, Droplet, FlaskConical, Navigation, MapPin } from 'lucide-react';

const ITEMS = [
  { key: 'hospitals', label: 'Nearby Hospitals', icon: Building2, emoji: '🏥', link: '/patient/hospitals', color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40' },
  { key: 'doctors', label: 'Nearby Doctors', icon: Stethoscope, emoji: '👨‍⚕️', link: '/doctors', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
  { key: 'bloodBanks', label: 'Nearby Blood Banks', icon: Droplet, emoji: '🩸', link: '/patient/blood-banks', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' },
  { key: 'labs', label: 'Nearby Labs', icon: FlaskConical, emoji: '🔬', link: '/patient/nearby-labs', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' },
];

export function NearbyHealthcareSummary({ latitude, longitude, hasLocation, locLoading, onEnableLocation }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-nearby-summary', latitude, longitude],
    queryFn: () => api.get('/patients/dashboard/nearby-summary', {
      params: { latitude, longitude, radius: 50 },
    }).then((r) => r.data.data),
    enabled: hasLocation,
    staleTime: 60000,
  });

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-teal-600" /> Healthcare Discovery Summary
            </CardTitle>
            <CardDescription>Real nearby results based on your GPS location</CardDescription>
          </div>
          {!hasLocation && (
            <Button size="sm" variant="outline" onClick={onEnableLocation} disabled={locLoading} className="gap-1.5">
              <Navigation className="h-4 w-4" /> Enable Location
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasLocation ? (
          <p className="text-sm text-slate-500 text-center py-8">
            Allow location access to discover hospitals, doctors, labs, and blood banks near you.
          </p>
        ) : isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : isError ? (
          <p className="text-sm text-rose-500 text-center py-8">Unable to load nearby healthcare data.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {ITEMS.map(({ key, label, icon: Icon, emoji, link, color }) => {
              const item = data?.[key] || {};
              return (
                <div key={key} className="rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{emoji} {label}</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white">{item.count ?? 0} found</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 space-y-0.5">
                    <p>Nearest: {item.nearestName || '—'}</p>
                    <p>Distance: {item.nearestDistance != null ? `${item.nearestDistance} km` : '—'}</p>
                  </div>
                  <Link to={link}>
                    <Button size="sm" variant="outline" className="w-full text-xs font-bold">Quick View</Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
