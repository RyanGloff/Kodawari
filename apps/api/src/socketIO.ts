import { ZodError } from "zod/v4";
import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import {
  createTaskRequestedEvent,
  updateTaskRequestedEvent,
  deleteTaskRequestedEvent,
  LoginRequested,
  loginRequestedEvent,
  loginRequestedSchema,
  LoginAccepted,
  loginAcceptedEvent,
  loginAcceptedSchema,
  LoginDenied,
  loginDeniedEvent,
  loginDeniedSchema
} from "./events.js";
import { producer } from "./kafka.js";

// username to SocketIO socket
const clients = new Map<String, Socket>();
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 5; // Five days

const passthroughEvents = [
  createTaskRequestedEvent,
  updateTaskRequestedEvent,
  deleteTaskRequestedEvent
];

export const startSocketIO = (server: HttpServer) => {
  const io = new SocketIOServer(server);
  io.on("connection", (socket) => {
    console.log("Connected");

    socket.on("disconnect", () => {
      console.log("Disconnected");
    });

    socket.on("loginRequested", (event) => {
      let request: LoginRequested;
      try {
        request = loginRequestedSchema.parse(event);
      } catch (e) {
        if (e instanceof ZodError) {
          const denial: LoginDenied = {
            reason: `Invalid request: ${e}`
          };
          socket.emit(loginDeniedEvent, JSON.stringify(denial));
          return;
        }
        const denial: LoginDenied = {
          reason: `Internal Server Error`
        };
        socket.emit(loginDeniedEvent, JSON.stringify(denial));
        return;
      }
      
      // Check valid login
      // TODO: replace with actual checking

      // bind to socket to username
      clients.set(request.username, socket);

      // Send login approval
      const currentTime = new Date();
      const acceptance: LoginAccepted = {
        username: request.username,
        sessionTimeout: new Date(currentTime.getTime() + SESSION_DURATION_MS)
      };
      socket.emit(loginAcceptedEvent, JSON.stringify(acceptance));
      
      // After login register user socket for events
      passthroughEvents.forEach(eventType => {
        socket.on(eventType, (event) => {
          producer.send({
            topic: eventType,
            messages: [event]
          });
        });
      });
    });

  });
};
