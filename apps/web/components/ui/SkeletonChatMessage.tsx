import { Skeleton } from './Skeleton';
import { cn } from '@/lib/utils/cn';

interface SkeletonChatMessageProps {
  isUser?: boolean;
  className?: string;
}

export function SkeletonChatMessage({ isUser = false, className }: SkeletonChatMessageProps) {
  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start', className)}>
      {!isUser && <Skeleton className="h-8 w-8 shrink-0 rounded-full" />}
      
      <div className={cn('max-w-[80%] space-y-2', isUser && 'items-end')}>
        <Skeleton className={cn('h-4', isUser ? 'w-32' : 'w-48')} />
        <Skeleton className={cn('h-16', isUser ? 'w-48' : 'w-64')} />
      </div>

      {isUser && <Skeleton className="h-8 w-8 shrink-0 rounded-full" />}
    </div>
  );
}

