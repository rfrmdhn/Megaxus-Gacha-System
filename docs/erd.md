# Database Schema (ERD)

```
┌─────────────────────┐       ┌──────────────────────┐
│ users                │       │ gacha_events          │
├──────────────────────┤       ├──────────────────────┤
│ id            PK     │       │ id            PK      │
│ email         UNIQUE │       │ name                  │
│ password_hash │       │ is_active     boolean │
│ role          enum   │       │ starts_at             │
│ coins         INTEGER│       │ ends_at               │
│   DEFAULT 500         │       │ created_at            │
│   CHECK (coins >= 0)  │       └──────────┬───────────┘
│ created_at            │                  │ 1
└──────────┬───────────┘                  │
           │ 1                             │ N
           │                    ┌──────────▼───────────┐
           │ N                  │ gacha_items           │
┌──────────▼───────────┐        ├──────────────────────┤
│ gacha_logs            │        │ id            PK      │
├──────────────────────┤◄───────┤ event_id      FK       │
│ id            PK      │   N   │ name                  │
│ user_id       FK      │       │ rarity                │
│ event_id      FK      │       │ drop_rate NUMERIC(5,2)│
│ item_id       FK      │       │ created_at            │
│ coins_spent   INTEGER │       └──────────────────────┘
│ created_at            │
└──────────────────────┘
```

## Notes

- **`users.coins`** lives directly on the user row — no separate `wallets` table. The requirement doesn't call for multi-currency or a wallet-level audit trail distinct from `gacha_logs`, so the extra join would be unearned complexity.
- **`gacha_items.drop_rate NUMERIC(5,2)`** — exact decimal, supports fractional percentages (e.g. `17.50`), avoids the classic floating-point summation bug where a set of percentages that should sum to exactly 100 fails a float equality check due to binary rounding.
- **Invariant: for a given `event_id`, `SUM(drop_rate)` across its `gacha_items` must equal `100.00` while the event is active.** Enforced at the application/service layer (not a DB constraint, since it's a cross-row aggregate check), with a draft/active lifecycle so admins can build up an event's items incrementally:
  - **Draft (`is_active = false`, the default on creation)**: items can be added/edited one at a time; only rejected if the running total would *exceed* 100%. A partial event (e.g. 80% configured so far) is a valid draft state.
  - **Activating (`PUT .../events/:id { isActive: true }`)**: rejected unless the current items sum to exactly 100%.
  - **Active (`is_active = true`)**: any further item create/update must keep the total at exactly 100% — no partial edits once live.
  - **Pull-time defense-in-depth**: the gacha pull re-checks that an active event's items still sum to exactly 100% before rolling, as a backstop against any edit path that could otherwise leave it inconsistent (e.g. deleting an item from an active event, which is allowed but leaves the event needing a fix before pulls succeed again).
- **`gacha_logs.coins_spent`** is a snapshot captured at pull time, not derived from a join to a "current cost" — so historical logs stay accurate even if the pull cost ever changes in the future.
- **`gacha_logs`** is append-only / immutable — it is the permanent record of what a user was charged and what they received. Rows are never updated or deleted by normal application flow.
