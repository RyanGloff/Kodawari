export type TaskResource = {
  id: string;
  name: string;
  deleted: boolean;
  created_at: Date;
  updated_at: Date;
  revision: bigint;
};
