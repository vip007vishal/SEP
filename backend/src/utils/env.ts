import path from "path";
import dotenv from "dotenv";

dotenv.config();

const toBool = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
};

export const env = {
  port: Number(process.env.PORT || 5000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:8080",
  dataFile: process.env.DATA_FILE || "./data/db.json",
  superAdminName: process.env.SUPERADMIN_NAME || "Vishal Super Admin",
  superAdminEmail: process.env.SUPERADMIN_EMAIL || "vishal15v2006@gmail.com",
  superAdminPassword: process.env.SUPERADMIN_PASSWORD || "password123",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: toBool(process.env.SMTP_SECURE, false),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  otpExpiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES || 10),
};

export const resolvedDataFile = path.resolve(process.cwd(), env.dataFile);
