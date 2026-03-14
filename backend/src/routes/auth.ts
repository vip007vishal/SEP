import { Router } from "express";
import { createAdminUser, createTeacherUser, findUserByEmail, loginStudent, persistDb } from "../services/examService";
import { clearOtp, generateOtp, setOtp, verifyOtp } from "../utils/otpStore";
import { sendOtpMail } from "../utils/mailer";
import { sanitizeUser } from "../utils/sanitize";

const router = Router();

router.post("/request-otp", async (req, res) => {
  try {
    const rawEmail = req.body?.email ?? "";
    const rawPassword = req.body?.password ?? "";
    const email = String(rawEmail).trim().toLowerCase();
    const password = String(rawPassword).trim();

    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

    const user = await findUserByEmail(email);
    if (!user || String(user.password ?? "").trim() !== password) {
      return res.status(401).json({ error: "Invalid credentials." });
    }
    if ((user.role === "ADMIN" || user.role === "TEACHER") && !user.permissionGranted) {
      return res.status(403).json({ error: user.role === "ADMIN" ? "Account Pending: A Super Admin must approve your institutional registration." : "Account Pending: Your institutional administrator must grant you permission." });
    }

    const otp = generateOtp();
    await setOtp(user.email, otp);
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

    const user = await findUserByEmail(email);
    if (!user || String(user.password ?? "").trim() !== password) {
      await clearOtp(email);
      return res.status(401).json({ error: "Invalid credentials." });
    }
    if (!(await verifyOtp(email, otp))) return res.status(401).json({ error: "Invalid or expired verification code." });

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

export default router;
