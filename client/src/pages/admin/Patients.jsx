import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function AdminPatients() {
  const { data } = useQuery({
    queryKey: ['admin-patients'],
    queryFn: () => api.get('/patients').then((r) => r.data.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Patient Management</h1>
      <div className="mt-6 space-y-3">
        {data?.map((p) => (
          <Card key={p._id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{p.user?.firstName} {p.user?.lastName}</p>
                <p className="text-sm text-slate-500">{p.user?.email}</p>
              </div>
              <Badge variant={p.user?.isActive ? 'success' : 'destructive'}>{p.user?.isActive ? 'Active' : 'Inactive'}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
