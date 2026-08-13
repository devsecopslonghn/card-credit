---
name: personal-finance-ledger
description: Parse Vietnamese personal-finance messages for card-credit. Use for cash/debit/e-wallet spending, credit-card charges, paid-for-other transactions, reimbursements, fees and previews.
---

# Personal Finance Ledger

## Core rules

- `DEBIT`, `CASH`, `E_WALLET` are `REAL_MONEY`; `CREDIT` is `DEBT`.
- Present `DEBIT`, `CASH` and `E_WALLET` as one net-asset group: `TÀI SẢN RÒNG`. Do not force the user to manage many cash accounts; use one default `Tiền mặt` account when the source is unspecified.
- Present `CREDIT` as a separate debt group: `NỢ CREDIT`. Never add credit to net assets.
- Never treat credit debt as available cash.
- Backend calculates all impacts. Do not calculate or write data outside MCP.
- New mutations always use `preview -> one human confirmation -> confirm`.
- If a default CASH account is missing, create `Tiền mặt` with opening balance `0` through the account preview flow; do not ask for opening balance unless the user provides one.
- Every turn must end with a Telegram reply. On validation, MCP or timeout errors, state the error and next action; never end silently.

## Parse transaction intent

For each item identify:

- amount actually charged;
- payment account/card;
- date;
- category and note;
- `PERSONAL` or `PAID_FOR_OTHER`;
- expected reimbursement;
- fee charged, service fee, refund or cashback.

## Paid-for-other and fees

All credit-card transactions described as `thanh toán hộ` use the default service fee of 5%. Do not ask the user to confirm this rule again.

For a paid-for-other credit charge, keep these values separate in the preview:

- ticket/base amount;
- credit amount charged;
- service fee (5%);
- expected reimbursement;
- personal spending.

Rules:

- For base amount `A`, `creditDebt = A`.
- Default service fee is 5% of `A`.
- `outstandingReceivable = A * 0.95` (rounded to the nearest VND when needed).
- `personalSpending = A - outstandingReceivable` (normally 5% of `A`).
- Example: charge 1.000.000đ → credit debt 1.000.000đ, receivable 950.000đ, personal spending 50.000đ.
- Do not ask who pays the fee; under this rule the master bears the 5% difference.

## Reimbursement

When the user says money was received:

1. Match it to the outstanding paid-for-other transaction.
2. Ask which account received it if not stated.
3. Preview one `REIMBURSEMENT` transaction on the single/default `Tiền mặt` account unless another real-money account is explicitly named.
4. Do not alter the original credit transaction.
5. Add the received amount to `TÀI SẢN RÒNG` and reduce the receivable by the same amount.

## Credit repayment

- Paying a credit-card statement is a transfer from `TÀI SẢN RÒNG` to `NỢ CREDIT`.
- It reduces credit debt and real-money balance at the same time.
- It is not new personal spending.
- If the user says only “đã nhận lại tiền”, record reimbursement; do not mark the credit statement paid.

## Response format

For preview, show one compact batch:

- account/payment method;
- actual amount charged;
- fee fields separately;
- personal spending;
- receivable;
- credit debt or real-money cashflow;
- one explicit confirmation request.

For a confirmed write, report IDs/count and updated account balance. If confirmation fails, say that nothing was written unless the tool result proves otherwise.
