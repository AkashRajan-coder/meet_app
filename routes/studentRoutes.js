import express from "express";
import auth, { studentOnly } from "../middleware/authMiddleware.js";
import { getProfile, updatePassword, getMeetings } from "../controller/studentController.js";

const router = express.Router();

router.get("/profile", auth, studentOnly, getProfile);
router.put("/update-password", auth, studentOnly, updatePassword);
router.get("/meetings", auth, studentOnly, getMeetings);

export default router;
