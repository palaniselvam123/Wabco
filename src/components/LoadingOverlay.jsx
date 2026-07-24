export default function LoadingOverlay({ visible }) {
  if (!visible) return null;
  return (
    <div className="loading-overlay">
      <div className="spinner" />
      <div className="loading-txt">Processing your Excel file…</div>
    </div>
  );
}
