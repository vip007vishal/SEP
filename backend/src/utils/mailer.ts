import nodemailer from "nodemailer";
import { env } from "./env";

const createTransporter = () => {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass || !env.smtpFrom) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM in backend/.env.");
  }

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });
};

export const sendOtpMail = async (to: string, otp: string) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: env.smtpFrom,
    to,
    subject: "Smart Exam Planner verification code",
    text: `Your Smart Exam Planner verification code is ${otp}. It expires in ${env.otpExpiryMinutes} minutes.`,
    html: `<p>Your <strong>Smart Exam Planner</strong> verification code is:</p><h2 style="letter-spacing:4px">${otp}</h2><p>This code expires in ${env.otpExpiryMinutes} minutes.</p>`,
  });
};


export const sendNotificationMail = async (options: { to: string; subject: string; text: string; html?: string; replyTo?: string; senderName?: string; }) => {
  const transporter = createTransporter();
  const fromLabel = options.senderName ? `"${options.senderName} via Smart Exam Planner" <${env.smtpFrom}>` : env.smtpFrom;
  await transporter.sendMail({
    from: fromLabel,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html || `<p>${options.text}</p>`,
    replyTo: options.replyTo || undefined,
  });
};
