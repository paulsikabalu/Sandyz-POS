# TODO: Fix "order failed — signal aborted without reason"

## Root Cause
The 15-second `AbortController` timeout in `artifacts/pos-system/src/api/client.ts`
silently aborts order placement requests before the server finishes, surfacing the
cryptic `AbortError` ("signal aborted without reason") to the user.

## Steps
- [x] 1. `client.ts`: Make request timeout configurable per-call; bump order placement timeout; translate `AbortError` into a clear "Request timed out" message.
- [x] 2. `orders.ts` (server): Wrap multi-step order creation in a DB transaction.
- [x] 3. `Pos.tsx`: Surface the friendly error message to the toast (verify pass-through — already uses `err?.message`).
- [x] 4. Verify build / typecheck (api-server typecheck passed; pos-system typecheck passed).
- [x] 5. `client.ts`: Add offline fallback to `reportsApi.orders()` so Orders Management works offline by paginating from the cached orders.
