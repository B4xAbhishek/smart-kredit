/** Decorative hero art — geometric fintech illustration (no external asset). */
export function LoginHeroIllustration() {
  return (
    <svg
      viewBox="0 0 200 160"
      className="h-36 w-auto max-w-[55%] shrink-0 drop-shadow-lg sm:h-40"
      aria-hidden
    >
      <defs>
        <linearGradient id="sk-doc" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#eeecfa" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="sk-skin" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fde7d6" />
          <stop offset="100%" stopColor="#f5c4a8" />
        </linearGradient>
      </defs>
      {/* Abstract receipt / loan scroll */}
      <path
        d="M118 24c8-2 18 2 22 10l28 78c3 8 0 17-7 21l-4 2c-6 3-14 2-19-3L96 52c-5-6-6-15-2-22l8-4c5-3 11-4 16-2z"
        fill="url(#sk-doc)"
        stroke="#ffffff"
        strokeWidth="1.5"
        opacity="0.95"
      />
      <path
        d="M128 44h48M128 58h40M128 72h44"
        stroke="#6466f1"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* Person silhouette */}
      <ellipse cx="52" cy="118" rx="28" ry="10" fill="#3c155b" opacity="0.12" />
      <path
        d="M44 118c-2-18 8-32 22-36 14-4 28 6 32 22 2 8 1 16-3 22"
        fill="none"
        stroke="#3c155b"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <circle cx="58" cy="52" r="18" fill="url(#sk-skin)" />
      <path
        d="M40 78c6-10 18-14 30-10 8 3 14 10 16 18l12 42c2 6-1 12-6 15l-6 3"
        fill="#6466f1"
        opacity="0.9"
      />
      <path
        d="M34 96c4-2 10-1 14 3l10 22"
        fill="none"
        stroke="#3c155b"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}
