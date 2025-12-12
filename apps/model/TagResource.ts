export type ApiTagResource = {
  id: string;           // Name of the KurrentDB stream
  name: string;         // Event field
  createdAt: Date;      // Created time of KurrentDBTagCreated Event
  updatedAt: Date;      // Created time of latest KurrentDB Event
  deletedAt?: Date;     // Created time of KurrentDBTagDeleted Event
  revision: number;     // Revision of latest KurrentDB Event
};

// Event Names
export const TagCreatedEvent = "TagCreated";
export const TagUpdatedEvent = "TagUpdated";
export const TagDeletedEvent = "TagDeleted";

// SocketIO Events
export type ApiTagCreated = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiTagUpdated = {
  id: string;
  name: string;
  updatedAt: string;
  revision: number;
};

export type ApiTagDeleted = {
  id: string;
  deletedAt: string;
};

// KurrentDB Events
export type KurrentDBTagCreated = {
  name: string;
};

export type KurrentDBTagUpdated = {
  name: string;
};

export type KurrentDBTagDeleted = {};
