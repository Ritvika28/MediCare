import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Star, Filter } from 'lucide-react';
import { api } from '@/api/axios';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

export default function Doctors() {
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [minExperience, setMinExperience] = useState('');
  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['doctors', search, specialization, minExperience],
    queryFn: () =>
      api.get('/doctors', {
        params: {
          search,
          specialization: specialization || undefined,
          minExperience: minExperience || undefined,
          limit: 20,
        },
      }).then((r) => r.data),
  });

  const doctors = data?.data || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-3xl font-bold">Find a Doctor</h1>
      <p className="mt-2 text-slate-500">Browse our verified specialists</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-10" placeholder="Search doctors..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Input placeholder="Specialization" value={specialization} onChange={(e) => setSpecialization(e.target.value)} className="w-40" />
        <Input placeholder="Min experience" type="number" value={minExperience} onChange={(e) => setMinExperience(e.target.value)} className="w-36" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)
          : doctors.map((doc) => (
            <Card key={doc._id} className="overflow-hidden transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-lg font-bold text-teal-700">
                    {doc.user?.firstName?.[0]}{doc.user?.lastName?.[0]}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Dr. {doc.user?.firstName} {doc.user?.lastName}</h3>
                    <p className="text-sm text-teal-600">{doc.specialization}</p>
                    <p className="text-xs text-slate-500">{doc.department?.name}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-medium">{doc.rating}</span>
                      <span className="text-xs text-slate-400">({doc.reviewCount} reviews)</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge>{doc.experience} yrs exp</Badge>
                      <span className="font-semibold text-teal-600">${doc.consultationFee}</span>
                    </div>
                  </div>
                </div>
                {isAuthenticated && (
                  <Link to={`/patient/book/${doc._id}`} className="mt-4 block">
                    <Button className="w-full" size="sm">Book Appointment</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
      </div>
      {!isLoading && doctors.length === 0 && (
        <p className="mt-12 text-center text-slate-500">No doctors found matching your criteria.</p>
      )}
    </div>
  );
}
