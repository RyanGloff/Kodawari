import { useEffect, useState } from "react";
import type { TaskResource } from "../model";
import "./TasksPageTaskList.css";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { deleteTask, getTasks, markTaskComplete, reopenTask, type MarkTaskCompleteResponse } from "../api/TaskApiClient";

export function TasksPageTaskList() {
  const [tasks, setTasks] = useState<TaskResource[]>([]);

  const [ createDialogIsOpen, setCreateDialogIsOpen ] = useState<boolean>(false);

  const compareTaskResourceExpiration = (
    t1: TaskResource,
    t2: TaskResource,
  ): number => {
    if (!t1.deadline) {
      if (!t2.deadline) {
        return t1.created_at.getTime() - t2.created_at.getTime();
      }
      return 1;
    }
    if (!t2.deadline) {
      return -1;
    }
    return t1.deadline.getTime() - t2.deadline.getTime();
  };

  useEffect(() => {
    getTasks()
    .then((tasks: TaskResource[]) =>
      setTasks(tasks.sort(compareTaskResourceExpiration))
    );
  }, []);

  const deadlineToTimeLeft = (deadline: Date) => {
    const to = new Date();
    const ms = deadline.getTime() - to.getTime();
    const abs = Math.abs(ms);

    const minutes = Math.floor(abs / (1000 * 60));
    const hours = Math.floor(abs / (1000 * 60 * 60));
    const days = Math.floor(abs / (1000 * 60 * 60 * 24));

    let result: string;

    if (minutes < 60) result = `${minutes} minutes`;
    else if (hours < 24) result = `${hours} hours`;
    else result = `${days} days`;

    return ms >= 0 ? `${result} left` : `${result} ago`;
  };

  const createdAtToSimpleDate = (createdAt: Date): string => {
    const now = new Date();
    if (createdAt.getFullYear() === now.getFullYear()) {
      return `${createdAt.getMonth()}/${createdAt.getDay()}`;
    }
    return `${createdAt.getMonth()}/${createdAt.getDay()}/${createdAt.getFullYear()}`;
  };

  const getSeverityLevel = (task: TaskResource): string => {
    if (!task.deadline) {
      return "";
    }

    if (task.completed_at) {
      return "";
    }

    const now = new Date();
    if (task.deadline.getTime() <= now.getTime() + 1000 * 60 * 60 * 24 * 7) {
      return "severe";
    }

    if (task.deadline.getTime() <= now.getTime() + 1000 * 60 * 60 * 24 * 30) {
      return "warning";
    }

    return "ok";
  };

  const getCommonDateString = (date: Date): string => {
    return `${date.getMonth()}/${date.getDate()}/${date.getFullYear()}`;
  };

  const markDoneClicked = (id: string, expectedRevision: bigint): void => {
    markTaskComplete(id, expectedRevision)
    .then((response: MarkTaskCompleteResponse) => {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? {
                ...task,
                completed_at: new Date(),
                revision: response.nextExpectedRevision,
              }
            : task,
        ),
      );
      const detailsEle = document.getElementById(`TaskDetailsElement-${id}`) as HTMLDetailsElement | null;
      if (detailsEle) {
        detailsEle.open = false;
      }
    })
    .catch((e) => {
      console.error(e);
    });
  };

  const reopenClicked = (id: string, expectedRevision: bigint): void => {
    reopenTask(id, expectedRevision)
    .then((response) => {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? {
                ...task,
                completed_at: undefined,
                revision: response.nextExpectedRevision,
              }
            : task,
        ),
      );
    })
    .catch((e) => {
      console.error(e);
    });
  };

  const deleteClicked = (id: string): void => {
    deleteTask(id)
    .then(() => {
        setTasks(prev => prev.filter(task => task.id !== id));
    });
  };

  return (
    <div className="TasksPageTaskList">
      <button className="add-new" onClick={() => setCreateDialogIsOpen(true)}>+</button>
      <CreateTaskDialog
        open={createDialogIsOpen}
        onClose={() => setCreateDialogIsOpen(false)}/>
      <ul>
        {tasks.map((task) =>
          task.deleted ? (
            ""
          ) : (
            <li key={task.id}>
              <details id={`TaskDetailsElement-${task.id}`}>
                <summary>
                  <div className="name">{task.name}</div>
                  <div className={`timeline ${getSeverityLevel(task)}`}>
                    {task.completed_at ? "COMPLETE" : ""}
                    {!task.completed_at && task.deadline
                      ? deadlineToTimeLeft(task.deadline)
                      : ""}
                    {task.completed_at || task.deadline
                      ? ""
                      : `Created: ${createdAtToSimpleDate(task.created_at)}`}
                  </div>
                </summary>
                <div className="body">
                  <div className="actions">
                    {task.completed_at ? (
                      ""
                    ) : (
                      <button
                        className="mark-done"
                        onClick={() => markDoneClicked(task.id, task.revision)}
                      >
                        Mark Done
                      </button>
                    )}
                    {!task.completed_at ? (
                      ""
                    ) : (
                      <button
                        className="reopen"
                        onClick={() => reopenClicked(task.id, task.revision)}
                      >
                        Reopen
                      </button>
                    )}
                    <button
                      className="delete"
                      onClick={() => deleteClicked(task.id)}
                    >
                      Delete
                    </button>
                  </div>
                  {task.deadline ? (
                    <div>
                      <label>Deadline:</label>
                      <div>{getCommonDateString(task.deadline)}</div>
                    </div>
                  ) : (
                    ""
                  )}
                  {task.completed_at ? (
                    <div>
                      <label>Completed At:</label>
                      <div>{getCommonDateString(task.created_at)}</div>
                    </div>
                  ) : (
                    ""
                  )}
                  <div>
                    <label>Created At:</label>
                    <div>{getCommonDateString(task.created_at)}</div>
                  </div>
                </div>
              </details>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
