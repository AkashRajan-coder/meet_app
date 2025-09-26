import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    FirstName: { type: String, trim: true },
    LastName: { type: String, trim: true },
    email: { type: String, unique: true, lowercase: true, required: true },
    phoneNumber: { type: String, unique: true },
    password: { type: String, minlength: 6, required: true },
     rawPassword: { type: String },
    gender: { type: String, enum: ["Male", "Female", "others"] },
    role: { type: String, enum: ["owner", "admin", "student"], default: "student" },
    city: { type: String },
    state: { type: String },
    pinCode: { type: String },
    profilePic: { type: String },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


export default mongoose.model("User", userSchema);
