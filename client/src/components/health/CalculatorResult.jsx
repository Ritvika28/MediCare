import { motion } from 'framer-motion';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { statusBadgeClass } from '@/constants/healthCalculators';

const SKIP_KEYS = new Set(['recommendations', 'advice', 'dietAdvice', 'interpretation', 'disclaimer', 'status', 'statusColor', 'unit', 'range']);

export function CalculatorResult({ result }) {
  if (!result) return null;
  const outputs = result.outputs || result.data?.outputs;
  const summary = result.resultSummary || result.data?.resultSummary;
  if (!outputs) return null;

  const status = outputs.status || outputs.category || outputs.classification || outputs.level || outputs.riskLevel || outputs.riskCategory || outputs.stage;
  const color = outputs.statusColor || 'slate';
  const recs = outputs.recommendations || outputs.advice || outputs.dietAdvice || [];
  const lists = [];
  if (Array.isArray(outputs.advice) && !outputs.recommendations) lists.push({ key: 'advice', items: outputs.advice });
  if (Array.isArray(outputs.dietAdvice)) lists.push({ key: 'dietAdvice', items: outputs.dietAdvice });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-teal-50/80 to-emerald-50/80 dark:from-teal-950/30 dark:to-emerald-950/20 border border-teal-200/80 dark:border-teal-900/50 backdrop-blur-sm space-y-4"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-teal-600" />
          <h3 className="font-bold text-teal-800 dark:text-teal-300">Results — Saved</h3>
        </div>
        {status && (
          <Badge className={`${statusBadgeClass(color)} border-0 text-xs font-bold px-3 py-1`}>{status}</Badge>
        )}
      </div>

      <p className="text-lg font-black text-teal-900 dark:text-teal-200">{summary}</p>

      {outputs.interpretation && (
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{outputs.interpretation}</p>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(outputs)
          .filter(([k, v]) => !SKIP_KEYS.has(k) && typeof v !== 'object')
          .map(([key, value]) => (
            <div key={key} className="bg-white/70 dark:bg-slate-900/70 rounded-xl p-3 border border-teal-100/50 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
              <p className="text-base font-black text-slate-900 dark:text-white mt-1 capitalize">{String(value)}</p>
            </div>
          ))}
      </div>

      {(recs.length > 0 || lists.length > 0) && (
        <div className="pt-3 border-t border-teal-200/50 dark:border-teal-950/30 space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recommendations</p>
          <ul className="space-y-1.5">
            {(recs.length ? recs : lists.flatMap((l) => l.items)).map((item, i) => (
              <li key={i} className="flex gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                <span className="text-teal-600">✓</span> {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {outputs.disclaimer && (
        <div className="flex gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-800 dark:text-amber-300 leading-relaxed">{outputs.disclaimer}</p>
        </div>
      )}

      {outputs.doctorRecommended && (
        <div className="flex gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <p className="text-xs font-bold text-rose-700 dark:text-rose-300">Medical consultation recommended</p>
        </div>
      )}
    </motion.div>
  );
}
