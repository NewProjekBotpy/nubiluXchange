import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CardSkeletonProps {
  count?: number;
  variant: 'list' | 'card' | 'table';
  className?: string;
}

const ListSkeleton = () => (
  <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border bg-card animate-pulse">
    <div className="flex-shrink-0">
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-muted via-muted/80 to-muted/60" />
    </div>
    <div className="flex-1 space-y-2 sm:space-y-3">
      <div className="h-4 sm:h-5 bg-gradient-to-r from-muted via-muted/80 to-muted/60 rounded w-3/4" />
      <div className="h-3 sm:h-4 bg-gradient-to-r from-muted via-muted/70 to-muted/50 rounded w-full" />
      <div className="h-3 sm:h-4 bg-gradient-to-r from-muted via-muted/70 to-muted/50 rounded w-5/6" />
    </div>
  </div>
);

const CardSkeletonItem = () => (
  <Card className="overflow-hidden animate-pulse">
    <CardHeader className="space-y-2 sm:space-y-3">
      <div className="h-5 sm:h-6 bg-gradient-to-r from-muted via-muted/80 to-muted/60 rounded w-2/3" />
      <div className="h-3 sm:h-4 bg-gradient-to-r from-muted via-muted/70 to-muted/50 rounded w-1/2" />
    </CardHeader>
    <CardContent className="space-y-3 sm:space-y-4">
      <div className="space-y-2">
        <div className="h-3 sm:h-4 bg-gradient-to-r from-muted via-muted/70 to-muted/50 rounded w-full" />
        <div className="h-3 sm:h-4 bg-gradient-to-r from-muted via-muted/70 to-muted/50 rounded w-5/6" />
        <div className="h-3 sm:h-4 bg-gradient-to-r from-muted via-muted/70 to-muted/50 rounded w-4/5" />
      </div>
      <div className="flex gap-2 pt-2">
        <div className="h-8 sm:h-9 bg-gradient-to-r from-muted via-muted/80 to-muted/60 rounded w-20 sm:w-24" />
        <div className="h-8 sm:h-9 bg-gradient-to-r from-muted via-muted/80 to-muted/60 rounded w-20 sm:w-24" />
      </div>
    </CardContent>
  </Card>
);

const TableSkeleton = () => (
  <div className="rounded-lg border bg-card overflow-hidden animate-pulse">
    {/* Table Header */}
    <div className="border-b bg-muted/30 p-3 sm:p-4">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-4">
        <div className="h-4 sm:h-5 bg-gradient-to-r from-muted via-muted/80 to-muted/60 rounded w-3/4" />
        <div className="h-4 sm:h-5 bg-gradient-to-r from-muted via-muted/80 to-muted/60 rounded w-2/3" />
        <div className="h-4 sm:h-5 bg-gradient-to-r from-muted via-muted/80 to-muted/60 rounded w-1/2" />
        <div className="hidden sm:block h-4 sm:h-5 bg-gradient-to-r from-muted via-muted/80 to-muted/60 rounded w-3/5" />
        <div className="hidden md:block h-4 sm:h-5 bg-gradient-to-r from-muted via-muted/80 to-muted/60 rounded w-2/3" />
      </div>
    </div>
    {/* Table Rows */}
    <div className="divide-y">
      {[...Array(3)].map((_, idx) => (
        <div key={idx} className="p-3 sm:p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-4 items-center">
            <div className="h-3 sm:h-4 bg-gradient-to-r from-muted via-muted/70 to-muted/50 rounded w-full" />
            <div className="h-3 sm:h-4 bg-gradient-to-r from-muted via-muted/70 to-muted/50 rounded w-4/5" />
            <div className="h-3 sm:h-4 bg-gradient-to-r from-muted via-muted/70 to-muted/50 rounded w-3/5" />
            <div className="hidden sm:block h-3 sm:h-4 bg-gradient-to-r from-muted via-muted/70 to-muted/50 rounded w-full" />
            <div className="hidden md:block h-3 sm:h-4 bg-gradient-to-r from-muted via-muted/70 to-muted/50 rounded w-4/5" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function CardSkeleton({ 
  count = 3, 
  variant,
  className 
}: CardSkeletonProps) {
  const renderSkeleton = () => {
    switch (variant) {
      case 'list':
        return <ListSkeleton />;
      case 'card':
        return <CardSkeletonItem />;
      case 'table':
        return <TableSkeleton />;
      default:
        return <ListSkeleton />;
    }
  };

  // For table variant, render once with multiple rows inside
  if (variant === 'table') {
    return (
      <div 
        className={cn('space-y-4', className)}
        data-testid={`card-skeleton-${variant}`}
      >
        {renderSkeleton()}
      </div>
    );
  }

  // For list and card variants, render multiple items
  return (
    <div 
      className={cn(
        'space-y-4',
        variant === 'card' && 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
        className
      )}
      data-testid={`card-skeleton-${variant}`}
    >
      {[...Array(count)].map((_, index) => (
        <div key={index}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
}
