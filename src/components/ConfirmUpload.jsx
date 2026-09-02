import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

/**
 * An upload merges into the dataset every signed-in user sees, so it is
 * confirmed explicitly rather than firing straight off the file picker.
 */
export default function ConfirmUpload({
  file,
  activeCount = 0,
  deliveredCount = 0,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="modal-card" role="alertdialog" aria-modal="true">
        <h3>Confirm data upload</h3>

        <div className="confirm-file">
          <span className="confirm-file-icon">📄</span>
          <div>
            <strong>{file.name}</strong>
            <span>{fmtSize(file.size)}</span>
          </div>
        </div>

        <p className="modal-text">
          This file will be <strong>merged</strong> into the shared dataset.
          Matching records are updated in place and new rows are added — this
          is not a replacement, so nothing is deleted.
        </p>

        <div className="confirm-facts">
          <div>
            <span>Current active</span>
            <strong>{activeCount.toLocaleString('en-IN')}</strong>
          </div>
          <div>
            <span>Current delivered</span>
            <strong>{deliveredCount.toLocaleString('en-IN')}</strong>
          </div>
        </div>

        <div className="confirm-warn">
          ⚠ Everyone signed in to the dashboard will see the updated figures.
        </div>

        <div className="modal-actions">
          <button className="btn-sm btn-outline" onClick={onCancel}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            className="btn-sm btn-primary"
            onClick={onConfirm}
          >
            Upload &amp; Merge
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
