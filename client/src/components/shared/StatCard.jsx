import { motion } from 'framer-motion';
import { Card, CardContent } from '../ui/Card';

export function StatCard({ title, value, icon: Icon, trend, color = 'teal' }) {
  const colors = {
    teal: 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className={`rounded-xl p-3 ${colors[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && <p className="text-xs text-green-600">{trend}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
