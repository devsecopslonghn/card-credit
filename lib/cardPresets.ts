export type CardPreset = {
  id: string;
  bank: string;
  bankName: string;
  name: string;
  type: string;
  annualFee: number;
  imageUrl: string;
};

const cardImage = (title: string, subtitle: string, background: string, accent: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="450" viewBox="0 0 720 450">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${background}"/>
          <stop offset="1" stop-color="${accent}"/>
        </linearGradient>
      </defs>
      <rect width="720" height="450" rx="38" fill="url(#g)"/>
      <rect x="46" y="86" width="88" height="62" rx="12" fill="#f8fafc" opacity=".82"/>
      <circle cx="584" cy="92" r="38" fill="#ffffff" opacity=".22"/>
      <circle cx="626" cy="92" r="38" fill="#ffffff" opacity=".14"/>
      <text x="48" y="228" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700" fill="#ffffff">${title}</text>
      <text x="48" y="286" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="500" fill="#ffffff" opacity=".82">${subtitle}</text>
      <text x="48" y="374" font-family="Arial, Helvetica, sans-serif" font-size="24" letter-spacing="6" fill="#ffffff" opacity=".88">****  ****  ****  2026</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const cardPresets: CardPreset[] = [
  {
    id: "vcb-cashback-plus",
    bank: "VCB",
    bankName: "Vietcombank",
    name: "Cashback Plus",
    type: "Visa",
    annualFee: 499000,
    imageUrl: cardImage("VCB Cashback Plus", "Vietcombank Visa", "#047857", "#064e3b"),
  },
  {
    id: "tcb-family-platinum",
    bank: "TCB",
    bankName: "Techcombank",
    name: "Family Platinum",
    type: "Mastercard",
    annualFee: 990000,
    imageUrl: cardImage("TCB Family Platinum", "Techcombank Mastercard", "#dc2626", "#7f1d1d"),
  },
  {
    id: "mb-hi-collection",
    bank: "MBB",
    bankName: "MB Bank",
    name: "Hi Collection",
    type: "Visa",
    annualFee: 399000,
    imageUrl: cardImage("MB Hi Collection", "MB Bank Visa", "#1d4ed8", "#172554"),
  },
  {
    id: "vpbank-stepup",
    bank: "VPB",
    bankName: "VPBank",
    name: "StepUP Cashback",
    type: "Mastercard",
    annualFee: 499000,
    imageUrl: cardImage("VPBank StepUP", "VPBank Mastercard", "#16a34a", "#1e3a8a"),
  },
  {
    id: "hsbc-cashback",
    bank: "HSBC",
    bankName: "HSBC",
    name: "Cashback Credit Card",
    type: "Visa",
    annualFee: 800000,
    imageUrl: cardImage("HSBC Cashback", "HSBC Visa", "#111827", "#b91c1c"),
  },
  {
    id: "sacombank-jcb",
    bank: "STB",
    bankName: "Sacombank",
    name: "JCB Ultimate",
    type: "JCB",
    annualFee: 699000,
    imageUrl: cardImage("Sacombank JCB", "Sacombank Ultimate", "#4338ca", "#0f766e"),
  },
];
