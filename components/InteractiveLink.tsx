'use client';

import Link from 'next/link';
import type { LinkProps } from 'next/link';
import type { ReactNode } from 'react';
import { forwardRef } from 'react';

interface InteractiveLinkProps extends LinkProps {
  className?: string;
  onClick?: () => void;
  children: ReactNode;
  ariaLabel?: string;
}

export const InteractiveLink = forwardRef<HTMLAnchorElement, InteractiveLinkProps>(
  ({ href, className, onClick, children, ariaLabel, ...props }, ref) => {
    return (
      <Link
        href={href}
        className={className}
        onClick={onClick}
        aria-label={ariaLabel}
        ref={ref}
        {...props}
      >
        {children}
      </Link>
    );
  },
);

InteractiveLink.displayName = 'InteractiveLink';
