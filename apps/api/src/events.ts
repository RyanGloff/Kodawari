import { z } from "zod";

export type Task = {
  createdAt: Date;
  name: string;
  updatedAt: Date;
};
export const taskSchema = z.object({
  createdAt: z.coerce.date(),
  name: z.string(),
  updatedAt: z.coerce.date(),
});

export const loginRequestedEvent = "LoginRequested";
export type LoginRequested = {
  username: string;
  password: string;
};
export const loginRequestedSchema = z.object({
  username: z.string(),
  password: z.string()
});

export const loginAcceptedEvent = "LoginAcceptedEvent";
export type LoginAccepted = {
  username: string;
  sessionTimeout: Date;
};
export const loginAcceptedSchema = z.object({
  username: z.string(),
  sessionTimeout: z.coerce.date()
});

export const loginDeniedEvent = "LoginDenied";
export type LoginDenied = {
  reason: string;
};
export const loginDeniedSchema = z.object({
  reason: z.string()
});

export const createTaskRequestedEvent = "CreateTaskRequested";
export type CreateTaskRequested = {
  name: string;
};
export const createTaskRequestedSchema = z.object({
  name: z.string(),
});

export const taskCreatedEvent = "TaskCreated";
export type TaskCreated = Task;
export const taskCreatedSchema = taskSchema;

export const getTaskRequestedEvent = "GetTaskRequested";
export type GetTaskRequested = {
  id?: string;
};
export const getTaskRequestedSchema = z.object({
  id: z.string().optional(),
});

export const getTaskResponseEvent = "GetTaskResponse";
export type GetTaskResponse = {
  query: GetTaskRequested;
  tasks: Task[];
};
export const getTaskResponseSchema = z.object({
  query: getTaskRequestedSchema,
  tasks: z.array(taskSchema),
});

export const updateTaskRequestedEvent = "UpdateTaskRequested";
export type UpdateTaskRequested = {
  name?: string;
};
export const updateTaskRequestedSchema = z.object({
  name: z.string().optional(),
});

export const taskUpdatedEvent = "TaskUpdatedEvent";
export type TaskUpdated = Task;
export const taskUpdatedSchema = taskSchema;

export const deleteTaskRequestedEvent = "DeleteTaskRequested";
export type DeleteTaskRequested = {
  taskId: string;
};
export const deleteTaskRequestedSchema = z.object({ taskId: z.string() });

export const taskDeletedEvent = "TaskDeleted";
export type TaskDeleted = {
  taskId: string;
};
export const taskDeletedSchema = z.object({
  taskId: z.string(),
});

export const events = [
  createTaskRequestedEvent,
  taskCreatedEvent,
  getTaskRequestedEvent,
  getTaskResponseEvent,
  updateTaskRequestedEvent,
  taskUpdatedEvent,
  deleteTaskRequestedEvent,
  taskDeletedEvent,
];
