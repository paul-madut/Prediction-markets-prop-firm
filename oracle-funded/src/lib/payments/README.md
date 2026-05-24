# Payments

Blueberry Funded sells access to a trader evaluation program. Stripe's TOS
classifies prediction-markets-adjacent businesses as restricted, so we use:

- **Authorize.net** — card processing. Authorize.net is a gateway; the
  underwriting/merchant account is provided separately by a high-risk
  broker (PaymentCloud, Soar Payments, or similar). That's a paperwork
  arrangement, not code — once approved, the broker gives you an
  `AUTHNET_API_LOGIN_ID` + `AUTHNET_TRANSACTION_KEY` + `AUTHNET_SIGNATURE_KEY`
  and these handlers Just Work.
- **NOWPayments** — crypto (BTC, ETH, USDC, USDT, 200+ coins). Broader
  coin support than Coinbase Commerce, simple invoice + IPN model, no
  KYC friction.

## Why not the other options on the original list

- **Stripe / Braintree (PayPal)** — TOS restricts prediction-markets adjacency.
- **Checkout.com / Adyen** — would underwrite us but the approval window
  is weeks-to-months and they're enterprise-sized.
- **CCBill** — historically adult-industry; dated checkout UX.
- **Coinbase Commerce** — narrowing scope (EVM-only, USDC focus); fine
  if we ever want to drop alt-coin coverage.

## Architecture

```
┌─────────────────────────────────────────────┐
│  /dashboard/new-challenge                    │
│  → PaymentMethodPicker (Card | Crypto)       │
│  → POST /api/checkout { configId, method }   │
└──────────────────┬──────────────────────────┘
                   │ returns { url }
                   ▼
        ┌──────────────────┐
        │ Hosted page on   │   Authorize.net Accept Hosted
        │ third-party      │   OR
        │ provider         │   NOWPayments invoice page
        └────────┬─────────┘
                 │ user completes payment
                 ▼
┌────────────────────────────────────────┐
│  Async webhook                         │
│  /api/authnet/webhook                  │
│  /api/nowpayments/webhook              │
│                                        │
│  → verify HMAC-SHA512                  │
│  → look up Payment by external ref     │
│  → idempotent provision                │
└────────────────────────────────────────┘
```

## Payment row reuse note

The existing `Payment` Prisma model has `stripeSessionId` and `stripeEventId`
columns from the previous Stripe integration. Rather than migrate the schema,
both providers reuse those columns as generic external references:

| Column            | Authorize.net               | NOWPayments         |
|-------------------|-----------------------------|---------------------|
| `stripeSessionId` | hosted-page invoice number  | invoice id          |
| `stripeEventId`   | webhook notification id     | payment id          |

A future migration can rename these to `externalSessionId` / `externalEventId`.

## Required env vars

```
# Authorize.net (cards)
AUTHNET_API_LOGIN_ID=...
AUTHNET_TRANSACTION_KEY=...
AUTHNET_SIGNATURE_KEY=...          # for webhook HMAC verification
AUTHNET_ENVIRONMENT=sandbox        # or "production"

# NOWPayments (crypto)
NOWPAYMENTS_API_KEY=...
NOWPAYMENTS_IPN_SECRET=...         # for IPN HMAC verification
NOWPAYMENTS_ENVIRONMENT=sandbox    # or "production"
```
