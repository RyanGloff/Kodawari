import ReactDOM from "react-dom";

import "./CreateTaskDailog.css";
import { useState } from "react";

type CreateTaskDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function CreateTaskDialog({ open, onClose }: CreateTaskDialogProps) {
  const [name, setName] = useState<string>("");
  const [deadline, setDeadline] = useState<Date | null>(null);

  if (!open) return null;
  const host = window.location.hostname;

  const clearValues = () => {
    setName("");
    setDeadline(null);
  };

  const submitClicked = () => {
    const req = {
      name,
      deadline
    };

    fetch(`http://${host}:3000/api/task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    }).then(async (res) => {
      if (!(res.ok && res.status === 201)) {
        throw new Error(`Failed to create task: ${await res.json()}`);
      }
      return res.json();
    }).then(res => {
      console.log(`success: ${JSON.stringify(res)}`);
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
