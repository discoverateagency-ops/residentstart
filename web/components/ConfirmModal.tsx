"use client";
export function ConfirmModal({ open, title, children, confirmLabel = "Confirm", onConfirm, onCancel }: { open: boolean; title: string; children?: React.ReactNode; confirmLabel?: string; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal aria-labelledby="cm-title" onClick={onCancel}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 id="cm-title" className="text-lg">{title}</h2>
        <div className="mt-2 text-sm text-rs-ink/80">{children}</div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={onConfirm} autoFocus>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
