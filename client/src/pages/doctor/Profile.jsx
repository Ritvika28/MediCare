import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function DoctorProfile() {
  const { user, profile, fetchUser } = useAuth();
  const { toast } = useToast();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      firstName: user?.firstName,
      lastName: user?.lastName,
      specialization: profile?.specialization,
      consultationFee: profile?.consultationFee,
      bio: profile?.bio,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.patch('/doctors/profile/me', data),
    onSuccess: () => { fetchUser(); toast('Profile updated', 'success'); },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Doctor Profile</h1>
      <Card className="mt-6">
        <CardHeader><CardTitle>Professional Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input {...register('firstName')} placeholder="First Name" />
              <Input {...register('lastName')} placeholder="Last Name" />
            </div>
            <Input {...register('specialization')} placeholder="Specialization" />
            <Input {...register('consultationFee')} type="number" placeholder="Consultation Fee" />
            <textarea {...register('bio')} className="w-full rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-900" rows={4} placeholder="Bio" />
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
