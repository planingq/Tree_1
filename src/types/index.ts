export type Person = {
  id: string;
  name: string;
  status: 1 | 2;
  siblingOrder: number;
  fatherName: string;
  parentId: string;
  customFields: Record<string, string>;
};
export type Issue = {
  row: number;
  message: string;
  level: "error" | "warning";
};
export type Role = "admin" | "viewer";
export type AuthSession = {
  displayName: string;
  role: Role;
  mode: "local-demo";
};
export interface AuthService {
  login(role: Role): Promise<AuthSession>;
  logout(): Promise<void>;
}
