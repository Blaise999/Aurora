// PageShell — thin wrapper. Header/Footer are now in the root layout.
export default function PageShell({ children, heroFused = false }) {
  return (
    <div className={heroFused ? '' : ''}>
      {children}
    </div>
  );
}
