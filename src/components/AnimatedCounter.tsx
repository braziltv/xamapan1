import { useEffect, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  className?: string;
}

export function AnimatedCounter({ value, className = '' }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (displayValue !== value) {
      setIsAnimating(true);
      
      // Animate the number change
      const timeout = setTimeout(() => {
        setDisplayValue(value);
        setIsAnimating(false);
      }, 150);

      return () => clearTimeout(timeout);
    }
  }, [value, displayValue]);

  return (
    <span 
      className={`
        inline-flex items-center justify-center 
        min-w-[1.75rem] h-7 px-2
        bg-primary/20 text-primary font-bold text-sm
        rounded-full border border-primary/30
        transition-all duration-300
        ${isAnimating ? 'scale-125 bg-primary text-primary-foreground' : 'scale-100'}
        ${className}
      `}
    >
      <span className={`transition-transform duration-150 ${isAnimating ? 'scale-0' : 'scale-100'}`}>
        {displayValue}
      </span>
    </span>
  );
}
