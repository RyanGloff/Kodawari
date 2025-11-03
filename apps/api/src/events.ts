import { z } from "zod";

export const taskCreatedEvent = "TaskCreated";
export type TaskCreated = {
  name: string
};
export const taskCreatedSchema = z.object({
  name: z.string()
});

export const taskUpdatedEvent = "TaskUpdatedEvent";
export type TaskUpdated = {
  name: string
}
export const taskUpdatedSchema = z.object({
  name: z.string()
});

export const taskDeletedEvent = "TaskDeleted";
export type TaskDeleted = {};
export const taskDeletedSchema = z.object({});

export const events = [
  taskCreatedEvent,
  taskUpdatedEvent,
  taskDeletedEvent,
];
