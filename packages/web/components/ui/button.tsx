import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Colors/radius/padding follow docs/DESIGN.md `button-primary` (mint bg, near-black ink label —
// never white on mint) with the rounded.xs + 12x24 padding correction from Known Gaps.
// No hover states are documented for this system — default and active/pressed only.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xs text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground active:bg-accent-mint',
        destructive: 'bg-destructive text-destructive-foreground active:bg-destructive/85',
        outline: 'border border-hairline bg-canvas text-ink active:bg-surface-soft',
        secondary: 'bg-surface-soft text-ink active:bg-hairline-soft',
        ghost: 'text-ink active:bg-surface-soft',
        link: 'text-ink underline-offset-4 active:underline',
      },
      size: {
        default: 'h-11 px-lg py-sm',
        sm: 'h-9 rounded-xs px-sm text-xs',
        lg: 'h-12 rounded-xs px-xl',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
