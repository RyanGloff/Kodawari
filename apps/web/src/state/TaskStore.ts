import type { ApiTaskResource } from '@model/TaskResource';
import { create } from 'zustand';

export interface TaskMap {
  [id: string]: ApiTaskResource
}

export interface TaskStore {
  tasks: TaskMap

  // Actions
  hydrate: (list: ApiTaskResource[]) => void;
  add: (task: ApiTaskResource) => void;
  update: (task: ApiTaskResource) => void;
  markComplete: (id: string, completedAt: Date, nextExpectedRevision: number) => void;
  reopen: (id: string, nextExpectedRevision: number) => void;
  remove: (id: string) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: {},

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
        [id]: { ... state.tasks[id], completedAt: null, revision: nextExpectedRevision }
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




