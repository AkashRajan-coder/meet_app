import express from "express";
import { 
  createMeeting,
  allocateStudents,
  removeStudents,
  rescheduleMeeting,
  deleteMeeting
} from "../controller/meetingController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// CRUD + actions
router.post("/", authMiddleware, createMeeting);
router.post("/:id/allocate", authMiddleware, allocateStudents);
router.post("/:id/remove", authMiddleware, removeStudents);
router.put("/:id/reschedule", authMiddleware, rescheduleMeeting);
router.delete("/:id", authMiddleware, deleteMeeting);

export default router;
