interface HealthCrossIconProps {
  size?: number;
  className?: string;
}

export function HealthCrossIcon({ size = 48, className = '' }: HealthCrossIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
    >
      {/* Red cross shape */}
      <path
        d="M 35 5 
           L 65 5 
           L 65 35 
           L 95 35 
           L 95 65 
           L 65 65 
           L 65 95 
           L 35 95 
           L 35 65 
           L 5 65 
           L 5 35 
           L 35 35 
           Z"
        fill="#e53935"
      />
      
      {/* ECG line - white heartbeat wave across the middle */}
      <path
        d="M 8 50 
           L 25 50 
           L 32 50 
           L 38 65 
           L 44 35 
           L 50 55 
           L 56 45 
           L 62 50 
           L 68 50 
           L 92 50"
        fill="none"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <animate
          attributeName="stroke-dasharray"
          values="0,200;200,0"
          dur="2s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}
