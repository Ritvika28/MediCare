import * as React from 'react';
import { cn } from '@/lib/utils';

export function Progress({ className, value, ...props }) {
  const clampedValue = Math.min(100, Math.max(0, value || 0));

  // Extract color classes (e.g. bg-emerald-500) passed from the caller to style the fill bar
  const colorMatch = className?.match(/bg-(?:emerald|amber|orange|rose|indigo|purple|violet|pink|blue|sky|teal|slate|gray|red|yellow|green)-\d+/);
  const colorClass = colorMatch ? colorMatch[0] : 'bg-indigo-600';
  
  // Clean container class by removing the fill color class
  const containerClass = className ? className.replace(colorClass, '').trim() : '';

  return (
    <div
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800',
        containerClass
      )}
      {...props}
    >
      <div
        className={cn('h-full transition-all duration-300 ease-in-out', colorClass)}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
