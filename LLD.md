# Low-Level Design (LLD): User Payout Management System

## 1. Project Overview
**Problem Statement:** The system manages user payouts for affiliate sales. It handles the lifecycle of a sale from `PENDING` to `APPROVED` or `REJECTED`, disburses a 10% advance payout on pending sales, calculates final payouts post-reconciliation, enforces withdrawal limits (1 per 24 hours), and handles the recovery of failed withdrawals.
**Overall Architecture:** A monolithic Service-Oriented Architecture (SOA) built in Node.js, utilizing a strict Controller-Service-Repository pattern.
**Main Backend Workflow:**
1. Sales are ingested as `PENDING`.
2. An admin triggers an Advance Payout job (via API) paying out 10%.
3. An admin reconciles sales (Approved/Rejected), triggering final payouts or debt recovery.
4. Users initiate withdrawals, which are processed by a simulated mock gateway.
**Technology Stack:** Node.js, Express.js, PostgreSQL, Prisma ORM, Zod (Validation), Pino (Logging).
**Folder Organization:** Domain-driven modular architecture (`src/modules/<domain>`).

---

## 2. Functional Requirements
**Implemented Functional Requirements:**
- **Advance Payout:** Eligible pending sales receive a 10% advance payout.
- **Final Payout Calculation:** Approved sales disburse `Earnings - Advance Paid`.
- **Debt Recovery (Rejection):** Rejected sales claw back the advance paid. If wallet balance is insufficient, the remainder is carried forward as a pending debt.
- **Withdrawal:** Users can withdraw available wallet balance.
- **Cooldown:** Only one withdrawal is permitted per 24 hours.
- **Failed Payout Recovery:** Failed withdrawals refund the wallet and immediately reset the 24-hour cooldown.

**Business Rules:**
- A single sale can strictly receive only ONE advance payout.
- Wallet balances cannot drop below zero.

**Assumptions Implemented:**
- The Advance Payout is triggered explicitly via an Admin API endpoint rather than a background cron job (simplifying state management for the assignment).
- Debt recovery is handled via a `pendingRecoveryPaise` field that intercepts future incoming credits.

---



## 6. Class Design (Service Layer)
*(Implemented via static object exports in JavaScript, acting as Singletons)*

- **saleService:** 
  - *Dependencies:* Prisma
  - *Public Methods:* `createSale`, `reconcileSale`, `getSalesByUser`, `getAllSales`
  - *Responsibilities:* Manages sale creation and the complex approval/rejection logic (handling final credits and debt adjustments).
- **payoutService:**
  - *Dependencies:* Prisma
  - *Public Methods:* `processAdvancePayouts`, `getPayoutHistory`
  - *Responsibilities:* Batches pending sales, calculates the 10% advance, intercepts active debt via `pendingRecoveryPaise`, and credits wallets.
- **withdrawalService:**
  - *Dependencies:* Prisma, MockPaymentGateway
  - *Public Methods:* `initiateWithdrawal`, `updateWithdrawalStatus`, `resetCooldown`
  - *Responsibilities:* Enforces 24h limit, debits wallet, dispatches mock network call, handles success/failure compensations.

---

## 7. Sequence Diagrams
*(See Section 15 for Mermaid Diagrams)*

---

## 8. State Diagrams
*(See Section 15 for Mermaid Diagrams)*

---

## 9. API Documentation

- **`POST /api/v1/sales`**
  - *Purpose:* Create a pending sale.
  - *Body:* `{ userId: UUID, brand: string, earningPaise: number }`
  - *Response:* `201 Created`
- **`PATCH /api/v1/sales/:id/reconcile`**
  - *Purpose:* Approve or reject a sale.
  - *Body:* `{ status: "APPROVED" | "REJECTED" }`
  - *Response:* `200 OK` (Errors: `400` if already reconciled).
- **`POST /api/v1/payouts/advance`**
  - *Purpose:* Trigger advance payouts.
  - *Body:* `{ userId?: UUID }` (Optional filter)
  - *Response:* `200 OK` with processed batch stats.
- **`GET /api/v1/payouts/:userId`**
  - *Purpose:* Fetch wallet balance and transaction ledger.
  - *Response:* `200 OK`
- **`POST /api/v1/withdrawals`**
  - *Purpose:* Initiate withdrawal to bank.
  - *Body:* `{ userId: UUID, amountPaise: number, forceStatus?: string }`
  - *Response:* `201` (Success) or `200` (Failed/Refunded). Errors: `429` (Cooldown), `400` (Insufficient funds).

---

## 10. Folder Structure
```text
backend/
├── prisma/
│   └── schema.prisma         # Database schema
├── src/
│   ├── config/               # Environment & logger setup
│   ├── middlewares/          # Global Zod & Error handlers
│   ├── modules/              # Domain-driven features
│   │   ├── payout/
│   │   ├── sale/
│   │   ├── user/
│   │   └── withdrawal/
│   ├── utils/                # Mock Gateway & Shared logic
│   ├── app.js                # Express app configuration
│   └── server.js             # Entry point
```
**Decision:** Module-based structure (Domain-Driven) ensures high cohesion. Grouping routes, controllers, and services by domain (e.g., `sale/`) makes microservice extraction trivial in the future.

---

## 11. Design Decisions
- **Why PostgreSQL & Prisma:** Strict relational requirements and ACID transactions are paramount for financial ledgers. Prisma provides type-safe DB access.
- **Why BigInt:** Prevents floating point errors common in JS (`0.1 + 0.2`). All currency is stored in `paise` (cents).
- **Why Service Layer:** Decouples business logic from HTTP transport, making logic testable via unit tests without mocking Express `req/res`.
- **Why WalletTransaction (Ledger):** While `Wallet.balancePaise` provides `O(1)` reads for current balance, financial systems require an immutable, append-only ledger for auditability.
- **Why `pendingRecoveryPaise`:** Rather than letting wallet balances go negative (which breaks standard withdrawal invariants), unrecoverable clawbacks are deferred as "debt" to be intercepted automatically from future payouts.

---

## 12. Error Handling
- **Validation:** Zod intercepts bad payloads at the middleware layer (400 Bad Request).
- **Idempotency/Race Conditions:** Prisma `$transaction` ensures that if a sale status changes mid-flight, the transaction rolls back gracefully.
- **Payment Failures:** Network/Gateway failures are caught by the service, triggering a compensating internal `$transaction` to refund the wallet and log a `WITHDRAWAL_REFUND`.
- **Cooldown Failures:** Handled by explicit Date diffing returning `429 Too Many Requests`.

---

## 13. Edge Cases Handled
- **The "Clawback Debt" Case:** User receives ₹10 advance, withdraws it, balance hits ₹0. Sale is Rejected. Code handles this by attempting a partial drain, failing, and shifting the ₹10 to `pendingRecoveryPaise` atomically.
- **Interception Case:** User has ₹10 debt. System generates ₹15 advance for a new sale. Code intercepts ₹10 (`RECOVERY_DEDUCTION`), reduces debt to ₹0, and credits wallet with ₹5 atomically.
- **Double Triggering:** Admin clicks "Advance Payout" twice instantly. `isAdvancePaid` boolean filter in the Prisma `where` clause naturally excludes sales already picked up by the first transaction block.

---

## 14. Future Improvements
- **BullMQ / Background Jobs:** Move the Advance Payout logic from a synchronous API trigger to a Redis-backed BullMQ cron job. Benefits: Automatic retries, decoupling from HTTP timeout limits, and scaling workers horizontally.
- **Distributed Locking:** While Prisma handles Row-Level Locking, using Redis (Redlock) for distributed locks on `userId` during payouts guarantees absolute safety in multi-instance horizontal scaling.
- **Webhooks:** Replace the synchronous Mock Gateway wait with an asynchronous Webhook architecture. Benefits: Real-time status updates without tying up Express worker threads.

---
---

## 15. Mermaid Diagrams

### Architecture Diagram
```mermaid
graph TD
    Client[Client Browser] --> API[Express API Layer]
    API --> Middleware[Zod / Pino Middlewares]
    Middleware --> Controller[Domain Controllers]
    Controller --> Service[Business Logic Services]
    Service --> Gateway[Mock Payment Gateway]
    Service --> Prisma[Prisma ORM Repository]
    Prisma --> DB[(PostgreSQL)]
```

### ER Diagram
```mermaid
erDiagram
    User ||--o{ Sale : generates
    User ||--|| Wallet : owns
    User ||--o{ Withdrawal : requests
    Wallet ||--o{ WalletTransaction : contains
    Sale ||--o{ WalletTransaction : links
    Withdrawal ||--o{ WalletTransaction : links

    Wallet {
        UUID id PK
        BigInt balancePaise
        BigInt pendingRecoveryPaise
        DateTime lastWithdrawalAt
    }
    Sale {
        UUID id PK
        BigInt earningPaise
        String status
        Boolean isAdvancePaid
    }
```

### Class Diagram (Service Layer)
```mermaid
classDiagram
    class SaleService {
        +createSale(data)
        +reconcileSale(saleId, status)
        +getSalesByUser(userId)
    }
    class PayoutService {
        +processAdvancePayouts(userId)
        +getPayoutHistory(userId)
    }
    class WithdrawalService {
        +initiateWithdrawal(userId, amount)
        +updateWithdrawalStatus(id, status)
    }
    class MockPaymentGateway {
        +simulatePayoutGateway(data)
    }
    SaleService ..> Prisma
    PayoutService ..> Prisma
    WithdrawalService ..> Prisma
    WithdrawalService ..> MockPaymentGateway
```

### Sequence Diagram - Sale Creation
```mermaid
sequenceDiagram
    Client->>SaleController: POST /sales { earning, brand }
    SaleController->>SaleService: createSale()
    SaleService->>Database: INSERT Sale (status: PENDING)
    Database-->>SaleService: Sale Entity
    SaleService-->>SaleController: Result
    SaleController-->>Client: 201 Created
```

### Sequence Diagram - Advance Payout
```mermaid
sequenceDiagram
    Admin->>PayoutController: POST /payouts/advance
    PayoutController->>PayoutService: processAdvancePayouts()
    PayoutService->>Database: SELECT PENDING & isAdvancePaid = false
    loop For each user
        PayoutService->>Database: BEGIN TRANSACTION
        PayoutService->>Database: UPDATE Sale (isAdvancePaid: true)
        PayoutService->>Database: INSERT WalletTransaction (ADVANCE_CREDIT)
        PayoutService->>Database: Check pendingRecoveryPaise
        PayoutService->>Database: UPDATE Wallet (balance + advance)
        PayoutService->>Database: COMMIT
    end
    PayoutService-->>PayoutController: Stats
    PayoutController-->>Admin: 200 OK
```

### Sequence Diagram - Approved Reconciliation
```mermaid
sequenceDiagram
    Admin->>SaleController: PATCH /sales/:id/reconcile {status: APPROVED}
    SaleController->>SaleService: reconcileSale(id, APPROVED)
    SaleService->>Database: BEGIN TRANSACTION
    SaleService->>Database: UPDATE Sale status = APPROVED
    SaleService->>SaleService: Calculate: Earnings - Advance
    SaleService->>Database: INSERT WalletTransaction (FINAL_CREDIT)
    SaleService->>Database: UPDATE Wallet balance
    SaleService->>Database: COMMIT
    SaleService-->>SaleController: Success
    SaleController-->>Admin: 200 OK
```

### Sequence Diagram - Rejected Reconciliation (With Debt Carry Forward)
```mermaid
sequenceDiagram
    Admin->>SaleController: PATCH /sales/:id/reconcile {status: REJECTED}
    SaleController->>SaleService: reconcileSale(id, REJECTED)
    SaleService->>Database: BEGIN TRANSACTION
    SaleService->>Database: UPDATE Sale status = REJECTED
    SaleService->>SaleService: Check advance paid
    alt Wallet Balance >= Advance
        SaleService->>Database: UPDATE Wallet balance -= Advance
    else Wallet Balance < Advance
        SaleService->>Database: Drain Wallet Balance to 0
        SaleService->>Database: UPDATE Wallet (pendingRecoveryPaise += remainder)
    end
    SaleService->>Database: COMMIT
    SaleService-->>SaleController: Success
    SaleController-->>Admin: 200 OK
```

### Sequence Diagram - Withdrawal Success
```mermaid
sequenceDiagram
    Client->>WithdrawalController: POST /withdrawals { amount }
    WithdrawalController->>WithdrawalService: initiateWithdrawal()
    WithdrawalService->>Database: Check 24h cooldown & balance
    WithdrawalService->>Database: BEGIN TRANSACTION
    WithdrawalService->>Database: INSERT Withdrawal (PROCESSING)
    WithdrawalService->>Database: UPDATE Wallet (balance -= amount, set lastWithdrawalAt)
    WithdrawalService->>Database: COMMIT
    WithdrawalService->>MockGateway: simulatePayoutGateway()
    MockGateway-->>WithdrawalService: { success: true }
    WithdrawalService->>Database: UPDATE Withdrawal (SUCCESS)
    WithdrawalService-->>WithdrawalController: Success
    WithdrawalController-->>Client: 201 Created
```

### Sequence Diagram - Withdrawal Failure
```mermaid
sequenceDiagram
    Client->>WithdrawalController: POST /withdrawals { amount }
    WithdrawalController->>WithdrawalService: initiateWithdrawal()
    WithdrawalService->>Database: Debit Wallet & Set Cooldown
    WithdrawalService->>MockGateway: simulatePayoutGateway()
    MockGateway-->>WithdrawalService: { success: false, reason: BANK_DECLINED }
    WithdrawalService->>Database: BEGIN TRANSACTION
    WithdrawalService->>Database: UPDATE Withdrawal (FAILED)
    WithdrawalService->>Database: INSERT WalletTransaction (WITHDRAWAL_REFUND)
    WithdrawalService->>Database: UPDATE Wallet (balance += amount, lastWithdrawalAt = null)
    WithdrawalService->>Database: COMMIT
    WithdrawalService-->>WithdrawalController: Refunded
    WithdrawalController-->>Client: 200 OK (With failure details)
```

### State Diagram - Sale
```mermaid
stateDiagram-v2
    [*] --> PENDING : Created
    PENDING --> PENDING : Advance Paid (isAdvancePaid = true)
    PENDING --> APPROVED : Reconciled (Approved)
    PENDING --> REJECTED : Reconciled (Rejected)
    APPROVED --> [*]
    REJECTED --> [*]
```

### State Diagram - Withdrawal
```mermaid
stateDiagram-v2
    [*] --> PROCESSING : Initiated
    PROCESSING --> SUCCESS : Gateway Success
    PROCESSING --> FAILED : Gateway Failure
    SUCCESS --> [*]
    FAILED --> [*]
```
