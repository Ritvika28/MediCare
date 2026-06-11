import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hospitalService } from '@/services/hospitalService';
import { HospitalComparisonTable } from '@/components/HospitalComparisonTable';
import { Skeleton } from '@/components/ui/Skeleton';

export default function CompareHospitals() {
  const [params] = useSearchParams();
  const ids = (params.get('ids') || '').split(',').filter(Boolean);

  const { data, isLoading } = useQuery({
    queryKey: ['compare', ids],
    queryFn: () => hospitalService.compare(ids),
    enabled: ids.length >= 2,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Compare Hospitals</h1>
      <p className="text-slate-500">Side-by-side comparison of selected hospitals</p>
      <div className="mt-6">
        {isLoading ? <Skeleton className="h-48 w-full" /> : (
          <HospitalComparisonTable comparison={data?.data || []} />
        )}
        {ids.length < 2 && (
          <p className="mt-4 text-sm text-slate-500">Select at least 2 hospitals from the Nearby Hospitals page.</p>
        )}
      </div>
    </div>
  );
}
