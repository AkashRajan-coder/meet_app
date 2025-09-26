import express from "express";
import { register, login } from "../controller/authController.js";
import { 
  createUser, 
  getUsers, 
  getMeetings,
  getUserById, 
  updateUser, 
  deleteUser 
} from "../controller/userController.js";

import auth from "../middleware/authMiddleware.js";
import CheckRoles from "../middleware/rolesMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected CRUD routes
router.post("/create-admin", auth, CheckRoles(["owner"]), createUser);
router.post("/create-student", auth, CheckRoles(["owner","admin"]), createUser);
router.get("/", auth, CheckRoles(["owner","admin"]), getUsers);
router.get("/listmeeting", auth, CheckRoles(["owner","admin"]), getMeetings);
router.get("/:id", auth, CheckRoles(["owner","admin"]), getUserById);
router.put("/:id", auth, CheckRoles(["owner","admin"]), updateUser);
router.delete("/:id", auth, CheckRoles(["owner","admin"]), deleteUser);

export default router;
