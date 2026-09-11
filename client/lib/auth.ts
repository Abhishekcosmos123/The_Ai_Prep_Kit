import { api } from "./api";
import type { User } from "@/types/kit";

export async function register(input: {
  email: string;
  password: string;
  name: string;
}) {
  return api<{ user: User }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function login(input: { email: string; password: string }) {
  return api<{ user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function logout() {
  return api<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export async function me() {
  return api<{ user: User }>("/api/auth/me");
}
