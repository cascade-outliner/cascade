import { ArrowSquareOutIcon } from '@phosphor-icons/react';
import { Link as RouterLink, type LinkProps as RouterLinkProps } from '@tanstack/react-router';
import { cva, type VariantProps } from 'class-variance-authority';

const linkVariants = cva('group transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', {
  variants: {
    variant: {
      default: 'text-redleather underline-offset-4 hover:underline focus-visible:ring-redleather',
      muted: 'text-dark-grey hover:text-dark-grey/80 focus-visible:ring-dark-grey',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type LinkProps = RouterLinkProps & VariantProps<typeof linkVariants> & { className?: string };

function Link({ variant, className, children, ...props }: LinkProps) {
  const isExternal = 'href' in props && !!props.href;

  return (
    <RouterLink
      className={linkVariants({ variant, className })}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...props}
    >
      {isExternal ? (
        <span className="inline-flex items-center gap-1">
          <span className="group-hover:underline underline-offset-4">{children}</span>
          <ArrowSquareOutIcon size={14} />
        </span>
      ) : children}
    </RouterLink>
  );
}

export { Link, linkVariants };
export type { LinkProps };
