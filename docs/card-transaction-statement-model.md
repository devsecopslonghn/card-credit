# Card Transaction and Statement Model

Last reviewed: 2026-07-10

This document records the transaction-first spending model currently implemented in the application.

## User Card Configuration

`CreditCard` remains the User Card model. Product snapshot fields are still preserved for catalog compatibility.

Operational configuration now lives on the User Card:

- `statementDay`: fixed monthly statement day, from 1 to 31.
- `paymentDueDays`: number of days from statement date to payment due date.
- `annualFeeWaiverTarget`: target eligible spend for annual-fee waiver.
- `active`: soft active/inactive state.

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
expectedCashbackAmount = outcomeAmount * cashbackRateBps
expectedNetProfit = expectedCashbackAmount - serviceFee
totalAmountDue = SUM(outcomeAmount)
annualEligibleSpend = SUM(outcomeAmount where eligibleForAnnualFeeWaiver = true)
```

Cashback status is tracked per transaction:

- `PENDING`
- `RECEIVED`
- `REJECTED`
