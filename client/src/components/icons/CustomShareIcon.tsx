interface CustomShareIconProps {
  className?: string;
  size?: number;
}

export function CustomShareIcon({ className = "", size = 16 }: CustomShareIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Three circles connected by lines to form a share/network icon */}
      
      {/* Connection lines */}
      <line
        x1="8.5"
        y1="7"
        x2="15.5"
        y2="17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="15.5"
        y1="7"
        x2="8.5"
        y2="17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Top circle */}
      <circle
        cx="12"
        cy="5"
        r="3"
        fill="currentColor"
      />
      
      {/* Bottom left circle */}
      <circle
        cx="6"
        cy="19"
        r="3"
        fill="currentColor"
      />
      
      {/* Bottom right circle */}
      <circle
        cx="18"
        cy="19"
        r="3"
        fill="currentColor"
      />
    </svg>
  );
}