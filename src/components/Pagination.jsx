export default function Pagination({ current, total, totalRows, onPage }) {
  if (total < 1) return null;

  const lo = Math.max(1, current - 2);
  const hi = Math.min(total, lo + 4);
  const pages = [];
  for (let p = lo; p <= hi; p++) pages.push(p);

  return (
    <div className="pagination">
      <div className="pag-info">
        {totalRows.toLocaleString()} records — Page {current} of {total}
      </div>
      <div className="pag-btns">
        {current > 1 && (
          <button className="page-btn" onClick={() => onPage(current - 1)}>
            ‹
          </button>
        )}
        {pages.map((p) => (
          <button
            key={p}
            className={`page-btn${p === current ? ' active' : ''}`}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        ))}
        {current < total && (
          <button className="page-btn" onClick={() => onPage(current + 1)}>
            ›
          </button>
        )}
      </div>
    </div>
  );
}
