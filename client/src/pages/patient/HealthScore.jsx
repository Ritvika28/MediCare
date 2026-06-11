import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { HealthScoreCard } from '@/components/HealthScoreCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function HealthScore() {
  const { data } = useQuery({
    queryKey: ['health-score'],
    queryFn: () => api.get('/patients/health-score').then((r) => r.data.data),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Health Score</h1>
      <HealthScoreCard score={data?.score} alerts={data?.alerts} />
      <Card>
        <CardHeader><CardTitle>How it's calculated</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>• Base score from your profile completeness</p>
          <p>• Adjusted for medical history and allergies</p>
          <p>• Bonus for completed appointments and records</p>
          <p>• Emergency contact on file improves score</p>
        </CardContent>
      </Card>
      {data?.alerts?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Health Alerts</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.alerts.map((a, i) => (
                <li key={i} className="rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-950">{a.message}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
