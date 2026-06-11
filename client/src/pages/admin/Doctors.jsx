import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function AdminDoctors() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data } = useQuery({
    queryKey: ['admin-doctors'],
    queryFn: () => api.get('/doctors', { params: { limit: 50, all: 'true' } }).then((r) => r.data.data),
  });

  const verifyMutation = useMutation({
    mutationFn: (id) => api.patch(`/doctors/${id}/verify`),
    onSuccess: () => { queryClient.invalidateQueries(['admin-doctors']); toast('Doctor verified', 'success'); },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Doctor Management</h1>
      <div className="mt-6 space-y-3">
        {data?.map((doc) => (
          <Card key={doc._id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">Dr. {doc.user?.firstName} {doc.user?.lastName}</p>
                <p className="text-sm text-slate-500">{doc.specialization} · {doc.licenseNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={doc.isVerified ? 'success' : 'warning'}>{doc.isVerified ? 'Verified' : 'Pending'}</Badge>
                {!doc.isVerified && <Button size="sm" onClick={() => verifyMutation.mutate(doc._id)}>Verify</Button>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
