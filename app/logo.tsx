export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <span className={`site-logo ${compact ? "compact" : ""}`} aria-hidden="true">
    <svg viewBox="0 0 48 48" role="img">
      <path className="logo-tile" d="M7 5h34a4 4 0 0 1 4 4v30a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4Z"/>
      <path className="logo-book" d="M11 14c5.6 0 9.9 1.5 13 4.5V36c-3.1-3-7.4-4.5-13-4.5V14Zm26 0c-5.6 0-9.9 1.5-13 4.5V36c3.1-3 7.4-4.5 13-4.5V14Z"/>
      <path className="logo-path" d="m17 27 4-4 4 3 7-8"/>
      <circle className="logo-dot" cx="32" cy="18" r="2.4"/>
    </svg>
  </span>;
}

export function BrandLockup({ light = false }: { light?: boolean }) {
  return <span className={`brand-lockup ${light ? "light" : ""}`}>
    <BrandLogo/>
    <span><strong>Subject Diagnostic</strong><small>IB-style adaptive practice</small></span>
  </span>;
}
