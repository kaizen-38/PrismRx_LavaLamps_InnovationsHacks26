import { cn } from '@/lib/utils'

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both'
}

export function ScrollArea({
  orientation = 'vertical',
  className,
  children,
  ...props
}: ScrollAreaProps) {
  return (
    <div
      className={cn(
        'relative',
        orientation === 'vertical' && 'overflow-y-auto overflow-x-hidden',
        orientation === 'horizontal' && 'overflow-x-auto overflow-y-hidden',
        orientation === 'both' && 'overflow-auto',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
