import { User } from "../types";
import { apiRequest } from "../lib/api";

export const requestLoginOtp = async (email: string, password: string): Promise<void> => {
  await apiRequest("/auth/request-otp", { method: "POST", body: { email, password } });
};

export const verifyLoginOtp = async (email: string, password: string, otp: string): Promise<User | null> => {
  const result = await apiRequest<{ user: User | null }>("/auth/verify-otp", {
    method: "POST",
    body: { email, password, otp },
  });
  return result.user;
};

export const registerAdmin = async (name: string, email: string, password: string, institutionName: string): Promise<User | null> => {
  const result = await apiRequest<{ user: User | null }>("/auth/register-admin", {
    method: "POST",
    body: { name, email, password, institutionName },
  });
  return result.user;
};

export const registerTeacher = async (name: string, email: string, password: string, adminIdentifier: string): Promise<User | null> => {
  const result = await apiRequest<{ user: User | null }>("/auth/register-teacher", {
    method: "POST",
    body: { name, email, password, adminIdentifier },
  });
  return result.user;
};

export const loginStudent = async (registerNumber: string, adminId: string): Promise<User | null> => {
  const result = await apiRequest<{ user: User | null }>("/auth/student-login", {
    method: "POST",
    body: { registerNumber, adminId },
  });
  return result.user;
};

export const logout = async (): Promise<void> => Promise.resolve();
