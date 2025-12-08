import { io } from 'socket.io-client';
import { protocol, host, port } from './ApiConstants';

export const socket = io(`${protocol}://${host}:${port}`, {
  transports: [ "websocket"]
});
