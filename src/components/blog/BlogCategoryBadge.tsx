import React from 'react';
import { Badge } from '@/components/ui/badge';

interface BlogCategoryBadgeProps {
  name: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export function BlogCategoryBadge({ name, variant = 'secondary' }: BlogCategoryBadgeProps) {
  return (
    <Badge variant={variant} className="text-xs">
      {name}
    </Badge>
  );
}