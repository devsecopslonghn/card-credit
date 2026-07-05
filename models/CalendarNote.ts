import { Schema, model, models } from "mongoose";

const CalendarNoteSchema = new Schema(
  {
    workspaceId: { type: String, default: null },
    date: { type: String, required: true }, // Định dạng chuẩn: YYYY-MM-DD
    content: { type: String, default: "" },             // Nội dung ghi chú ghi vào ngày đó
  },
  { timestamps: true }
);

CalendarNoteSchema.index({ workspaceId: 1, date: 1 }, { unique: true });

const CalendarNote = models.CalendarNote || model("CalendarNote", CalendarNoteSchema);
export default CalendarNote;
