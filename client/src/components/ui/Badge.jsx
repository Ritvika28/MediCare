import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  destructive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  secondary: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
};

export function Badge({ className, variant = 'default', children }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}
