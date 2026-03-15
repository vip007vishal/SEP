import { Router } from "express";
import { createAdminUser, createTeacherUser, findUserByEmail, loginStudent, persistDb, resetUserPassword } from "../services/examService";
import { verifyPassword } from "../utils/security";
import { clearOtp, generateOtp, setOtp, verifyOtp } from "../utils/otpStore";
import { sendOtpMail } from "../utils/mailer";
import { sanitizeUser } from "../utils/sanitize";

const router = Router();

const requestWindowMs = 10 * 60 * 1000;
const maxOtpRequestsPerWindow = 3;
const bruteForceWindowMs = 15 * 60 * 1000;
const bruteForceMaxAttempts = 5;
const otpRequests = new Map<string, number[]>();
const failedLoginAttempts = new Map<string, number[]>();

const allowOtpRequest = (key: string) => {
  const now = Date.now();
  const recent = (otpRequests.get(key) || []).filter((ts) => now - ts < requestWindowMs);
  if (recent.length >= maxOtpRequestsPerWindow) return false;
  recent.push(now);
  otpRequests.set(key, recent);
  return true;
};

const recordFailedLogin = (key: string) => {
  const now = Date.now();
  const recent = (failedLoginAttempts.get(key) || []).filter((ts) => now - ts < bruteForceWindowMs);
  recent.push(now);
  failedLoginAttempts.set(key, recent);
  return recent.length;
};

const clearFailedLogin = (key: string) => failedLoginAttempts.delete(key);
const isLoginBlocked = (key: string) => {
  const now = Date.now();
  const recent = (failedLoginAttempts.get(key) || []).filter((ts) => now - ts < bruteForceWindowMs);
  failedLoginAttempts.set(key, recent);
  return recent.length >= bruteForceMaxAttempts;
};

router.post("/request-otp", async (req, res) => {
  try {
    const rawEmail = req.body?.email ?? "";
    const rawPassword = req.body?.password ?? "";
    const email = String(rawEmail).trim().toLowerCase();
    const password = String(rawPassword).trim();

    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

    const loginKey = `${email}:LOGIN`;
    if (isLoginBlocked(loginKey)) {
      return res.status(429).json({ error: 'Too many failed login attempts. Please wait 15 minutes and try again.' });
    }
    const user = await findUserByEmail(email);
    if (!user || !verifyPassword(password, user.password)) {
      recordFailedLogin(loginKey);
      return res.status(401).json({ error: "Invalid credentials." });
    }
    if ((user.role === "ADMIN" || user.role === "TEACHER") && !user.permissionGranted) {
      return res.status(403).json({ error: user.role === "ADMIN" ? `Account ${user.approvalStatus || 'Pending'}: ${user.approvalReason || 'A Super Admin must approve your institutional registration.'}` : `Account ${user.approvalStatus || 'Pending'}: ${user.approvalReason || 'Your institutional administrator must grant you permission.'}` });
    }

    if (!allowOtpRequest(loginKey)) {
      return res.status(429).json({ error: 'OTP resend limit reached. Please wait a few minutes before trying again.' });
    }
    const otp = generateOtp();
    await setOtp(user.email, otp, 'LOGIN');
    await sendOtpMail(user.email, otp);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to send verification code." });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const rawEmail = req.body?.email ?? "";
    const rawPassword = req.body?.password ?? "";
    const email = String(rawEmail).trim().toLowerCase();
    const password = String(rawPassword).trim();
    const otp = String(req.body?.otp ?? "").trim();

    if (!email || !password || !otp) return res.status(400).json({ error: "Email, password and OTP are required." });

    const loginKey = `${email}:LOGIN`;
    const user = await findUserByEmail(email);
    if (!user || !verifyPassword(password, user.password)) {
      await clearOtp(email, 'LOGIN');
      recordFailedLogin(loginKey);
      return res.status(401).json({ error: "Invalid credentials." });
    }
    const verified = await verifyOtp(email, otp, 'LOGIN');
    if (!verified.valid) return res.status(401).json({ error: "Invalid or expired verification code." });

    clearFailedLogin(loginKey);
    return res.json({ user: sanitizeUser(user) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to verify verification code." });
  }
});

router.post("/register-admin", async (req, res) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "").trim();
    const institutionName = String(req.body?.institutionName ?? "").trim();
    const user = await createAdminUser(name, email, password, institutionName);
    if (!user) return res.status(409).json({ error: "An account with this email or institution already exists." });
    await persistDb();
    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to register admin." });
  }
});

router.post("/register-teacher", async (req, res) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "").trim();
    const adminIdentifier = String(req.body?.adminIdentifier ?? "").trim();
    const user = await createTeacherUser(name, email, password, adminIdentifier);
    if (!user) return res.status(400).json({ error: "Registration failed. Please check the institution/admin identifier." });
    await persistDb();
    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to register teacher." });
  }
});

router.post("/student-login", async (req, res) => {
  try {
    const registerNumber = String(req.body?.registerNumber ?? "").trim();
    const instituteId = String(req.body?.adminId ?? "").trim();
    const user = await loginStudent(registerNumber, instituteId);
    return res.json({ user: sanitizeUser(user) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to log in student." });
  }
});

router.post('/request-password-reset', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const newPassword = String(req.body?.newPassword ?? '').trim();
    if (!email || !newPassword) return res.status(400).json({ error: 'Email and new password are required.' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    const user = await findUserByEmail(email);
    if (!user || !['ADMIN', 'TEACHER'].includes(user.role)) {
      return res.status(404).json({ error: 'Admin or teacher account not found.' });
    }
    const resetKey = `${email}:PASSWORD_RESET`;
    if (!allowOtpRequest(resetKey)) {
      return res.status(429).json({ error: 'OTP resend limit reached. Please wait a few minutes before trying again.' });
    }
    const otp = generateOtp();
    await setOtp(user.email, otp, 'PASSWORD_RESET', { newPassword });
    await sendOtpMail(user.email, otp);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Unable to send password reset code.' });
  }
});

router.post('/verify-password-reset', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const otp = String(req.body?.otp ?? '').trim();
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });
    const verified = await verifyOtp(email, otp, 'PASSWORD_RESET');
    if (!verified.valid || !verified.payload?.newPassword) {
      return res.status(401).json({ error: 'Invalid or expired verification code.' });
    }
    const updated = await resetUserPassword(email, String(verified.payload.newPassword));
    if (!updated) return res.status(404).json({ error: 'Account not found.' });
    await persistDb();
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Unable to reset password.' });
  }
});

export default router;
