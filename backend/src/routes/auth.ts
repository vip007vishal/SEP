import { Router } from "express";
import { createAdminUser, createTeacherUser, findUserByEmail, loginStudent, persistDb } from "../services/examService";
import { clearOtp, generateOtp, setOtp, verifyOtp } from "../utils/otpStore";
import { sendOtpMail } from "../utils/mailer";
import { sanitizeUser } from "../utils/sanitize";

const router = Router();

router.post("/request-otp", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

    const user = await findUserByEmail(email);
    if (!user || user.password !== password) return res.status(401).json({ error: "Invalid credentials." });

    const otp = generateOtp();
    setOtp(user.email, otp);
    await sendOtpMail(user.email, otp);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to send verification code." });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, password, otp } = req.body || {};
    if (!email || !password || !otp) return res.status(400).json({ error: "Email, password and OTP are required." });

    const user = await findUserByEmail(email);
    if (!user || user.password !== password) {
      clearOtp(email);
      return res.status(401).json({ error: "Invalid credentials." });
    }
    if (!verifyOtp(email, otp)) return res.status(401).json({ error: "Invalid or expired verification code." });

    return res.json({ user: sanitizeUser(user) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to verify verification code." });
  }
});

router.post("/register-admin", async (req, res) => {
  try {
    const { name, email, password, institutionName } = req.body || {};
    const user = await createAdminUser(name, email, password, institutionName);
    if (!user) return res.status(409).json({ error: "An account with this email already exists." });
    persistDb();
    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to register admin." });
  }
});

router.post("/register-teacher", async (req, res) => {
  try {
    const { name, email, password, adminIdentifier } = req.body || {};
    const user = await createTeacherUser(name, email, password, adminIdentifier);
    if (!user) return res.status(400).json({ error: "Registration failed. Please check the institution/admin identifier." });
    persistDb();
    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to register teacher." });
  }
});

router.post("/student-login", async (req, res) => {
  try {
    const { registerNumber, adminId } = req.body || {};
    const user = await loginStudent(registerNumber, adminId);
    return res.json({ user: sanitizeUser(user) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to log in student." });
  }
});

export default router;
