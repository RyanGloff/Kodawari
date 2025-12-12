import { ChangeEvent } from "react";
import { Filters } from "./TasksPageTaskList";
import './dialog.css';
import './TasksPageFiltersDialog.css';
import ReactDOM from "react-dom";

type TasksPageFiltersDialogProps = {
  open: boolean;
  filters: Filters;
  updateFilters: (filters: Filters) => void;
  onClose: () => void;
};

export function TasksPageFiltersDialog({ open, filters, updateFilters, onClose }: TasksPageFiltersDialogProps) {
  if (!open) return null;

  const showCompletedChanged = (e: ChangeEvent<HTMLInputElement> ) => {
    updateFilters({
      ...filters,
      showCompleted: e.target.checked
    });
  }

  return ReactDOM.createPortal(
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
        <h2>Filters</h2>
        <div className="checkbox-container">
          <label>Show completed:</label>
          <input
            type="checkbox"
            className="apple"
            checked={filters.showCompleted}
            onChange={showCompletedChanged}
          />
        </div>

        <button className="close" onClick={onClose}>Close</button>
      </div>
    </div>,
    document.body
  );
}
