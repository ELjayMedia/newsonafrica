'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  compact?: boolean;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  className = '',
  compact = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('border border-gray-200 rounded-lg overflow-hidden', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors text-left',
          compact ? 'px-3 py-2' : 'px-4 py-3',
        )}
      >
        <h3 className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}>{title}</h3>
        {isOpen ? (
          <ChevronUp className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        ) : (
          <ChevronDown className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        )}
      </button>
      {isOpen && <div className={cn('bg-white', compact ? 'p-2' : 'p-4')}>{children}</div>}
    </div>
  );
}
