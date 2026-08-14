import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// docs/DESIGN.md `eyebrow-badge` -> status pill: rounded.pill, 8x16 padding, eyebrow type size.
// `error` is the only semantic red (docs/DESIGN.md) — reserved for rejected/failed states.
const badgeVariants = cva(
  'inline-flex items-center rounded-pill border border-transparent px-md py-xxs text-eyebrow font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-surface-soft text-ink border-hairline',
        pending: 'bg-accent-aqua text-ink',
        success: 'bg-accent-green text-ink',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'text-ink border-hairline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
