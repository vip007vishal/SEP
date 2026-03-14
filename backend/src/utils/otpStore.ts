import { env } from "./env";
import { clearExpiredOtps, deleteOtp, getOtp, storeOtp } from "../store/db";

export const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

export const setOtp = async (email: string, otp: string) => {
  await clearExpiredOtps();
  await storeOtp(email, otp, new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000));
};

export const verifyOtp = async (email: string, otp: string): Promise<boolean> => {
  await clearExpiredOtps();
  const record = await getOtp(email);
  if (!record) return false;
  const isValid = record.otp === otp && record.expiresAt > Date.now();
  if (isValid) {
    await deleteOtp(email);
  }
  return isValid;
};

export const clearOtp = async (email: string) => deleteOtp(email);
