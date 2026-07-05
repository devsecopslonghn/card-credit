import { Schema, model, models } from "mongoose";

const BankSchema = new Schema(
  {
    fullname: { type: String, required: true },  // Ngân hàng TMCP Sài Gòn Thương Tín
    name: { type: String, required: true },      // Ngân hàng SACOMBANK
    shortname: { type: String, required: true }, // SACOMBANK
    logo: { type: String, required: true },      // Chuỗi Base64 của ảnh
  },
  { timestamps: true }
);

const Bank = models.Bank || model("Bank", BankSchema);
export default Bank;
