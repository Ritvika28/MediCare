import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent } from '@/components/ui/Card';
import { Users } from 'lucide-react';

export default function DoctorPatients() {
  const { data } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get('/patients').then((r) => r.data.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Patients</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((p) => (
          <Card key={p._id}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-700">
                {p.user?.firstName?.[0]}{p.user?.lastName?.[0]}
              </div>
              <div>
                <p className="font-semibold">{p.user?.firstName} {p.user?.lastName}</p>
                <p className="text-sm text-slate-500">{p.user?.email}</p>
                {p.bloodGroup && <p className="text-xs text-slate-400">Blood: {p.bloodGroup}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
