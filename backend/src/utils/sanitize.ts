import { User } from "../types";

export const sanitizeUser = (user?: User | null): User | null => {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
};

export const sanitizeUsers = (users: User[]): User[] => users.map((user) => sanitizeUser(user) as User);
