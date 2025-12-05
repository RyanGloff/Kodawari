export type TaskResource = {
  id: string;
  name: string;
  deadline?: Date;
  completed_at?: Date;
  deleted: boolean;
  created_at: Date;
  updated_at: Date;
  revision: bigint;
};

export type GetTasksOptions = {
  includeDeleted: boolean;
};

const protocol = "http";
const host = window.location.hostname;
const port = 3000;
const apiPath = "/api";

const apiUrl = `${protocol}://${host}:${port}${apiPath}`;

export async function getTasks(
  options?: GetTasksOptions,
): Promise<TaskResource[]> {
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
  const tasks: TaskResource[] = body.tasks.map((task: any) => {
    task.deadline = task.deadline ? new Date(task.deadline) : undefined;
    task.created_at = new Date(task.created_at);
    task.updated_at = new Date(task.updated_at);
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
  nextExpectedRevision: bigint;
};
export async function markTaskComplete(
  taskId: string,
  expectedRevision: bigint,
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

  const body: { nextExpectedRevision: bigint } = await response.json();
  return body;
}

export type ReopenTaskResponse = {
  nextExpectedRevision: bigint;
};
export async function reopenTask(
  taskId: string,
  expectedRevision: bigint,
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

  const body: { nextExpectedRevision: bigint } = await response.json();
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
