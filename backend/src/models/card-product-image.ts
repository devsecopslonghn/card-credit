import mongoose, { Schema } from "mongoose";

const CardProductImageSchema = new Schema({
  presetId: { type: String, required: true, unique: true, index: true },
  sourceUrl: { type: String, default: null },
  contentType: { type: String, default: null },
  data: { type: Buffer, default: null },
  byteSize: { type: Number, default: 0 },
  sha256: { type: String, default: null },
  status: { type: String, enum: ["VERIFIED", "BROKEN"], required: true },
  checkedAt: { type: Date, required: true },
  errorMessage: { type: String, default: null },
}, { timestamps: true, versionKey: false });

export const CardProductImageModel = mongoose.models.CardProductImage ?? mongoose.model("CardProductImage", CardProductImageSchema);
