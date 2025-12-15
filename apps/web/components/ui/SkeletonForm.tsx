import { Skeleton } from './Skeleton';
import { cn } from '@/lib/utils/cn';

interface SkeletonFormProps {
  fields?: number;
  className?: string;
}

export function SkeletonForm({ fields = 4, className }: SkeletonFormProps) {
  return (
    <div className={cn('w-full space-y-4', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={`field-${i}`} className="space-y-2">
          <Skeleton className="h-4 w-24" /> {/* Label */}
          <Skeleton className="h-12 w-full" /> {/* Input */}
        </div>
      ))}
      <Skeleton className="mt-6 h-12 w-full" /> {/* Submit button */}
    </div>
  );
}

