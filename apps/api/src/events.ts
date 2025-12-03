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

export const events = [taskCreatedEvent, taskUpdatedEvent, taskDeletedEvent];
