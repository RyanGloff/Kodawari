import type { ApiTaskResource } from '@model/TaskResource';
import { create } from 'zustand';

export interface TaskMap {
  [id: string]: ApiTaskResource
}

export interface TaskStore {
  tasks: TaskMap,

  // Actions
  getSortedTasks: () => ApiTaskResource[];
  hydrate: (list: ApiTaskResource[]) => void;
  add: (task: ApiTaskResource) => void;
  update: (task: ApiTaskResource) => void;
  markComplete: (id: string, completedAt: Date, nextExpectedRevision: number) => void;
  reopen: (id: string, nextExpectedRevision: number) => void;
  remove: (id: string) => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: {},

  getSortedTasks: () => {
    const tasks = Object.values(get().tasks);
    const openWithDeadline: ApiTaskResource[] = [];
    const openNoDeadline: ApiTaskResource[] = [];
    const completed: ApiTaskResource[] = [];
    const deleted: ApiTaskResource[] = [];

    for (const task of tasks) {
      if (task.deletedAt) {
        deleted.push(task);
      } else if (task.completedAt) {
        completed.push(task);
      } else if (task.deadline) {
        openWithDeadline.push(task);
      } else {
        openNoDeadline.push(task);
      }
    }

    openWithDeadline.sort((a, b) => a.deadline!.getTime() - b.deadline!.getTime());
    openNoDeadline.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    completed.sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime());
    deleted.sort((a, b) => b.deletedAt!.getTime() - a.deletedAt!.getTime());

    return [
      ...openWithDeadline,
      ...openNoDeadline,
      ...completed,
      ...deleted
    ];
  },

  hydrate: (tasks: ApiTaskResource[]) => set(() => {
    const map: TaskMap = {};
    for (const task of tasks) map[task.id] = task;
    return { tasks: map };
  }),

  add: (task: ApiTaskResource) => set((state: { tasks: TaskMap }) => {
    return {
      tasks: {
        ... state.tasks,
        [task.id]: {
          ... state.tasks[task.id],
          ... task
        }
      }
    };
  }),
  update: (task: ApiTaskResource) => set((state: { tasks: TaskMap }) => {
    if (!(task.id in state.tasks)) return state;
    return {
      tasks: {
        ... state.tasks,
        [task.id]: {
          ... state.tasks[task.id],
          ... task
        }
      }
    };
  }),
  markComplete: (id: string, completedAt: Date, nextExpectedRevision: number) => set((state: { tasks: TaskMap }) => {
    if (!(id in state.tasks)) return state;
    return {
      tasks: {
        ... state.tasks,
        [id]: { ... state.tasks[id], completedAt: completedAt, revision: nextExpectedRevision }
      }
    };
  }),
  reopen: (id: string, nextExpectedRevision: number) => set((state: { tasks: TaskMap }) => {
    if (!(id in state.tasks)) return state;
    return {
      tasks: {
        ... state.tasks,
        [id]: { ... state.tasks[id], completedAt: undefined, revision: nextExpectedRevision }
      }
    };
  }),
  remove: (id: string) => set ((state: { tasks: TaskMap }) => {
    if (!(id in state.tasks)) return state;
    const newMap = { ...state.tasks };
    delete newMap[id];
    return { tasks: newMap };
  })
}));




