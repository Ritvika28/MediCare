import { Star, MessageSquare } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';

export function ReviewCard({ review }) {
  const patientName = review.patient?.user?.fullName || 'Anonymous Patient';
  const avatar = review.patient?.user?.avatar;
  const initials = review.patient?.user?.firstName
    ? `${review.patient.user.firstName.charAt(0)}${review.patient.user.lastName ? review.patient.user.lastName.charAt(0) : ''}`
    : 'AP';

  const dateFormatted = new Date(review.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow transition">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {avatar ? (
              <img
                src={avatar}
                alt={patientName}
                className="h-10 w-10 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 font-bold flex items-center justify-center text-sm border border-teal-200/20">
                {initials}
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{patientName}</h4>
              <p className="text-[10px] text-slate-500 font-medium">{dateFormatted}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < review.rating
                    ? 'fill-amber-500 stroke-amber-500'
                    : 'stroke-slate-300 fill-none dark:stroke-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Comment */}
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
          "{review.comment || 'No description provided.'}"
        </p>

      </CardContent>
    </Card>
  );
}
