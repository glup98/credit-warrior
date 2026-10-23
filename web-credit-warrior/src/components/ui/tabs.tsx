'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  baseId: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs compound components must be used within a Tabs provider');
  }
  return context;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      defaultValue,
      value: controlledValue,
      onValueChange,
      orientation = 'horizontal',
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isControlled = controlledValue !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = React.useState<string>(defaultValue ?? '');
    const activeValue = isControlled ? controlledValue : uncontrolledValue;
    const baseId = React.useId();

    const handleValueChange = React.useCallback(
      (nextValue: string) => {
        if (!isControlled) {
          setUncontrolledValue(nextValue);
        }
        onValueChange?.(nextValue);
      },
      [isControlled, onValueChange],
    );

    return (
      <TabsContext.Provider
        value={{
          value: activeValue,
          onValueChange: handleValueChange,
          orientation,
          baseId,
        }}
      >
        <div
          ref={ref}
          className={cn('flex flex-col', className)}
          data-orientation={orientation}
          {...props}
        >
          {children}
        </div>
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = 'Tabs';

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  loop?: boolean;
}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, onKeyDown, loop = true, ...props }, ref) => {
    const { orientation, onValueChange } = useTabsContext();
    const listRef = React.useRef<HTMLDivElement | null>(null);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;

      const tabs = Array.from(
        listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])') ?? [],
      );
      if (!tabs.length) return;

      const activeIndex = tabs.findIndex((tab) => tab === document.activeElement);
      if (activeIndex === -1) return;

      let nextIndex = activeIndex;
      const isHorizontal = orientation === 'horizontal';

      if (
        (isHorizontal && event.key === 'ArrowRight') ||
        (!isHorizontal && event.key === 'ArrowDown')
      ) {
        event.preventDefault();
        nextIndex = activeIndex + 1;
        if (nextIndex >= tabs.length) {
          nextIndex = loop ? 0 : tabs.length - 1;
        }
      } else if (
        (isHorizontal && event.key === 'ArrowLeft') ||
        (!isHorizontal && event.key === 'ArrowUp')
      ) {
        event.preventDefault();
        nextIndex = activeIndex - 1;
        if (nextIndex < 0) {
          nextIndex = loop ? tabs.length - 1 : 0;
        }
      } else if (event.key === 'Home') {
        event.preventDefault();
        nextIndex = 0;
      } else if (event.key === 'End') {
        event.preventDefault();
        nextIndex = tabs.length - 1;
      } else {
        return;
      }

      const targetTab = tabs[nextIndex];
      if (targetTab) {
        targetTab.focus();
        const tabValue = targetTab.getAttribute('data-value');
        if (tabValue) {
          onValueChange(tabValue);
        }
      }
    };

    return (
      <div
        ref={(node) => {
          listRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        role="tablist"
        aria-orientation={orientation}
        onKeyDown={handleKeyDown}
        className={cn(
          'inline-flex h-10 items-center justify-start rounded-lg border border-border-subtle bg-canvas p-1 text-text-muted',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
TabsList.displayName = 'TabsList';

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value: triggerValue, children, disabled, onClick, ...props }, ref) => {
    const { value, onValueChange, baseId } = useTabsContext();
    const isSelected = value === triggerValue;
    const tabId = `${baseId}-tab-${triggerValue}`;
    const panelId = `${baseId}-panel-${triggerValue}`;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        id={tabId}
        aria-controls={panelId}
        aria-selected={isSelected}
        tabIndex={isSelected ? 0 : -1}
        disabled={disabled}
        data-state={isSelected ? 'active' : 'inactive'}
        data-value={triggerValue}
        onClick={(e) => {
          onClick?.(e);
          if (!disabled) {
            onValueChange(triggerValue);
          }
        }}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp',
          'disabled:pointer-events-none disabled:opacity-50',
          isSelected
            ? 'border border-border-subtle bg-surface text-text-primary shadow-sm'
            : 'text-text-muted hover:text-text-primary',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
TabsTrigger.displayName = 'TabsTrigger';

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  forceMount?: boolean;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value: panelValue, children, forceMount, ...props }, ref) => {
    const { value, baseId } = useTabsContext();
    const isSelected = value === panelValue;
    const tabId = `${baseId}-tab-${panelValue}`;
    const panelId = `${baseId}-panel-${panelValue}`;

    if (!isSelected && !forceMount) {
      return null;
    }

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId}
        tabIndex={0}
        hidden={!isSelected}
        data-state={isSelected ? 'active' : 'inactive'}
        className={cn(
          'mt-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
TabsContent.displayName = 'TabsContent';
