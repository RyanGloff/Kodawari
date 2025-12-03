export type TaskResource = {
  id: string;
  name: string;
  deadline?: Date;
  deleted: boolean;
  created_at: Date;
  updated_at: Date;
  revision: bigint;
};
