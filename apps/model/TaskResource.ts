export type ApiTaskResource = {
  id: string;           // Name of the KurrentDB stream
  name: string;         // Event field
  deadline?: Date;      // Event field
  completedAt?: Date;   // Created time of latest KurrentDBTaskCompleted Event
  createdAt: Date;      // Created time of KurrentDBTaskCreated Event
  updatedAt: Date;      // Created time of latest KurrentDB Event
  deletedAt?: Date;     // Created time of KurrentDBTaskDeleted Event
  revision: number;     // Revision of latest KurrentDB Event
};

// Event Names
export const TaskCreatedEvent = "TaskCreated";
export const TaskUpdatedEvent = "TaskUpdated";
export const TaskCompletedEvent = "TaskCompleted";
export const TaskReopenedEvent = "TaskReopened";
export const TaskDeletedEvent = "TaskDeleted";

// SocketIO Events
export type ApiTaskCreated = {
  id: string;
  name: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiTaskUpdated = {
  id: string;
  name: string;
  deadline?: string;
  updatedAt: string;
  revision: number;
};

export type ApiTaskCompleted = {
  id: string;
  completedAt: string;
  revision: number;
};

export type ApiTaskReopened = {
  id: string;
  revision: number;
};

export type ApiTaskDeleted = {
  id: string;
  deletedAt: string;
};

// KurrentDB Events
export type KurrentDBTaskCreated = {
  name: string;
  deadline?: Date;
};

export type KurrentDBTaskUpdated = {
  name: string;
  deadline?: Date;
};

export type KurrentDBTaskCompleted = {
  completedAt: Date;
};

export type KurrentDBTaskReopened = {};

export type KurrentDBTaskDeleted = {};


