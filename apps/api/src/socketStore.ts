import { Socket } from "socket.io";

export type SocketStore = {
  broadcast(eventString: string): void; // TODO: This will probably get removed when sockets are bound to users
  getSocket(id: string): Socket | null;
  putSocket(id: string, socket: Socket): void;
  removeSocket(id: string): Socket | null;
  send(id: string, eventString: string): void;
};

const createSocketStore = () => {
  const socketMap = new Map<string, Socket>();
  return {
    broadcast: (eventType: string, event: Record<string, any>): void => {
      socketMap.forEach((socket: Socket, _key: string) => {
        socket.emit(eventType, event);
      });
    },
    getSocket: (id: string): Socket | null => {
      return socketMap.get(id) || null;
    },
    putSocket: (id: string, socket: Socket): void => {
      socketMap.set(id, socket);
    },
    removeSocket: (id: string): Socket | null => {
      const socket = socketMap.get(id) || null;
      socketMap.delete(id);
      return socket;
    },
    send: (id: string, eventType: string, event: Record<string, any>): void => {
      const socket = socketMap.get(id);
      if (!socket) {
        throw new Error(`Attempted to send event direct to unknown id: [${id}]`);
      }
      socket.emit(eventType, event);
    }
  };
}

export const socketStore = createSocketStore();
