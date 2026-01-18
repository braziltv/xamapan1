import { useState, useCallback, MouseEvent as ReactMouseEvent } from 'react';
import { cn } from '@/lib/utils';

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  glowColor?: string;
}

export function RippleButton({
  children,
  variant = 'default',
  size = 'md',
  glowColor,
  className,
  onClick,
  ...props
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = useCallback((e: ReactMouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const newRipple: Ripple = {
      id: Date.now(),
      x,
      y,
      size,
    };

    setRipples((prev) => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);

    onClick?.(e);
  }, [onClick]);

  const variantStyles = {
    default: 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600',
    primary: 'bg-primary hover:bg-primary/90 text-primary-foreground border-primary/50',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500',
    danger: 'bg-red-600 hover:bg-red-500 text-white border-red-500',
    ghost: 'bg-transparent hover:bg-white/10 text-white border-transparent',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const glowStyles = glowColor 
    ? `hover:shadow-[0_0_20px_${glowColor}]` 
    : 'hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]';

  return (
    <button
      className={cn(
        'relative overflow-hidden rounded-lg border font-medium transition-all duration-300',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-slate-900',
        'active:scale-[0.98] transform-gpu',
        glowStyles,
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {/* Ripple container */}
      <span className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 animate-ripple"
            style={{
              left: ripple.x - ripple.size / 2,
              top: ripple.y - ripple.size / 2,
              width: ripple.size,
              height: ripple.size,
            }}
          />
        ))}
      </span>

      {/* Glow effect on hover */}
      <span className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}
