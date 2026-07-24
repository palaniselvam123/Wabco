export default function KpiCard({
  color,
  icon,
  label,
  value,
  sub,
  trend,
  trendType = 'neu',
  small,
  compact,
}) {
  return (
    <div className={`kpi-card c-${color}`} style={compact ? { padding: '16px 18px' } : undefined}>
      {icon && <div className={`kpi-icon c-${color}`}>{icon}</div>}
      <div className="kpi-lbl" style={compact ? { marginBottom: 6 } : undefined}>
        {label}
      </div>
      <div
        className={`kpi-val${small ? ' sm' : ''}`}
        style={compact ? { fontSize: 22 } : undefined}
      >
        {value}
      </div>
      <div className="kpi-sub">
        {trend && <span className={`trend ${trendType}`}>{trend}</span>}
        {sub}
      </div>
    </div>
  );
}
