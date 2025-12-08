import type { ApiTaskResource } from "@model/TaskResource";
import { apiUrl } from "./ApiConstants";

export type GetTasksOptions = {
  includeDeleted: boolean;
};

export async function getTasks(
  options?: GetTasksOptions,
): Promise<ApiTaskResource[]> {
  const response = await fetch(`${apiUrl}/task`, {
    method: "GET",
    headers: {
      ContentType: "application/json",
    },
    body: options ? JSON.stringify(options) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Failed to get tasks`);
  }

  const body = await response.json();
  const tasks: ApiTaskResource[] = body.tasks.map((task: any) => {
    task.deadline = task.deadline ? new Date(task.deadline) : undefined;
    task.createdAt = new Date(task.createdAt);
    task.updatedAt = new Date(task.updatedAt);
    return task;
  });

  return tasks;
}

export type CreateTaskResponse = {
  id: string,
  status: string
};
export type CreateTaskOptions = {
  name: string
  deadline?: Date | null
};
export async function createTask(options: CreateTaskOptions): Promise<CreateTaskResponse> {
  const response = await fetch(`${apiUrl}/task`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(options)
  });

  if (!response.ok) {
    throw new Error(`Failed to create task`);
  }

  const body = await response.json();
  return body;
};

export type MarkTaskCompleteResponse = {
  nextExpectedRevision: number;
};
export async function markTaskComplete(
  taskId: string,
  expectedRevision: number,
): Promise<MarkTaskCompleteResponse> {
  const response = await fetch(`${apiUrl}/task/${taskId}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expectedRevision }),
  });

  if (!response.ok) {
    throw new Error(`Failed to mark task complete: [${taskId}]`);
  }

  const body: { nextExpectedRevision: number } = await response.json();
  return body;
}

export type ReopenTaskResponse = {
  nextExpectedRevision: number;
};
export async function reopenTask(
  taskId: string,
  expectedRevision: number,
): Promise<ReopenTaskResponse> {
  const response = await fetch(`${apiUrl}/task/${taskId}/reopen`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expectedRevision }),
  });

  if (!response.ok) {
    throw new Error(`Failed to reopen task: [${taskId}]`);
  }

  const body: { nextExpectedRevision: number } = await response.json();
  return body;
}

export async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`${apiUrl}/task/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete task with id [${id}]`);
  }
}
