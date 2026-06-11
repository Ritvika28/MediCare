import { cn } from '@/lib/utils';

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn('rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }) {
  return <div className={cn('flex flex-col gap-1.5 p-6 pb-0', className)}>{children}</div>;
}

export function CardTitle({ className, children }) {
  return <h3 className={cn('text-lg font-semibold leading-none', className)}>{children}</h3>;
}

export function CardDescription({ className, children }) {
  return <p className={cn('text-sm text-slate-500', className)}>{children}</p>;
}

export function CardContent({ className, children }) {
  return <div className={cn('p-6', className)}>{children}</div>;
}
