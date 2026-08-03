export type Role = "owner" | "operario";

export interface Profile {
  id: string;
  displayName: string;
  role: Role;
  isSharedDevice: boolean;
}
