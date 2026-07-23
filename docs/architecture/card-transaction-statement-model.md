# Card Transaction and Statement Model

Last reviewed: 2026-07-10

This document records the transaction-first spending model currently implemented in the application.

## User Card Configuration

`CreditCard` remains the User Card model. Product snapshot fields are still preserved for catalog compatibility.

Operational configuration now lives on the User Card:

- `statementDay`: fixed monthly statement day, from 1 to 31.
- `paymentDueDays`: number of days from statement date to payment due date.
- `annualFeeWaiverTarget`: target eligible spend for annual-fee waiver.
- `cashbackCapAmount`: maximum eligible cashback for the configured cap period. `null` means unlimited.
- `cashbackCapPeriod`: enum for the cap period.
- `active`: soft active/inactive state.

Current cashback cap periods:

- `STATEMENT`: implemented.
- `CALENDAR_MONTH`: reserved for future implementation.

The previous manually entered totals remain in the database for compatibility but are no longer part of the normal UI update flow:

- `statementDate`
- `paymentDueDate`
- `amountDueThisMonth`
- `isPaidThisMonth`
- `monthlyData`

## CardTransaction

Each spending note is now a structured transaction:

- `userCardId`
- `statementId`
- `transactionDate`
- `outcomeAmount`
- `incomeAmount`
- `partnerReturnRateBps`
- `incomeInputMode`
- `cashbackRateBps`
- `actualCashbackAmount`
- `cashbackStatus`
- `eligibleForAnnualFeeWaiver`
- `note`

Money values are stored as integer VND. Percent rates are stored as basis points.

Validation:

- `outcomeAmount > 0`
- `0 <= incomeAmount <= outcomeAmount`
- `0 <= partnerReturnRateBps <= 10000`
- `0 <= cashbackRateBps <= 10000`

## CardStatement

Statements are persisted to keep historical periods stable when card configuration changes.

Fields:

- `userCardId`
- `periodStartDate`
- `periodEndDate`
- `statementDate`
- `paymentDueDate`
- `statementDaySnapshot`
- `paymentDueDaysSnapshot`
- `paymentStatus`
- `paidAt`
- `paidAmount`

Unique key:

- `workspaceId + userCardId + statementDate`

## Statement Rules

Statement period boundary:

```text
previousStatementDate < transactionDate <= currentStatementDate
```

For `statementDay = 7`, statement `2026-08-07` contains:

```text
2026-07-08 through 2026-08-07
```

When a month does not have the configured statement day, the statement date is clamped to the last day of that month.

Payment due date:

```text
paymentDueDate = statementDate + paymentDueDays
```

## Payment Status Rules

- `OPEN`: transactions can be added, edited and deleted.
- `STATEMENT_CLOSED`: transactions can still be edited or deleted after UI confirmation. Summary is recalculated from transactions.
- `PAID`: transactions cannot be added, edited or deleted. Backend APIs enforce this.
- `OVERDUE`: derived effective status when an unpaid statement is past due.

Reopen action:

- Available only for paid statements in the UI.
- Changes `paymentStatus` from `PAID` to `STATEMENT_CLOSED`.
- Clears `paidAt` and `paidAmount`.

## Summary Formulas

```text
serviceFee = outcomeAmount - incomeAmount
cashbackByRate = outcomeAmount * cashbackRateBps
eligibleCashback = min(cashbackByRate, remaining cashback cap)
exceededCashback = max(cashbackByRate - eligibleCashback, 0)
expectedNetProfit = eligibleCashback - serviceFee
totalAmountDue = SUM(outcomeAmount)
annualEligibleSpend = SUM(outcomeAmount where eligibleForAnnualFeeWaiver = true)
```

Cashback cap is always calculated from eligible cashback, not actual cashback.
For `STATEMENT`, cashback cap resets for each `CardStatement`. Statement summary APIs pass only the transactions in the selected statement period to the cap strategy, so a cap used in one statement does not reduce the next statement's remaining cap.

Example:

```text
cashbackByRate = 600000
cashbackCapAmount = 500000
actualCashback = 480000

eligibleCashback = 500000
exceededCashback = 100000
remainingCashback = 0
```

Actual cashback does not roll back or release cashback cap. It is used only for actual profit reporting.

Cashback status is tracked per transaction:

- `PENDING`
- `RECEIVED`
- `REJECTED`

## MonthlyCardCashback

Bank-paid cashback is stored independently from transactions and statements.
Each record belongs to a workspace, user card, and calendar `period` in
`YYYY-MM` format. The unique key is:

```text
workspaceId + userCardId + period
```

Amounts are non-negative integer VND. `RECEIVED` requires `actualAmount` and
sets `receivedAt`; other statuses store both as `null`. Inactive cards remain
eligible for historical entries.

This source does not reduce debt, replace partner returns, or overwrite
transaction cashback estimates.

## CardFeePayment

An actual card fee is stored independently when the bank charges it. Each
record belongs to a workspace, user, and card, and contains a valid calendar
`paymentDate`, a positive integer VND `amount`, an optional note, and
timestamps. Multiple records may share the same payment date.

History is available for inactive cards and is ordered newest first. A waived
or uncharged fee has no record. This source has no recurrence, expected amount,
status, or fee category and does not change transactions, spending, statements,
or debt.

## Performance Report

`GET /api/reports/summary` supports all-time, calendar-year, calendar-month,
owner, and card filters. Transactions are filtered by `transactionDate`;
monthly bank cashback is filtered by `period`. Matching cards remain in the
response with zero totals when they have no activity in the selected range.

Report formulas:

```text
monthlyBankCashbackExpected =
  SUM(expectedAmount where status is PENDING or RECEIVED)

monthlyBankCashbackActual =
  SUM(actualAmount where status is RECEIVED)

monthlyBankCashbackRejected =
  SUM(expectedAmount where status is REJECTED)

actualNetBenefit =
  monthlyBankCashbackActual - totalServiceFee
```

Existing transaction cashback fields remain in the response for reconciliation
and are never added to the monthly bank cashback KPI.

## Cashback Cap Strategy

Cashback cap logic is isolated in `frontend/lib/cards/cashbackCapCore.mjs`.

The current public helper is:

```ts
calculateEligibleCashback(transactions, cashbackCap, cashbackCapPeriod, context)
```

The service layer calls summary logic with card-level cashback cap config. Future cap types should add a strategy without changing transaction CRUD, statement payment rules or UI data contracts.

## Card Debt Summary

Card detail debt figures are derived only from `CardStatement.summary.totalAmountDue`.

Included statements:

- `paymentStatus != PAID`
- `summary.totalAmountDue > 0`
- `statementDate <= today`

Displayed values:

- Current bank debt: sum of all included statement amounts.
- Debt due this month: included statements whose `paymentDueDate` is in the current calendar month.
- Debt due next month: included statements whose `paymentDueDate` is in the next calendar month.

Legacy card fields such as `amountDueThisMonth` and `monthlyData` are not used for these debt figures.

Planned future strategy periods or dimensions:

- Calendar month.
- Quarter.
- Year.
- Category.
- Merchant.
- Promotion.
