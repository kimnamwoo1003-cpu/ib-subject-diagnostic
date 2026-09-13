export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <span className={`site-logo ${compact ? "compact" : ""}`} aria-hidden="true">
    <svg viewBox="0 0 48 48" role="img">
      <circle className="logo-ring-outer" cx="24" cy="24" r="18" pathLength="100" strokeDasharray="76 24" strokeDashoffset="7" fill="none" strokeLinecap="round"/>
      <circle className="logo-ring-inner" cx="24" cy="24" r="10" pathLength="100" strokeDasharray="58 42" strokeDashoffset="-34" fill="none" strokeLinecap="round"/>
      <circle className="logo-dot" cx="36.7" cy="15.9" r="2.6"/>
    </svg>
  </span>;
}

export function BrandLockup({ light = false }: { light?: boolean }) {
  return <span className={`brand-lockup ${light ? "light" : ""}`}>
    <BrandLogo/>
    <span><strong>Curivo</strong><small>IB-style adaptive practice</small></span>
  </span>;
}
