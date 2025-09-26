import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema({
  className: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true // meeting date
  },
  startTime: {
    type: String,
    required: true // e.g., "02:55 PM"
  },
  endTime: {
    type: String,
    required: true // e.g., "03:00 PM"
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  students: [{
    studentId: {
      
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      
      enum: ['online', 'offline'],
      default: 'offline'
    }
  }],
  deleteAt: {
    type: Date // calculated from endTime
  }
}, { timestamps: true });

// Optional pre-save hook: ensure deleteAt is set
meetingSchema.pre("save", function(next) {
  if (!this.deleteAt && this.date && this.endTime) {
    const parseAMPM = (time) => {
      const match = time.trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);
      if (!match) return null;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const modifier = match[3];
      if (modifier === "PM" && hours < 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;
      return { hours, minutes };
    };

    const endParsed = parseAMPM(this.endTime);
    if (!endParsed) return next(new Error("Invalid endTime format"));

    const d = new Date(this.date);
    d.setHours(endParsed.hours, endParsed.minutes, 0, 0);
    this.deleteAt = d;
  }
  next();
});

export default mongoose.model("Meeting", meetingSchema);
