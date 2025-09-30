import Meeting from "../Model/meet.js";
import User from "../Model/userSchema.js";
import transporter from "./transporter.js";

// ---------------------------
// Helper: parse 12-hour AM/PM time
// ---------------------------
function parseAMPM(time) {
  if (!time) return null;
  const match = time.trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  let minutes = parseInt(match[2], 10);
  const modifier = match[3];

  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}

// ---------------------------
// Helper: calculate duration in minutes (max 2 hours)
// ---------------------------
function calculateDuration(startTime, endTime) {
  const startParsed = parseAMPM(startTime);
  const endParsed = parseAMPM(endTime);
  if (!startParsed || !endParsed) return 0;

  let start = startParsed.hours * 60 + startParsed.minutes;
  let end = endParsed.hours * 60 + endParsed.minutes;

  let duration = end >= start ? end - start : 24 * 60 - start + end;
  if (duration > 120) duration = 120;

  return duration;
}

// ---------------------------
// Helper: send email
// ---------------------------
const sendMeetingEmail = async (student, meeting, options = {}) => {
  const { type = "new", link = "" } = options;
  const isFirstMeeting = !!student.rawPassword;

  let subject = "";
  let html = "";

  switch (type) {
    case "new":
      subject = `Meeting Invitation: ${meeting.className}`;
      html = isFirstMeeting
        ? `
          <p>Hello <b>${student.FirstName}</b>,</p>
          <p>You have been allocated to a meeting:</p>
          <ul>
            <li>Class: ${meeting.className}</li>
            <li>Date: ${meeting.date.toDateString()}</li>
            <li>Time: ${meeting.startTime} - ${meeting.endTime}</li>
            <li>Meeting Link: <a href="${link}">${link}</a></li>
            <li>Duration: ${meeting.duration} minutes</li>
            <li>Password: ${student.rawPassword}</li>
          </ul>
          <p>Please login using this password.</p>
        `
        : `
          <p>Hello <b>${student.FirstName}</b>,</p>
          <p>You have been allocated to a new meeting:</p>
          <ul>
            <li>Class: ${meeting.className}</li>
            <li>Date: ${meeting.date.toDateString()}</li>
            <li>Time: ${meeting.startTime} - ${meeting.endTime}</li>
            <li>Duration: ${meeting.duration} minutes</li>
          </ul>
          <p>Please login to view details.</p>
        `;
      break;

    case "removed":
      subject = `Removed from Meeting: ${meeting.className}`;
      html = `
        <p>Hello <b>${student.FirstName}</b>,</p>
        <p>You have been removed from:</p>
        <ul>
          <li>Class: ${meeting.className}</li>
          <li>Date: ${meeting.date.toDateString()}</li>
          <li>Time: ${meeting.startTime} - ${meeting.endTime}</li>
        </ul>
        <p>Regards,<br>Admin</p>
      `;
      break;

    case "reschedule":
      subject = `Rescheduled: ${meeting.className}`;
      html = `
        <p>Hello <b>${student.FirstName}</b>,</p>
        <p>The meeting has been rescheduled:</p>
        <ul>
          <li>Class: ${meeting.className}</li>
          <li>Date: ${meeting.date.toDateString()}</li>
          <li>Time: ${meeting.startTime} - ${meeting.endTime}</li>
          <li>Duration: ${meeting.duration} minutes</li>
        </ul>
        <p>Please update your calendar.<br>Regards,<br>Admin</p>
      `;
      break;

    case "cancel":
      subject = `Meeting Cancelled: ${meeting.className}`;
      html = `
        <p>Hello <b>${student.FirstName}</b>,</p>
        <p>The meeting has been cancelled:</p>
        <ul>
          <li>Class: ${meeting.className}</li>
          <li>Date: ${meeting.date.toDateString()}</li>
          <li>Time: ${meeting.startTime} - ${meeting.endTime}</li>
        </ul>
        <p>Regards,<br>Admin</p>
      `;
      break;
  }

  await transporter.sendMail({
    from: `"Admin" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject,
    html,
  });

  if (isFirstMeeting) {
    student.rawPassword = undefined;
    await student.save();
  }
};

// ---------------------------
// Create Meeting
// ---------------------------
export const createMeeting = async (req, res) => {
  try {
    if (!["admin", "owner"].includes(req.user.role.toLowerCase()))
      return res.status(403).json({ error: "Not authorized" });

    const { className, date, startTime, endTime } = req.body;

    const startParsed = parseAMPM(startTime);
    const endParsed = parseAMPM(endTime);
    if (!startParsed || !endParsed)
      return res.status(400).json({ error: "Invalid time format" });

    const [year, month, day] = date.split("-").map(Number);
    if (!year || !month || !day) return res.status(400).json({ error: "Invalid date format" });

    const deleteAt = new Date(year, month - 1, day, endParsed.hours, endParsed.minutes);
    deleteAt.setMinutes(deleteAt.getMinutes() + 1);

    const duration = calculateDuration(startTime, endTime);

    const meeting = new Meeting({
      className,
      date: new Date(year, month - 1, day),
      startTime,
      endTime,
      duration,
      deleteAt,
      students: [],
    });

    await meeting.save();
    res.json({ message: "Meeting created successfully", meeting });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------------------
// Allocate Students
// ---------------------------
export const allocateStudents = async (req, res) => {
  try {
    const { studentIds } = req.body;
    if (!studentIds?.length) return res.status(400).json({ message: "studentIds required" });

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    meeting.students = meeting.students || [];
    const students = await User.find({ _id: { $in: studentIds }, role: "student" });
    if (!students.length) return res.status(400).json({ message: "No valid students found" });

    const emailResults = [];
    const allocatedStudents = [];

    for (let student of students) {
      const alreadyAdded = meeting.students.find(s => s.studentId.toString() === student._id.toString());
      if (alreadyAdded) {
        emailResults.push({ student: student.email, status: "Already allocated" });
        continue;
      }

      const dummyLink = `https://dummy-meeting.com/${Math.random().toString(36).substring(2, 10)}`;
      meeting.students.push({ studentId: student._id });
      allocatedStudents.push(student._id);

      try {
        await sendMeetingEmail(student, meeting, { type: "new", link: dummyLink });
        emailResults.push({ student: student.email, status: "Email sent" });
      } catch (err) {
        emailResults.push({ student: student.email, status: "Failed", error: err.message });
      }
    }

    await meeting.save();
    res.json({
      message: "Student allocation completed",
      meetingId: meeting._id,
      allocatedCount: allocatedStudents.length,
      emailResults,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------------------------
// Remove Students
// ---------------------------
export const removeStudents = async (req, res) => {
  try {
    if (!["admin", "owner"].includes(req.user.role)) return res.status(403).json({ error: "Not authorized" });

    const { studentIds } = req.body;
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    const removedStudents = meeting.students.filter(s => studentIds.includes(s.studentId.toString()));
    meeting.students = meeting.students.filter(s => !studentIds.includes(s.studentId.toString()));
    await meeting.save();

    const students = await User.find({ _id: { $in: removedStudents.map(s => s.studentId) }, role: "student" });
    const emailResults = [];
    for (let student of students) {
      try {
        await sendMeetingEmail(student, meeting, { type: "removed" });
        emailResults.push({ student: student.email, status: "Sent" });
      } catch (err) {
        emailResults.push({ student: student.email, status: "Failed", error: err.message });
      }
    }

    res.json({ message: "Students removed", meeting, emailResults });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------------------
// Reschedule Meeting
// ---------------------------
export const rescheduleMeeting = async (req, res) => {
  try {
    if (!["admin", "owner"].includes(req.user.role)) return res.status(403).json({ error: "Not authorized" });

    const { date, startTime, endTime } = req.body;
    const meeting = await Meeting.findById(req.params.id).populate("students.studentId");
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    if (date) meeting.date = new Date(date);
    if (startTime) meeting.startTime = startTime;
    if (endTime) meeting.endTime = endTime;
    if (meeting.startTime && meeting.endTime) meeting.duration = calculateDuration(meeting.startTime, meeting.endTime);

    await meeting.save();

    const emailResults = [];
    for (let sObj of meeting.students) {
      try {
        await sendMeetingEmail(sObj.studentId, meeting, { type: "reschedule" });
        emailResults.push({ student: sObj.studentId.email, status: "Sent" });
      } catch (err) {
        emailResults.push({ student: sObj.studentId.email, status: "Failed", error: err.message });
      }
    }

    res.json({ message: "Meeting rescheduled", meeting, emailResults });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------------------
// Delete Meeting
// ---------------------------
export const deleteMeeting = async (req, res) => {
  try {
    if (!["admin", "owner"].includes(req.user.role)) return res.status(403).json({ error: "Not authorized" });

    const meeting = await Meeting.findById(req.params.id).populate("students.studentId");
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    const emailResults = [];
    for (let sObj of meeting.students) {
      try {
        await sendMeetingEmail(sObj.studentId, meeting, { type: "cancel" });
        emailResults.push({ student: sObj.studentId.email, status: "Sent" });
      } catch (err) {
        emailResults.push({ student: sObj.studentId.email, status: "Failed", error: err.message });
      }
    }

    await Meeting.findByIdAndDelete(meeting._id);
    res.json({ message: "Meeting deleted", emailResults });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
