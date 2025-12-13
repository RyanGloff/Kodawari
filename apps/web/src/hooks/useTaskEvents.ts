import { useEffect } from "react";
import { socket } from "../api/SocketClient.js";
import { useTaskStore } from "../state/TaskStore.js";
import {
  TaskCompletedEvent,
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskReopenedEvent,
  TaskUpdatedEvent,
  type ApiTaskCompleted,
  type ApiTaskCreated,
  type ApiTaskDeleted,
  type ApiTaskReopened,
  type ApiTaskResource,
  type ApiTaskUpdated,
} from "@model/TaskResource.js";
import { useToast } from "../components/toast/ToastContext.js";

export const useTaskEvents = (getTaskListFn: () => Promise<ApiTaskResource[]>) => {
  const { addToast } = useToast();

  const hydrate = useTaskStore((s) => s.hydrate);
  const add = useTaskStore((s) => s.add);
  const update = useTaskStore((s) => s.update);
  const markComplete = useTaskStore((s) => s.markComplete);
  const reopen = useTaskStore((s) => s.reopen);
  const remove = useTaskStore((s) => s.remove);
  const tasks = useTaskStore((s) => s.tasks);

  useEffect(() => {
    (async () => {
      const list = await getTaskListFn();
      hydrate(list);
    })();

    socket.on(TaskCreatedEvent, (createdEvent: ApiTaskCreated) => {
      addToast("Task Created");
      add({
        ...createdEvent,
        createdAt: new Date(createdEvent.createdAt),
        deadline: createdEvent.deadline ? new Date(createdEvent.deadline) : undefined,
        updatedAt: new Date(createdEvent.updatedAt),
        deletedAt: undefined,
        revision: 0,
        tags: []
      });
    });
    socket.on(TaskUpdatedEvent, (updatedEvent: ApiTaskUpdated) => {
      addToast("Task Updated");
      const existing = tasks[updatedEvent.id];
      update({
        createdAt: existing.createdAt,
        tags: existing.tags,
        ...updatedEvent,
        updatedAt: new Date(updatedEvent.updatedAt),
        deadline: updatedEvent.deadline ? new Date(updatedEvent.deadline) : undefined

      });
    });
    socket.on(TaskCompletedEvent, (event: ApiTaskCompleted) => {
      addToast("Task Completed");
      markComplete(event.id, new Date(event.completedAt), event.revision)
    });
    socket.on(TaskReopenedEvent, (event: ApiTaskReopened) => {
      addToast("Task Reopened");
      reopen(event.id, event.revision);
    });
    socket.on(TaskDeletedEvent, (event: ApiTaskDeleted) => {
      addToast("Task Deleted");
      remove(event.id);
    });

    return () => {
      socket.off(TaskCreatedEvent);
      socket.off(TaskUpdatedEvent);
      socket.off(TaskCompletedEvent);
      socket.off(TaskReopenedEvent);
      socket.off(TaskDeletedEvent);
    };
  }, [hydrate, add, update, markComplete, reopen, remove]);
};
