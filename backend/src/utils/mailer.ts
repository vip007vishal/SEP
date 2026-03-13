import nodemailer from "nodemailer";
import { env } from "./env";

export const sendOtpMail = async (to: string, otp: string) => {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass || !env.smtpFrom) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM in backend/.env.");
  }

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });

  await transporter.sendMail({
    from: env.smtpFrom,
    to,
    subject: "Smart Exam Planner verification code",
    text: `Your Smart Exam Planner verification code is ${otp}. It expires in ${env.otpExpiryMinutes} minutes.`,
    html: `<p>Your <strong>Smart Exam Planner</strong> verification code is:</p><h2 style="letter-spacing:4px">${otp}</h2><p>This code expires in ${env.otpExpiryMinutes} minutes.</p>`,
  });
};
