import { Activity } from 'lucide-react';
import { Card, CardContent } from './ui/Card';

export function HealthScoreCard({ score = 0, alerts = [] }) {
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';
  const bg = score >= 80 ? 'from-green-50 to-teal-50' : score >= 60 ? 'from-amber-50 to-orange-50' : 'from-red-50 to-orange-50';

  return (
    <Card className={`bg-gradient-to-br ${bg} dark:from-slate-900 dark:to-slate-800`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Health Score</p>
            <p className={`text-4xl font-bold ${color}`}>{score}</p>
            <p className="text-xs text-slate-400">out of 100</p>
          </div>
          <div className={`rounded-full bg-white p-4 shadow dark:bg-slate-800`}>
            <Activity className={`h-8 w-8 ${color}`} />
          </div>
        </div>
        {alerts?.length > 0 && (
          <ul className="mt-4 space-y-1 border-t border-slate-200 pt-3 dark:border-slate-700">
            {alerts.slice(0, 2).map((a, i) => (
              <li key={i} className="text-xs text-slate-600 dark:text-slate-400">• {a.message}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
