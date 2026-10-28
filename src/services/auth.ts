import type { AuthService } from "../types";
// Demo adapter only. Production must replace this with a server session and enforce roles on every API.
export const demoAuth: AuthService = {
  async login(role) {
    return {
      displayName: role === "admin" ? "مدير العائلة" : "مشاهد العائلة",
      role,
      mode: "local-demo",
    };
  },
  async logout() {},
};
