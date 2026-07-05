import { Schema, model, models } from "mongoose";

const CalendarNoteSchema = new Schema(
  {
    date: { type: String, required: true, unique: true }, // Định dạng chuẩn: YYYY-MM-DD
    content: { type: String, default: "" },             // Nội dung ghi chú ghi vào ngày đó
  },
  { timestamps: true }
);

const CalendarNote = models.CalendarNote || model("CalendarNote", CalendarNoteSchema);
export default CalendarNote;
