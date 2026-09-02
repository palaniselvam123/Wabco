import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Multi-select checkbox dropdown.
 * The panel is rendered through a portal with fixed positioning so it is never
 * clipped by `overflow` on ancestors (e.g. `.table-wrap`).
 *
 * Props:
 *   options   string[]                 all selectable values
 *   selected  string[]                 currently chosen values
 *   onChange  (string[]) => void
 *   variant   'select' | 'chip'        'select' looks like a <select> (filter bars),
 *                                      'chip' is a compact ▼ badge (table headers)
 *   label     string                   placeholder shown when nothing is selected ('select' only)
 */
export default function MultiFilter({
  options = [],
  selected = [],
  onChange,
  variant = 'select',
  label = 'All',
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 200 });
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const active = selected.length > 0;

  // Position the portal panel under the trigger, flipping if it would overflow.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const width = Math.max(variant === 'chip' ? 210 : r.width, 190);
    let left = r.left;
    if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
    if (left < 12) left = 12;

    const spaceBelow = window.innerHeight - r.bottom;
    const height = Math.min(320, Math.max(180, options.length * 28 + 90));
    const top = spaceBelow < height && r.top > height ? r.top - height - 4 : r.bottom + 4;

    setPos({ top, left, width, maxHeight: Math.min(height, window.innerHeight - top - 12) });
  }, [open, options.length, variant]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onScroll = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  const toggle = (v) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  const shown = q
    ? options.filter((o) => String(o).toLowerCase().includes(q.toLowerCase()))
    : options;

  const triggerStyle =
    variant === 'chip'
      ? {
          // Table headers are light (#f8fafc), so the chip must be dark-on-light
          background: active ? '#f07c2c' : '#fff',
          border: `1px solid ${active ? '#f07c2c' : '#cbd5e1'}`,
          borderRadius: 4,
          padding: '1px 5px',
          cursor: 'pointer',
          fontSize: 10,
          color: active ? '#fff' : '#475569',
          fontWeight: 700,
          lineHeight: 1.5,
          marginLeft: 5,
          verticalAlign: 'middle',
          flexShrink: 0,
          boxShadow: active ? '0 0 0 2px rgba(240,124,44,.2)' : 'none',
        }
      : {
          padding: '6px 9px',
          border: `1px solid ${active ? 'var(--accent, #f07c2c)' : 'var(--border, #e2e8f0)'}`,
          borderRadius: 'var(--rs, 6px)',
          fontSize: 12.5,
          color: active ? '#c2410c' : 'var(--text, #1e293b)',
          background: active ? '#fff7ed' : '#f8fafc',
          fontFamily: 'inherit',
          minWidth: 120,
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          fontWeight: active ? 600 : 400,
        };

  const triggerText =
    variant === 'chip'
      ? active
        ? `▼${selected.length}`
        : '▼'
      : active
        ? selected.length === 1
          ? String(selected[0]).length > 16
            ? String(selected[0]).slice(0, 15) + '…'
            : selected[0]
          : `${selected.length} selected`
        : label;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
          setQ('');
        }}
        style={triggerStyle}
        title={active ? selected.join(', ') : 'Filter'}
      >
        {variant === 'chip' ? triggerText : (
          <>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {triggerText}
            </span>
            <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
          </>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight || 320,
              zIndex: 12000,
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              boxShadow: '0 14px 40px rgba(13,31,60,.22)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: "'Segoe UI',sans-serif",
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                padding: '7px 11px',
                borderBottom: '1px solid #f1f5f9',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => onChange([])}
                style={{ fontSize: 11.5, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
              >
                Clear
              </button>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {selected.length}/{options.length}
              </span>
              <button
                type="button"
                onClick={() => onChange([...options])}
                style={{ fontSize: 11.5, color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
              >
                Select all
              </button>
            </div>

            {options.length > 8 && (
              <div style={{ padding: '7px 9px', borderBottom: '1px solid #f8fafc', flexShrink: 0 }}>
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search…"
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    fontSize: 12,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            )}

            <div style={{ overflowY: 'auto', flex: 1, padding: '3px 0' }}>
              {shown.length === 0 && (
                <div style={{ padding: '12px 14px', fontSize: 12.5, color: '#94a3b8' }}>
                  No matches
                </div>
              )}
              {shown.map((v) => (
                <label
                  key={v}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '5px 12px',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    color: '#1e293b',
                    background: selected.includes(v) ? '#fff7ed' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(v)}
                    onChange={() => toggle(v)}
                    style={{ accentColor: '#f07c2c', width: 13, height: 13, flexShrink: 0 }}
                  />
                  <span style={{ flex: 1, wordBreak: 'break-word', lineHeight: 1.35 }}>{v}</span>
                </label>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
