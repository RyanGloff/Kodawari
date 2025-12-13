import { useState } from "react";
import "./TasksPageTaskList.css";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { TasksPageFiltersDialog } from './TasksPageFiltersDialog';
import {
  deleteTask,
  getTasks,
  markTaskComplete,
  reopenTask,
} from "../api/TaskApiClient";
import {
  getCommonDateString,
  getRelativeTimeString,
  getSimpleDate,
} from "../utils/DateUtils";
import { useTaskStore, type TaskMap, type TaskStore } from "../state/TaskStore";
import { useToast } from "./toast/ToastContext";
import { useTaskEvents } from "../hooks/useTaskEvents";
import type { ApiTaskResource } from "@model/TaskResource";
import { ConfirmationDialog } from "./ConfirmationDialog";

export type Filters = {
  showCompleted: boolean;
};

const TASK_PAGE_FILTERS_LS_KEY = 'TasksPageTaskListFilters';

function getFiltersFromLocalStorage(): Filters | null {
  const json = localStorage.getItem(TASK_PAGE_FILTERS_LS_KEY);
  if (!json) {
    return null;
  }
  return JSON.parse(json);
}

export function TasksPageTaskList() {
  const hydrate = useTaskStore((s: TaskStore) => s.hydrate);
  const getSorted = useTaskStore((s: TaskStore) => s.getSortedTasks);
  const persistedFiltersJSON = getFiltersFromLocalStorage() || {
    showCompleted: true
  }
  const [ filters, setFiltersReact ] = useState<Filters>(persistedFiltersJSON);
  const setFilters = (filters: Filters): void => {
    localStorage.setItem(TASK_PAGE_FILTERS_LS_KEY, JSON.stringify(filters));
    setFiltersReact(filters);
  };
  const [ filtersDialogIsOpen, setFiltersDialogIsOpen ] = useState(false);

  const getTaskList = async (): Promise<ApiTaskResource[]> => {
    const tasks = await getTasks();
    hydrate(tasks);
    return getSorted();
  };

  useTaskEvents(getTaskList);

  const taskMap: TaskMap = useTaskStore((s: TaskStore) => s.tasks);
  const [createDialogIsOpen, setCreateDialogIsOpen] = useState<boolean>(false);

  const { addToast } = useToast();

  const getSeverityLevel = (task: ApiTaskResource): string => {
    if (!task.deadline) {
      return "";
    }

    if (task.completedAt) {
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

  const markDoneClicked = (id: string, expectedRevision: number): void => {
    markTaskComplete(id, expectedRevision)
      .then((_v: any) => {
        const detailsEle = document.getElementById(
          `TaskDetailsElement-${id}`,
        ) as HTMLDetailsElement | null;
        if (detailsEle) {
          detailsEle.open = false;
        }
      })
      .catch((e: any) => {
        addToast("Failed to mark task complete", "error");
        console.error(e);
      });
  };

  const reopenClicked = (id: string, expectedRevision: number): void => {
    reopenTask(id, expectedRevision).catch((e: any) => {
      addToast("Failed to reopen task", "error");
      console.error(e);
    });
  };

  const deleteClicked = (id: string): void => {
    setTaskIdToDelete(id);
    setDeleteConfirmationOpen(true);
  };
  
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [taskIdToDelete, setTaskIdToDelete] = useState<string | null>(null);

  const deleteConfirmationClosed = (accepted: boolean): void => {
    setDeleteConfirmationOpen(false);
    if (!accepted || !taskIdToDelete) {
      return;
    }

    deleteTask(taskIdToDelete).catch((e: any) => {
      addToast("Failed to delete task", "error");
      console.error(e);
    });
  };

  return (
    <div className="TasksPageTaskList">
      <div className="floating-buttons">
        <button className="show-filters" onClick={() => setFiltersDialogIsOpen(true)}>
          <img src="/Filter.svg" alt="filter icon"/>
        </button>
        <button className="add-new" onClick={() => setCreateDialogIsOpen(true)}>
          +
        </button>
      </div>
      <CreateTaskDialog
        open={createDialogIsOpen}
        onClose={() => setCreateDialogIsOpen(false)}
      />
      <TasksPageFiltersDialog
        open={filtersDialogIsOpen}
        filters={filters}
        updateFilters={setFilters}
        onClose={() => setFiltersDialogIsOpen(false)}
      />
      <ConfirmationDialog
        open={deleteConfirmationOpen}
        onClose={deleteConfirmationClosed}
        />
      <ul>
        {Object.values(taskMap).map((task: ApiTaskResource) =>
          task.deletedAt || (task.completedAt && !filters.showCompleted) ? (
            ""
          ) : (
            <li key={task.id}>
              <details id={`TaskDetailsElement-${task.id}`}>
                <summary>
                  <div className="name">
                    <h2>{task.name}</h2>
                  </div>
                  <div className={`timeline ${getSeverityLevel(task)}`}>
                    {task.completedAt ? "COMPLETE" : ""}
                    {!task.completedAt && task.deadline
                      ? getRelativeTimeString(task.deadline)
                      : ""}
                    {task.completedAt || task.deadline
                      ? ""
                      : `Created: ${getSimpleDate(task.createdAt)}`}
                  </div>
                </summary>
                <div className="body">
                  <div className="actions">
                    {task.completedAt ? (
                      <button
                        className="reopen"
                        onClick={() => reopenClicked(task.id, task.revision)}
                      >
                        Reopen
                      </button>
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
                  <ul className="tag-list">
                    {task.tags
                      ? task.tags.map((tag) => (
                          <li key={`${task.id}${tag.id}`}>{tag.name}</li>
                        ))
                      : ""}
                  </ul>
                  {task.deadline ? (
                    <div>
                      <label>Deadline:</label>
                      <div>{getCommonDateString(task.deadline)}</div>
                    </div>
                  ) : (
                    "No Deadline Set"
                  )}
                  {task.completedAt ? (
                    <div>
                      <label>Completed At:</label>
                      <div>{getCommonDateString(task.createdAt)}</div>
                    </div>
                  ) : (
                    ""
                  )}
                  <div>
                    <label>Created At:</label>
                    <div>{getCommonDateString(task.createdAt)}</div>
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
