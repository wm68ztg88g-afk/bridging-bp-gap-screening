export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-label="Bridging the BP Gap"
      role="img"
    >
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M6 24H15L19 14L26 34L30 24H42"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
