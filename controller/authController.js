import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User  from "../Model/userSchema.js";

// REGISTER
export const register = async (req, res) => {
  try {
    const { FirstName, LastName, phoneNumber, email, password, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    const newUser = new User({ FirstName, LastName, phoneNumber, email, password, role });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id, role: newUser.role, email: newUser.email }, process.env.JWT_SECRET || "secret123", { expiresIn: "1h" });

    res.status(201).json({ message: "User registered successfully", user: newUser, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// LOGIN
// export const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ message: "Invalid credentials" });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

//     const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1d" });

//     res.json({
//       message: "Login successful",
//       token,
//       user: { FirstName: user.FirstName, LastName: user.LastName, email: user.email, role: user.role }
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        FirstName: user.FirstName,
        LastName: user.LastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
