import { z } from "zod";

export const taskCreatedEvent = "TaskCreated";
export type TaskCreated = {
  name: string;
  deadline?: Date;
};
export const taskCreatedSchema = z.object({
  name: z.string(),
  deadline: z.coerce.date().optional()
});

export const taskUpdatedEvent = "TaskUpdated";
export type TaskUpdated = {
  name: string;
  deadline?: Date
};
export const taskUpdatedSchema = z.object({
  name: z.string(),
  deadline: z.coerce.date().optional()
});

export const taskDeletedEvent = "TaskDeleted";
export type TaskDeleted = {};
export const taskDeletedSchema = z.object({});

export const taskCompletedEvent = "TaskCompleted";
export type TaskCompleted = {
  completedAt: Date
};
export const taskCompletedSchema = z.object({
  completedAt: z.coerce.date()
});

export const taskReopenedEvent = "TaskReopened";
export type TaskReopened = {
  reopenedAt: Date
};
export const taskReopenedSchema = z.object({
  reopenedAt: z.coerce.date()
});

export const events = [
  taskCreatedEvent,
  taskUpdatedEvent,
  taskDeletedEvent,
  taskCompletedEvent,
  taskReopenedEvent
];
