import { useQuery } from '@tanstack/react-query';
import { hospitalService } from '@/services/hospitalService';
import { BedAvailabilityCard } from '@/components/BedAvailabilityCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function BedManagement() {
  const { data: hospitalsData } = useQuery({
    queryKey: ['admin-hospitals'],
    queryFn: () => hospitalService.getAll(),
  });

  const hospitals = hospitalsData?.data || [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Bed Management</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {hospitals.map((h) => (
          <HospitalBeds key={h._id} hospitalId={h._id} name={h.name} />
        ))}
      </div>
    </div>
  );
}

function HospitalBeds({ hospitalId, name }) {
  const { data } = useQuery({
    queryKey: ['beds', hospitalId],
    queryFn: () => hospitalService.getBeds(hospitalId),
  });

  return (
    <div>
      <h3 className="mb-2 font-medium">{name}</h3>
      <BedAvailabilityCard beds={data?.data} />
    </div>
  );
}
