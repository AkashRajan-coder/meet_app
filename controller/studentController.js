import User from "../Model/userSchema.js";
import Meeting from "../Model/meet.js";

export const getProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

export const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Find user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Verify old password
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) return res.status(400).json({ message: "Old password is incorrect" });

    // Update password (pre-save middleware will hash it)
    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMeetings = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Find meetings where this student is included
    const meetings = await Meeting.find({ "students.studentId": studentId })
      .sort({ date: 1, startTime: 1 });

    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

