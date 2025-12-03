import { useEffect, useState } from "react";
import type { TaskResource } from "../model";
import "./TasksPageTaskList.css";

export function TasksPageTaskList() {
  const [tasks, setTasks] = useState<TaskResource[]>([]);

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

  const host = window.location.hostname;

  useEffect(() => {
    fetch(`http://${host}:3000/api/task`)
      .then((res) => res.json())
      .then((tasksRes: { tasks: TaskResource[] }) =>
        tasksRes.tasks.map((task) => {
          task.deadline = task.deadline ? new Date(task.deadline) : undefined;
          task.created_at = new Date(task.created_at);
          task.updated_at = new Date(task.updated_at);
          return task;
        }),
      )
      .then((tasks: TaskResource[]) =>
        setTasks(tasks.sort(compareTaskResourceExpiration)),
      ); // TODO: Change this when deadlines are introduced
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
    fetch(`http://${host}:3000/api/task/${id}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision,
      }),
    }).then((res) => {
      if (res.ok && res.status === 202) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === id ? { ...task, completed_at: new Date() } : task,
          ),
        );
      }
    });
  };

  const deleteClicked = (id: string): void => {
    fetch(`http://${host}:3000/api/task/${id}`, {
      method: "DELETE",
    }).then((res) => {
      if (res.ok && res.status === 202) {
        setTasks((prev) => prev.filter((task) => task.id !== id));
      } else {
        console.error(
          `Failed to delete task with id [${id}]. Response code [${res.status}]`,
        );
      }
    });
  };

  return (
    <div className="TasksPageTaskList">
      <div className="header">
        <button className="add-new">+</button>
      </div>
      <ul>
        {tasks.map((task) =>
          task.deleted ? (
            ""
          ) : (
            <li key={task.id}>
              <details>
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
                  <div>
                    <label>Updated At:</label>
                    <div>{getCommonDateString(task.updated_at)}</div>
                  </div>
                  <div>
                    <label>Revision:</label>
                    <div>{task.revision}</div>
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
