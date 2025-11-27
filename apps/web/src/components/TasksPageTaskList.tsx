import { useEffect, useState } from "react";
import type { TaskResource } from "../model";
import "./TasksPageTaskList.css";

export function TasksPageTaskList() {
  const [tasks, setTasks] = useState<TaskResource[]>([]);

  useEffect(() => {
    fetch("http://localhost:3000/api/task")
      .then((res) => res.json())
      .then((tasksRes) => setTasks(tasksRes.tasks));
  }, []);

  return (
    <div className="TasksPageTaskList">
      <h1>TasksList</h1>
      <ul>
        {tasks.map((task) =>
          task.deleted ? (
            ""
          ) : (
            <li key={task.id}>
              <details>
                <summary>
                  <h2 className="name">{task.name}</h2>
                </summary>
                <div className="body">
                  <div>
                    <label>Created At:</label>
                    <div>{task.created_at.toString()}</div>
                  </div>
                  <div>
                    <label>Updated At:</label>
                    <div>{task.updated_at.toString()}</div>
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
