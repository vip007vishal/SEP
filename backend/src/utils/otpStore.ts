import { env } from "./env";
import { clearExpiredOtps, deleteOtp, getOtp, storeOtp } from "../store/db";

export const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

export const setOtp = async (email: string, otp: string, purpose = 'LOGIN', payload: any = null) => {
  await clearExpiredOtps();
  await storeOtp(email, otp, new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000), purpose, payload);
};

export const verifyOtp = async (email: string, otp: string, purpose = 'LOGIN'): Promise<{ valid: boolean; payload?: any }> => {
  await clearExpiredOtps();
  const record = await getOtp(email, purpose);
  if (!record) return { valid: false };
  const isValid = record.otp === otp && record.expiresAt > Date.now();
  if (isValid) {
    await deleteOtp(email, purpose);
  }
  return { valid: isValid, payload: record.payload };
};

export const clearOtp = async (email: string, purpose = 'LOGIN') => deleteOtp(email, purpose);
