export default function StatusBadge({ value }) {
  const s = String(value || '').trim().toUpperCase();
  if (!s || s === '—') return <span className="badge b-gray">—</span>;
  if (s.includes('OOC')) return <span className="badge b-grn">✓ {value}</span>;
  if (s.includes('DUTY')) return <span className="badge b-org">💰 {value}</span>;
  if (s === 'OTP - REG') return <span className="badge b-blue">🛃 {value}</span>;
  if (s === 'OTP - FLT') return <span className="badge b-pur">✈ {value}</span>;
  if (s === 'REG - FLT') return <span className="badge b-pur">✈ {value}</span>;
  if (s.includes('CLR') || s.includes('CLEAR'))
    return <span className="badge b-grn">✓ {value}</span>;
  return <span className="badge b-gray">{value}</span>;
}
