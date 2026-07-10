import { Schema, model, models } from "mongoose";

const CardTypeSchema = new Schema(
  {
    name: { type: String, required: true }, // VD: Visa, Mastercard, JCB
    logo: { type: String, required: true }, // Chuỗi Base64 của ảnh logo
  },
  { timestamps: true }
);

const CardType = models.CardType || model("CardType", CardTypeSchema);
export default CardType;
