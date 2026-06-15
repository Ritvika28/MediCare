import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';

export function RecommendationCard({ recommendation }) {
  if (!recommendation?.data) return null;
  const { recommendedHospital, recommendedDepartment, recommendedDoctor, analysis, aiInsight } = recommendation.data;

  return (
    <Card className="border-teal-200 bg-teal-50/50 dark:border-teal-900 dark:bg-teal-950/30">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
          <Sparkles className="h-5 w-5" />
          <h3 className="font-semibold">AI Recommendation</h3>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Based on your symptoms, we suggest <strong>{analysis?.departmentName}</strong> ({Math.round((analysis?.confidence || 0.5) * 100)}% match)
        </p>
        {recommendedHospital && (
          <p className="mt-2 text-sm"><strong>Hospital:</strong> {recommendedHospital.name}</p>
        )}
        {recommendedDoctor && (
          <p className="text-sm"><strong>Doctor:</strong> Dr. {recommendedDoctor.user?.firstName} {recommendedDoctor.user?.lastName}</p>
        )}
        {aiInsight && <p className="mt-2 text-xs text-slate-500 line-clamp-3">{aiInsight}</p>}
        {recommendedDoctor && recommendedHospital && (
          <Link to={`/patient/hospitals/${recommendedHospital._id}/doctors/${recommendedDoctor._id}`}>
            <Button className="mt-4" size="sm">View Recommended Doctor</Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
