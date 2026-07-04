import mongoose, { Schema, model, models } from "mongoose";

const MonthDataSchema = new Schema({
  month: { type: Number, required: true },
  spend: { type: Number, default: 0 },
  cashback: { type: Number, default: 0 },
  fee: { type: Number, default: 0 },
  otherInterest: { type: Number, default: 0 },
});

const CreditCardSchema = new Schema(
  {
    presetId: { type: String, default: null },
    providerCode: { type: String, default: null },
    providerName: { type: String, default: null },
    displayName: { type: String, default: null },
    network: { type: String, default: null },
    catalogVersion: { type: String, default: null },
    legacy: { type: Boolean, default: true },

    bank: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    owner: { type: String, default: "Tôi" }, // Thêm trường này, mặc định là "Tôi"
    imageUrl: { type: String, required: true },
    annualFee: { type: Number, default: null },
    targetSpendForWaiver: { type: Number, default: 0 },

    // 3 Trường mới thêm vào (Lưu chuỗi date dạng YYYY-MM-DD từ HTML5 input)
    statementDate: { type: String, default: "" }, // Ngày sao kê
    paymentDueDate: { type: String, default: "" }, // Hạn thanh toán
    amountDueThisMonth: { type: Number, default: 0 }, // Tiền thanh toán tháng này
    isPaidThisMonth: { type: Boolean, default: false }, // ĐÁNH DẤU ĐÃ THANH TOÁN

    monthlyData: {
      type: [MonthDataSchema],
      default: () =>
        Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          spend: 0,
          cashback: 0,
          fee: 0,
          otherInterest: 0,
        })),
    },
  },
  { timestamps: true },
);

CreditCardSchema.index({ presetId: 1 });
CreditCardSchema.index({ providerCode: 1 });

const CreditCard = models.CreditCard || model("CreditCard", CreditCardSchema);
export default CreditCard;
