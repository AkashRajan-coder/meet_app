import jwt from "jsonwebtoken";

// Auth middleware: checks JWT
export default function auth(req, res, next) {
  const authHeader = req.header("Authorization");

  // 1️⃣ Header missing
  if (!authHeader) {
    return res.status(401).json({ error: "No Authorization header provided" });
  }

  // 2️⃣ Check format: must be "Bearer <token>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "Invalid Authorization header format" });
  }

  const token = parts[1];

  // 3️⃣ Verify JWT
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
    req.user = decoded; // contains { id, role, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Middleware: allows only students
export const studentOnly = (req, res, next) => {
  if (!req.user || req.user.role.toLowerCase() !== "student") {
    return res.status(403).json({ error: "Access denied: Students only" });
  }
  next();
};
