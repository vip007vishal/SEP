import { Router } from "express";
import * as examService from "../services/examService";
import { User } from "../types";
import { sanitizeUser, sanitizeUsers } from "../utils/sanitize";

const router = Router();

const methods: Record<string, (...args: any[]) => Promise<any>> = {
  getAuditLogs: examService.getAuditLogs,
  getAllAdmins: examService.getAllAdmins,
  grantAdminPermission: examService.grantAdminPermission,
  deleteAdminAndInstitution: examService.deleteAdminAndInstitution,
  getInstitutions: examService.getInstitutions,
  findUserById: examService.findUserById,
  getTeachersForAdmin: examService.getTeachersForAdmin,
  getUnassignedTeachers: examService.getUnassignedTeachers,
  grantTeacherPermission: examService.grantTeacherPermission,
  revokeTeacherPermission: examService.revokeTeacherPermission,
  deleteTeacher: examService.deleteTeacher,
  getExamsForAdmin: examService.getExamsForAdmin,
  getExamsForStudent: examService.getExamsForStudent,
  getExamsForTeacher: examService.getExamsForTeacher,
  createExam: examService.createExam,
  updateExam: examService.updateExam,
  updateExamSeatingPlan: examService.updateExamSeatingPlan,
  deleteExam: examService.deleteExam,
  getHallTemplatesForTeacher: examService.getHallTemplatesForTeacher,
  getHallTemplatesForAdmin: examService.getHallTemplatesForAdmin,
  createHallTemplate: examService.createHallTemplate,
  updateHallTemplate: examService.updateHallTemplate,
  deleteHallTemplate: examService.deleteHallTemplate,
  getStudentSetTemplatesForTeacher: examService.getStudentSetTemplatesForTeacher,
  getStudentSetTemplatesForAdmin: examService.getStudentSetTemplatesForAdmin,
  createStudentSetTemplate: examService.createStudentSetTemplate,
  updateStudentSetTemplate: examService.updateStudentSetTemplate,
  deleteStudentSetTemplate: examService.deleteStudentSetTemplate,
  generateClassicSeatingPlan: examService.generateClassicSeatingPlan,
  generateSeatingPlan: examService.generateSeatingPlan,
  generateLayoutFromImage: examService.generateLayoutFromImage,
};

const mutatingMethods = new Set([
  "grantAdminPermission", "deleteAdminAndInstitution", "grantTeacherPermission", "revokeTeacherPermission",
  "deleteTeacher", "createExam", "updateExam", "updateExamSeatingPlan", "deleteExam",
  "createHallTemplate", "updateHallTemplate", "deleteHallTemplate",
  "createStudentSetTemplate", "updateStudentSetTemplate", "deleteStudentSetTemplate",
]);

const sanitizePayload = (payload: any): any => {
  if (Array.isArray(payload)) {
    if (payload.length > 0 && payload[0] && typeof payload[0] === "object" && "role" in payload[0]) {
      return sanitizeUsers(payload as User[]);
    }
    return payload;
  }
  if (payload && typeof payload === "object" && "role" in payload && "email" in payload) {
    return sanitizeUser(payload as User);
  }
  return payload;
};

router.post("/", async (req, res) => {
  try {
    const { method, args } = req.body || {};
    if (!method || typeof method !== "string" || !methods[method]) {
      return res.status(400).json({ error: "Unknown RPC method." });
    }
    const result = await methods[method](...(Array.isArray(args) ? args : []));
    if (mutatingMethods.has(method)) examService.persistDb();
    return res.json(sanitizePayload(result));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "RPC request failed." });
  }
});

export default router;
