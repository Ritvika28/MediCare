import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export default function AdminDepartments() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/departments', { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
      setName('');
      setDescription('');
      toast('Department created', 'success');
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Departments</h1>
      <Card className="mt-6">
        <CardContent className="flex flex-wrap gap-3 p-4">
          <Input placeholder="Department name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="flex-1" />
          <Button onClick={() => createMutation.mutate()} disabled={!name}>Add</Button>
        </CardContent>
      </Card>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {data?.map((d) => (
          <Card key={d._id}><CardContent className="p-4"><p className="font-semibold">{d.name}</p><p className="text-sm text-slate-500">{d.description}</p></CardContent></Card>
        ))}
      </div>
    </div>
  );
}
