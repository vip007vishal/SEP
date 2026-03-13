import { env } from "./env";

type OtpRecord = { otp: string; expiresAt: number };
const store = new Map<string, OtpRecord>();

export const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
export const setOtp = (email: string, otp: string) => {
  store.set(email.toLowerCase(), { otp, expiresAt: Date.now() + env.otpExpiryMinutes * 60 * 1000 });
};
export const verifyOtp = (email: string, otp: string): boolean => {
  const record = store.get(email.toLowerCase());
  if (!record) return false;
  const isValid = record.otp === otp && record.expiresAt > Date.now();
  if (isValid) store.delete(email.toLowerCase());
  return isValid;
};
export const clearOtp = (email: string) => store.delete(email.toLowerCase());
