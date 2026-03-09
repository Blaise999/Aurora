export default function Card({ children, className = '', hover = false, glow = false, ...props }) {
  return (
    <div
      className={`
        glass-card rounded-card
        ${hover ? 'card-hover cursor-pointer' : ''}
        ${glow ? 'shadow-glow' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
