import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is required");
}

const svgDataUri = (label, bg, fg = "ffffff") => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300"><rect width="480" height="300" rx="28" fill="#${bg}"/><text x="36" y="82" font-family="Arial" font-size="30" font-weight="700" fill="#${fg}">${label}</text><text x="36" y="238" font-family="Arial" font-size="20" fill="#${fg}" opacity=".82">Sample Card</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
};

const logoDataUri = (label, bg, fg = "ffffff") => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="96" viewBox="0 0 180 96"><rect width="180" height="96" rx="16" fill="#${bg}"/><text x="90" y="58" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="#${fg}">${label}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
};

const MonthDataSchema = new mongoose.Schema({
  month: { type: Number, required: true },
  spend: { type: Number, default: 0 },
  cashback: { type: Number, default: 0 },
  fee: { type: Number, default: 0 },
  otherInterest: { type: Number, default: 0 },
});

const CreditCardSchema = new mongoose.Schema(
  {
    bank: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    owner: { type: String, default: "Tôi" },
    imageUrl: { type: String, required: true },
    annualFee: { type: Number, required: true },
    targetSpendForWaiver: { type: Number, default: 0 },
    statementDate: { type: String, default: "" },
    paymentDueDate: { type: String, default: "" },
    amountDueThisMonth: { type: Number, default: 0 },
    isPaidThisMonth: { type: Boolean, default: false },
    monthlyData: { type: [MonthDataSchema], default: [] },
  },
  { timestamps: true },
);

const BankSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true },
    name: { type: String, required: true },
    shortname: { type: String, required: true },
    logo: { type: String, required: true },
  },
  { timestamps: true },
);

const CardTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    logo: { type: String, required: true },
  },
  { timestamps: true },
);

const CalendarNoteSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true },
    content: { type: String, default: "" },
  },
  { timestamps: true },
);

const CreditCard = mongoose.models.CreditCard || mongoose.model("CreditCard", CreditCardSchema);
const Bank = mongoose.models.Bank || mongoose.model("Bank", BankSchema);
const CardType = mongoose.models.CardType || mongoose.model("CardType", CardTypeSchema);
const CalendarNote = mongoose.models.CalendarNote || mongoose.model("CalendarNote", CalendarNoteSchema);

const monthlyData = [
  { month: 1, spend: 8200000, cashback: 246000, fee: 0, otherInterest: 45000 },
  { month: 2, spend: 6100000, cashback: 183000, fee: 25000, otherInterest: 38000 },
  { month: 3, spend: 9400000, cashback: 282000, fee: 0, otherInterest: 52000 },
  { month: 4, spend: 7200000, cashback: 216000, fee: 15000, otherInterest: 41000 },
  { month: 5, spend: 10300000, cashback: 309000, fee: 0, otherInterest: 58000 },
  { month: 6, spend: 6800000, cashback: 204000, fee: 0, otherInterest: 39000 },
  ...Array.from({ length: 6 }, (_, i) => ({
    month: i + 7,
    spend: 0,
    cashback: 0,
    fee: 0,
    otherInterest: 0,
  })),
];

async function seed() {
  await mongoose.connect(MONGODB_URI);

  await Bank.bulkWrite([
    {
      updateOne: {
        filter: { shortname: "VCB" },
        update: {
          $set: {
            fullname: "Ngân hàng TMCP Ngoại thương Việt Nam",
            name: "Ngân hàng Vietcombank",
            shortname: "VCB",
            logo: logoDataUri("VCB", "0b7f3a"),
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { shortname: "TCB" },
        update: {
          $set: {
            fullname: "Ngân hàng TMCP Kỹ thương Việt Nam",
            name: "Ngân hàng Techcombank",
            shortname: "TCB",
            logo: logoDataUri("TCB", "d71920"),
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { shortname: "STB" },
        update: {
          $set: {
            fullname: "Ngân hàng TMCP Sài Gòn Thương Tín",
            name: "Ngân hàng Sacombank",
            shortname: "STB",
            logo: logoDataUri("STB", "f4a51c", "111827"),
          },
        },
        upsert: true,
      },
    },
  ]);

  await CardType.bulkWrite([
    {
      updateOne: {
        filter: { name: "Visa" },
        update: { $set: { name: "Visa", logo: logoDataUri("VISA", "1a1f71") } },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { name: "Mastercard" },
        update: { $set: { name: "Mastercard", logo: logoDataUri("MC", "ff5f00") } },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { name: "JCB" },
        update: { $set: { name: "JCB", logo: logoDataUri("JCB", "0f766e") } },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { name: "American Express" },
        update: { $set: { name: "American Express", logo: logoDataUri("AMEX", "1e3a8a") } },
        upsert: true,
      },
    },
  ]);

  await CreditCard.bulkWrite([
    {
      updateOne: {
        filter: { bank: "VCB", name: "Cashback Plus", owner: "Tôi" },
        update: {
          $set: {
            bank: "VCB",
            name: "Cashback Plus",
            type: "Visa",
            owner: "Tôi",
            imageUrl: svgDataUri("VCB Cashback Plus", "0b7f3a"),
            annualFee: 499000,
            targetSpendForWaiver: 60000000,
            statementDate: "2026-07-20",
            paymentDueDate: "2026-08-05",
            amountDueThisMonth: 7350000,
            isPaidThisMonth: false,
            monthlyData,
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { bank: "TCB", name: "Family Platinum", owner: "Mẹ" },
        update: {
          $set: {
            bank: "TCB",
            name: "Family Platinum",
            type: "Mastercard",
            owner: "Mẹ",
            imageUrl: svgDataUri("TCB Family Platinum", "d71920"),
            annualFee: 990000,
            targetSpendForWaiver: 120000000,
            statementDate: "2026-07-15",
            paymentDueDate: "2026-07-30",
            amountDueThisMonth: 4280000,
            isPaidThisMonth: false,
            monthlyData: monthlyData.map((item) => ({
              ...item,
              spend: Math.round(item.spend * 0.62),
              cashback: Math.round(item.cashback * 0.5),
            })),
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { bank: "STB", name: "Visa Platinum Cashback", owner: "Long Ho" },
        update: {
          $set: {
            bank: "STB",
            name: "Visa Platinum Cashback",
            type: "Visa",
            owner: "Long Ho",
            imageUrl: svgDataUri("STB Visa Cashback", "111827", "f4a51c"),
            annualFee: 599000,
            targetSpendForWaiver: 0,
            statementDate: "2026-07-18",
            paymentDueDate: "2026-08-02",
            amountDueThisMonth: 5620000,
            isPaidThisMonth: false,
            monthlyData: monthlyData.map((item) => ({
              ...item,
              spend: Math.round(item.spend * 0.48),
              cashback: Math.round(item.cashback * 0.8),
            })),
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { bank: "STB", name: "JCB Ultimate", owner: "Regression No Due Date" },
        update: {
          $set: {
            bank: "STB",
            name: "JCB Ultimate",
            type: "JCB",
            owner: "Regression No Due Date",
            imageUrl: svgDataUri("STB JCB Ultimate", "4338ca"),
            annualFee: 1699000,
            targetSpendForWaiver: 400000000,
            statementDate: "",
            paymentDueDate: "",
            amountDueThisMonth: 0,
            isPaidThisMonth: false,
            monthlyData: Array.from({ length: 12 }, (_, i) => ({
              month: i + 1,
              spend: 0,
              cashback: 0,
              fee: 0,
              otherInterest: 0,
            })),
          },
        },
        upsert: true,
      },
    },
  ]);

  await CalendarNote.bulkWrite([
    {
      updateOne: {
        filter: { date: "2026-07-30" },
        update: { $set: { date: "2026-07-30", content: "Thanh toán TCB Family Platinum" } },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { date: "2026-08-05" },
        update: { $set: { date: "2026-08-05", content: "Thanh toán VCB Cashback Plus" } },
        upsert: true,
      },
    },
  ]);

  await mongoose.disconnect();
  console.log("Sample data seeded successfully.");
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
