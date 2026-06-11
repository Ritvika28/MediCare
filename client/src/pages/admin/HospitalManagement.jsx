import { useQuery } from '@tanstack/react-query';
import { hospitalService } from '@/services/hospitalService';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MapPin, Bed } from 'lucide-react';

export default function HospitalManagement() {
  const { data } = useQuery({
    queryKey: ['admin-hospitals'],
    queryFn: () => hospitalService.getAll(),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Hospital Management</h1>
      <div className="mt-6 space-y-4">
        {data?.data?.map((h) => (
          <Card key={h._id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <h3 className="font-semibold">{h.name}</h3>
                <p className="flex items-center gap-1 text-sm text-slate-500">
                  <MapPin className="h-3 w-3" /> {h.address?.city}, {h.address?.state}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge><Bed className="h-3 w-3" /> {h.availableBeds}/{h.totalBeds}</Badge>
                <Badge variant={h.isActive ? 'success' : 'destructive'}>{h.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
