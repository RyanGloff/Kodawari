import ReactDOM from "react-dom";

import './dialog.css';
import "./CreateTaskDailog.css";
import "./AppleCheckBox.css";
import { useState } from "react";
import { createTask } from "../api/TaskApiClient";
import { useToast } from "./toast/ToastContext";

type CreateTaskDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function CreateTaskDialog({ open, onClose }: CreateTaskDialogProps) {
  const defaultDeadlines: {
    label: { quantity: number; scale: string };
    value: number;
  }[] = [
    { label: { quantity: 1, scale: "Day" }, value: 24 * 60 * 60 * 1000 },
    { label: { quantity: 1, scale: "Week" }, value: 7 * 24 * 60 * 60 * 1000 },
    { label: { quantity: 2, scale: "Week" }, value: 14 * 24 * 60 * 60 * 1000 },
    { label: { quantity: 1, scale: "Month" }, value: 30 * 24 * 60 * 60 * 1000 },
    { label: { quantity: 3, scale: "Month" }, value: 60 * 24 * 60 * 60 * 1000 },
  ];
  const { addToast } = useToast();

  const [name, setName] = useState<string>("");
  const [deadline, setDeadline] = useState<Date | null>(null);

  if (!open) return null;

  const clearValues = () => {
    setName("");
    setDeadline(null);
  };

  const submitClicked = () => {
    const req = {
      name,
      deadline,
    };

    createTask(req).catch((e) => {
      addToast("Failed to create task", "error");
      console.error(e);
    });

    clearValues();
    onClose();
  };

  const cancelClicked = () => {
    clearValues();
    onClose();
  };

  const toInputDateString = (date: Date | null): string => {
    if (date === null) {
      return "";
    }
    return date.toISOString().split("T")[0];
  };

  const defaultDeadlineClicked = (deltaT: number): void => {
    const deadline = new Date();
    deadline.setTime(new Date().getTime() + deltaT);
    setDeadline(deadline);
  };

  return ReactDOM.createPortal(
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
        <h2>Create Task</h2>

        <input
          type="text"
          placeholder="Task Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="date"
          name="deadline"
          value={toInputDateString(deadline)}
          onChange={(e) => setDeadline(new Date(e.target.value))}
        />

        <div className="default-deadline-container">
          {defaultDeadlines.map((entry) => (
            <button
              className="default-deadline"
              onClick={() => defaultDeadlineClicked(entry.value)}
              key={`${entry.label.quantity}-${entry.label.scale}`}
            >
              <div>{entry.label.quantity}</div>
              <div>
                {entry.label.quantity === 1
                  ? entry.label.scale
                  : `${entry.label.scale}s`}
              </div>
            </button>
          ))}
        </div>

        <button className="submit" onClick={submitClicked}>
          Create
        </button>
        <button className="cancel" onClick={cancelClicked}>
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  );
}
