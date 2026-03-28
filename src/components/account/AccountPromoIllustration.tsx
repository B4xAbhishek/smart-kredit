/** Lightweight decorative art for the account promo card (phone + charts). */
export function AccountPromoIllustration() {
  return (
    <svg
      viewBox="0 0 120 100"
      className="h-24 w-28 shrink-0"
      aria-hidden
    >
      <defs>
        <linearGradient id="ap-phone" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect
        x="28"
        y="12"
        width="52"
        height="78"
        rx="10"
        fill="url(#ap-phone)"
        stroke="white"
        strokeOpacity="0.5"
        strokeWidth="2"
      />
      <rect x="36" y="22" width="36" height="22" rx="3" fill="#38bdf8" opacity="0.35" />
      <path
        d="M40 52 L52 62 L64 48 L76 58"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="95" cy="28" r="14" fill="white" fillOpacity="0.25" />
      <path
        d="M95 22 A10 10 0 1 1 94.9 22"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="14" y="58" width="22" height="16" rx="3" fill="white" fillOpacity="0.2" />
      <path
        d="M18 70 L22 64 L26 68 L30 60"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
