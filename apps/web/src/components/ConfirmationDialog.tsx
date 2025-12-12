import './dialog.css';
import './ConfirmationDialog.css';
import ReactDOM from "react-dom";

type ConfirmationDialogProps = {
  open: boolean;
  onClose: (accepted: boolean) => void;
};

export function ConfirmationDialog({ open, onClose }: ConfirmationDialogProps) {
  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="dialog-backdrop" onClick={() => onClose(false)}>
      <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
        <h2>Are you sure?</h2>
        <button className="confirm" onClick={() => onClose(true)}>Confirm</button>
        <button className="close" onClick={() => onClose(false)}>Cancel</button>
      </div>
    </div>,
    document.body
  );
}
