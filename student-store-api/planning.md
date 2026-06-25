# Student Store API — Planning

This document is the source of truth for the backend before any schema or route code is written. Every field, endpoint, and transactional step is decided here so that `schema.prisma` and `server.js` become a transcription of this plan, not a discovery exercise.

---

## Section 1: Data Models

Three models: `Product`, `Order`, `OrderItem`. `OrderItem` is the join row between an `Order` and a `Product` — it is **not** a pure many-to-many bridge, because it carries its own data (`quantity`, `price`).

### 1.1 `Product`

The catalog row. Independent of any order.

| Field         | Prisma type | Required | Default              | Notes |
|---------------|-------------|----------|----------------------|-------|
| `id`          | `Int`       | yes      | `autoincrement()`    | Primary key. |
| `name`        | `String`    | yes      | —                    | Display name. |
| `description` | `String`    | yes      | —                    | Short product blurb. |
| `price`       | `Decimal`   | yes      | —                    | Stored as `Decimal(10, 2)`. See decision D1 below. |
| `imageUrl`    | `String`    | yes      | —                    | Mapped to column `image_url` via `@map`. JSON wire format is `image_url` (snake_case) — see the controller serializer entry in the Decisions Log. |
| `category`    | `String`    | yes      | —                    | Free-form string for now (e.g. `"Apparel"`). A `Category` enum is deferred — categories are likely to grow and we don't want a migration for every new one. |
| `createdAt`   | `DateTime`  | yes      | `now()`              | Useful for "newest products" sort later. |

**Relationships**
- `orderItems  OrderItem[]` — one product appears on many order items.

**Cascade behavior**
- **Deleting a `Product` cascades to its `OrderItem` rows.** This is required by the spec. See decision D2 for why this is the *wrong* default in real e-commerce, and why we accept it here.

---

### 1.2 `Order`

A single customer's purchase. Owns its line items; does not own products.

| Field        | Prisma type | Required | Default            | Notes |
|--------------|-------------|----------|--------------------|-------|
| `id`         | `Int`       | yes      | `autoincrement()`  | Primary key. |
| `customer`   | `String`    | yes      | —                  | Customer name or email; the seed uses an integer (`customer_id`), but the React frontend collects a name string at checkout. We store it as `String` to match the UI and coerce the seed values. |
| `totalPrice` | `Decimal`   | yes      | —                  | `Decimal(10, 2)`. Computed server-side at order creation; never trusted from the client. See decision D3. |
| `status`     | `String`    | yes      | `"pending"`        | One of `pending`, `completed`, `cancelled`. Kept as a `String` rather than a Prisma `enum` so we can add states without a migration. |
| `createdAt`  | `DateTime`  | yes      | `now()`            | Mapped to `created_at`. |

**Relationships**
- `orderItems  OrderItem[]` — one order has many line items.

**Cascade behavior**
- **Deleting an `Order` cascades to its `OrderItem` rows.** Required by the spec, and also the *correct* default — an order's line items have no meaning without the order they belong to.

---

### 1.3 `OrderItem`

The line item. Sits at the intersection of an `Order` and a `Product`, and holds the per-line `quantity` and the `price` *captured at the time of purchase*.

| Field       | Prisma type | Required | Default            | Notes |
|-------------|-------------|----------|--------------------|-------|
| `id`        | `Int`       | yes      | `autoincrement()`  | Primary key. |
| `orderId`   | `Int`       | yes      | —                  | FK → `Order.id`. |
| `productId` | `Int`       | yes      | —                  | FK → `Product.id`. |
| `quantity`  | `Int`       | yes      | —                  | Must be ≥ 1; enforced in the route handler, not in Prisma. |
| `price`     | `Decimal`   | yes      | —                  | The product's price at the moment the order was placed — see decision D4. |

**Relationships**
- `order    Order   @relation(fields: [orderId],   references: [id], onDelete: Cascade)`
- `product  Product @relation(fields: [productId], references: [id], onDelete: Cascade)`

Indexes: `@@index([orderId])` and `@@index([productId])` to keep the cascade fast and to support order-history queries.

---

### 1.4 Key decisions

**D1 — `Decimal`, not `Float`, for money.**
Floating point will silently turn `29.99 + 1.99` into something that ends in `…0001`. Postgres `Decimal(10, 2)` keeps two-place precision and is exactly what the totals math expects. Prisma surfaces this as a `Decimal.js` instance; route handlers must `.toNumber()` before sending JSON.

**D2 — Product delete cascades into OrderItem (per spec), but we treat it as the academic-exercise version of this rule.**
In production, deleting a product that's part of historical orders is destructive: the order log loses its line items and the order's `totalPrice` no longer reconciles to its line items. The real-world fix is a `deletedAt` soft-delete column on `Product` plus `onDelete: Restrict` on the FK. We are **not** doing that here because:
1. The spec explicitly requires cascade delete on both relations.
2. The frontend has no admin "delete product" surface, so this path is exercised only by tests.
3. Keeping `price` denormalized on `OrderItem` (D4) means the *amounts* on past orders are still readable even after a product is deleted — only the `productId` linkage is gone.

If a product is deleted while an active (`pending`) order contains it, that order's line items vanish. The order row survives with a stale `totalPrice` that no longer matches the (now empty) item list. This is a known consequence of the spec, documented here so it is not a surprise during testing.

**D3 — `totalPrice` is computed server-side.**
The client sends `{ productId, quantity }` only. The server looks up each product, multiplies, sums, and stores the result. Trusting a client-supplied total is the canonical way to ship a price-manipulation vulnerability.

**D4 — `OrderItem.price` is denormalized (a snapshot), not derived.**
We copy `Product.price` onto each `OrderItem` at creation time so historical orders remain accurate when a product's price changes (or when the product is later deleted). `OrderItem.price` is the source of truth for what the customer paid; `Product.price` is the source of truth for what the product *currently* costs.

**D5 — Order items are *append-only* after creation, not strictly immutable.**
The original spec said items are immutable through any endpoint, with the policy "if items need to change, cancel and re-create the order" (still the rule for `PUT /orders/:id`). With the new stretch endpoint `POST /orders/:order_id/items` (§2.13), we relax this to: items can be **appended**, never updated or deleted in place. The `totalPrice` is recomputed server-side inside the same transaction, so the D4 snapshot invariant (`Order.totalPrice == Σ (OrderItem.price × quantity)`) still holds at every observable instant. Why we didn't go further:
1. **In-place updates would silently invalidate price snapshots.** Editing a line's `quantity` after the fact is fine; editing its `price` would let a current `Product.price` overwrite the historical snapshot from D4. Easier to forbid the whole shape than to carve out exceptions.
2. **Deletions would silently reduce historical totals.** A receipt that used to read `$45.97` shouldn't quietly become `$29.99` because someone deleted a line. The right tool for "I added the wrong thing" is still cancel + re-create the order.
3. **Status interactions are out of scope for this pass.** The current implementation lets you append to a `completed` or `cancelled` order. That's a state-machine question (when does the order "lock"?) and the spec leaves it open intentionally — we'd want to design a status state machine first and then layer the append rule on top, not bolt an ad-hoc `if (status === 'completed') reject` check into the controller. Calling this out explicitly so a future reader knows it's deferred, not forgotten.

---

## Section 2: API Contract

**Base URL:** `http://localhost:3000`
**All requests/responses are JSON.** `Content-Type: application/json` is required on bodies.

**Standard error shape (every non-2xx response):**
```json
{ "error": "human-readable message" }
```
HTTP status carries the category (`400` validation, `404` missing, `500` server); the body carries the detail. No nested `error.details` or `code` fields — the frontend only needs a string.

### 2.1 Endpoints

| # | Method | Path             | Purpose                                 |
|---|--------|------------------|-----------------------------------------|
| 1 | GET    | `/`              | Health check / welcome message.         |
| 2 | GET    | `/products`      | List all products.                      |
| 3 | GET    | `/products/:id`  | Fetch one product.                      |
| 4 | POST   | `/products`      | Create a product. (Admin-style; not used by the UI but required for CRUD completeness.) |
| 5 | PUT    | `/products/:id`  | Update a product.                       |
| 6 | DELETE | `/products/:id`  | Delete a product (cascades to its `OrderItem` rows). |
| 7 | GET    | `/orders`        | List all orders, including their items. |
| 8 | GET    | `/orders/:id`    | Fetch one order with its items.         |
| 9 | POST   | `/orders`        | **Create an order plus its items, atomically.** |
| 10 | PUT   | `/orders/:id`    | Update an order's `customer` and/or `status`. Items are immutable. |
| 11 | DELETE | `/orders/:id`   | Delete an order (cascades to its `OrderItem` rows). |
| 12 | GET    | `/order-items`  | List all order items in the database. |
| 13 | POST   | `/orders/:order_id/items` | Add a new line item to an existing order and recompute `totalPrice` atomically. |

#### 1. `GET /`
- **200**: `{ "message": "Welcome to the Student Store API" }`

#### 2. `GET /products`
- **200**: `{ "products": Product[] }`

`Product` JSON shape:
```json
{
  "id": 1,
  "name": "College Hoodie",
  "description": "Comfortable and stylish hoodie with the college logo.",
  "price": 29.99,
  "image_url": "https://tinyurl.com/college-hoodie",
  "category": "Apparel",
  "createdAt": "2026-06-17T10:00:00.000Z"
}
```

**Query parameters** — all optional, freely combinable:

| Param      | Type     | Accepted values                            | Effect                                                                 |
|------------|----------|--------------------------------------------|------------------------------------------------------------------------|
| `category` | `string` | Any non-empty string (e.g. `Apparel`)      | Filter to products where `category` matches exactly (case-insensitive). |
| `sort`     | `string` | `price`, `-price`, `name`, `-name`, `createdAt`, `-createdAt` | Sort by the given field. A leading `-` reverses the order (descending). |

**Default behavior** (no params): return all products with no filter. Order is unspecified by the contract — callers must pass `sort=...` if they need a deterministic order. (Implementation note: the route currently uses `orderBy: { id: 'asc' }` as a stable internal default, but callers should not rely on it.)

**Examples**
- `GET /products?category=Apparel` → only apparel products.
- `GET /products?sort=price` → all products, cheapest first.
- `GET /products?sort=-createdAt` → all products, newest first.
- `GET /products?category=Apparel&sort=-price` → apparel only, most expensive first.

**Errors**
- **400** — `{ "error": "Invalid sort field: <value>" }` if `sort` is provided but isn't one of the accepted values above. `category` is never an error: an unknown category simply returns an empty `products` array (it's a filter, not a lookup).

**Why this shape, not the alternatives**
- **Why exact-match on `category` instead of substring search?** Categories are short, controlled strings; a substring search would conflate `"Apparel"` and `"Accessories"`. If full-text search becomes a requirement later, add a separate `q=` param rather than overloading `category`.
- **Why the `-field` convention for descending sort instead of a separate `order=desc`?** One param is easier to read in a URL and easier to validate (one allowlist check vs. two). It's also what JSON:API and several other public APIs use, so it's the least surprising default.
- **Why is an unknown category an empty result, but an unknown sort field a 400?** A nonexistent category is plausible user data ("show me products in 'Snacks'" when there are none yet) — empty list is the correct answer. A bad `sort` value is almost always a bug in the client, so failing loudly is more helpful than silently ignoring it.

#### 3. `GET /products/:id`
- **200**: `{ "product": Product }`
- **404**: `{ "error": "Product 42 not found" }`

#### 4. `POST /products`
- **Body**: `{ name, description, price, image_url, category }`
- **201**: `{ "product": Product }`
- **400**: `{ "error": "Missing required field: price" }`

#### 5. `PUT /products/:id`
- **Body**: any subset of `{ name, description, price, image_url, category }`
- **200**: `{ "product": Product }`
- **404**: `{ "error": "Product 42 not found" }`

#### 6. `DELETE /products/:id`
- **204**: empty body. (Cascade removes `OrderItem` rows referencing this product.)
- **404**: `{ "error": "Product 42 not found" }`

#### 7. `GET /orders`
- **200**: `{ "orders": Order[] }` — each order is returned with its `orderItems` array embedded.

`Order` JSON shape:
```json
{
  "id": 1,
  "customer": "Han Solo",
  "totalPrice": 89.97,
  "status": "completed",
  "createdAt": "2023-04-06T10:00:00.000Z",
  "orderItems": [
    { "id": 1, "orderId": 1, "productId": 1, "quantity": 2, "price": 29.99 },
    { "id": 2, "orderId": 1, "productId": 4, "quantity": 1, "price": 1.99 }
  ]
}
```

#### 8. `GET /orders/:id`
- **200**: `{ "order": Order }`
- **404**: `{ "error": "Order 42 not found" }`

#### 9. `POST /orders` — the important one

**Request body** (server computes total; client never sends it):
```json
{
  "customer": "Han Solo",
  "items": [
    { "productId": 1, "quantity": 2 },
    { "productId": 4, "quantity": 1 }
  ]
}
```

Validation (all 400):
- `customer` is a non-empty string.
- `items` is a non-empty array.
- Every `item.productId` is an integer that exists in `Product`.
- Every `item.quantity` is an integer ≥ 1.

**201 response** — the created order with its items embedded:
```json
{
  "order": {
    "id": 3,
    "customer": "Han Solo",
    "totalPrice": 61.97,
    "status": "pending",
    "createdAt": "2026-06-17T18:30:00.000Z",
    "orderItems": [
      { "id": 5, "orderId": 3, "productId": 1, "quantity": 2, "price": 29.99 },
      { "id": 6, "orderId": 3, "productId": 4, "quantity": 1, "price": 1.99 }
    ]
  }
}
```

**Error cases**
- **400** — `{ "error": "items must be a non-empty array" }` (validation, before any DB write)
- **400** — `{ "error": "Product 999 does not exist" }` (referential check, before any DB write)
- **500** — `{ "error": "Failed to create order" }` (transaction rolled back; nothing was written)

#### 10. `PUT /orders/:id`

Update an order's `customer` and/or `status`. The line items (`orderItems`) and the computed `totalPrice` are **not** mutable through this endpoint — the items are the source of truth for the total, and rewriting them after the fact would invalidate the snapshot guarantees from D4. If items truly need to change, the supported paths are: (a) **append** a new line via `POST /orders/:order_id/items` (§2.13, governed by D5), or (b) cancel the order and create a new one. In-place edits and deletions of existing items remain unsupported on purpose.

- **Body**: any subset of `{ customer, status }`. `status` must be one of `pending`, `completed`, `cancelled`.
- **200**: `{ "order": Order }` — same shape as `GET /orders/:id`, with `orderItems` embedded.
- **400** — `{ "error": "Invalid order id" }` if `:id` is non-numeric.
- **400** — `{ "error": "customer must be a non-empty string" }` if `customer` is provided but empty.
- **400** — `{ "error": "status must be one of: pending, completed, cancelled" }` if `status` is provided but not on the allowlist.
- **400** — `{ "error": "No updatable fields provided" }` if the body has neither field.
- **404** — `{ "error": "Order 42 not found" }`.

#### 11. `DELETE /orders/:id`

- **204**: empty body. Cascade removes `OrderItem` rows referencing this order (per D2/[planning.md:49](#L49) — and this is the *correct* default, since line items have no meaning without their parent order).
- **400** — `{ "error": "Invalid order id" }` if `:id` is non-numeric.
- **404** — `{ "error": "Order 42 not found" }`.

#### 12. `GET /order-items`

List every `OrderItem` row in the database. This is the inventory-of-line-items view — a flat denormalized list useful for analytics ("which products move the most?") and as the building block for the upcoming Past Orders pages on the frontend. Per-order items are still embedded in the `Order` response (see §2.7), so this endpoint exists for the cases where the *items* are the unit of interest, not the orders that own them.

- **200**: `{ "orderItems": OrderItem[] }`

`OrderItem` JSON shape — same fields as the embedded form in §2.7, with `price` coerced to a JSON number per D1:
```json
{
  "id": 5,
  "orderId": 3,
  "productId": 1,
  "quantity": 2,
  "price": 29.99
}
```

**Query parameters** — optional:

| Param      | Type    | Effect                                                |
|------------|---------|-------------------------------------------------------|
| `orderId`  | integer | Filter to items belonging to this order. Returns `[]` if the order has no items (or doesn't exist — we don't probe the parent on this path; if the caller needs a 404 for missing orders, they should use `GET /orders/:id`). |

**Default behavior** (no params): return every `OrderItem` ordered by `id` ascending. Stable internal default; not part of the contract.

**Errors**
- **400** — `{ "error": "Invalid orderId" }` if `orderId` is provided but isn't a positive integer.

#### 13. `POST /orders/:order_id/items`

Append a new line item to an existing order. The parent order's `totalPrice` is recomputed inside the same transaction so the snapshot invariant from D4 still holds (`Order.totalPrice` always equals `Σ (OrderItem.price × quantity)` over its rows).

This endpoint is a **deliberate amendment** to the original spec, which declared in §2.10 and decision D4 that order items are immutable after creation. The new rule (recorded as **D5** below) is: **items can be *appended* to an order, but never modified or deleted; `totalPrice` is recomputed by the server.** Appends are safe — they extend the historical record monotonically — whereas in-place edits would invalidate the price snapshot.

- **Body**:
  ```json
  { "productId": 1, "quantity": 2 }
  ```
- **201**: `{ "order": Order }` — the **full** parent order with the newly-added item embedded in `orderItems` and `totalPrice` reflecting the new sum. Same shape as `GET /orders/:id`. We return the whole order (not just the new item) because the most common caller need is "show the user the updated order," and forcing them to do a follow-up `GET /orders/:order_id` is a wasted round-trip.

**Validation** (all `400`, all checked before any DB write):
- `:order_id` parses to a positive integer.
- `productId` is a positive integer that exists in `Product`.
- `quantity` is a positive integer ≥ 1.

**Transactional behavior** — runs inside a single `prisma.$transaction`:
1. Re-fetch the order (inside the transaction) to confirm it still exists. If it's gone (deleted between request arrival and transaction start), return **404**.
2. Fetch the current `Product` row for `productId` and capture its `price` — this becomes the snapshot `OrderItem.price` per D4. (Even though §2.13 reuses the existing price-snapshot rule, the lookup happens *inside* the transaction here so we can't race a product deletion between price-read and item-insert.)
3. Insert the new `OrderItem` row.
4. Recompute `totalPrice` as `Σ (price × quantity)` over the order's items (including the new one) and update the `Order` row.
5. Re-read the order with `include: { orderItems: true }` and return it.

Steps 2–4 must commit together or roll back together. A partial write where the item exists but `totalPrice` wasn't recomputed would silently break the D4 invariant for every future reader.

**Error cases**
- **400** — `{ "error": "Invalid order id" }` if `:order_id` is non-numeric.
- **400** — `{ "error": "productId must be a positive integer" }` / `{ "error": "quantity must be a positive integer" }`.
- **400** — `{ "error": "Product 999 does not exist" }` (referential check).
- **404** — `{ "error": "Order 42 not found" }` (parent order doesn't exist).
- **500** — `{ "error": "Failed to add item to order" }` (transaction rolled back; nothing was written, `totalPrice` is unchanged).

**What does *not* change**: the order's `status` is **not** touched by appending an item. A `completed` or `cancelled` order can still have items appended through this endpoint — see D5 for the rationale (the spec leaves the "lock items on completion" policy to a future state-machine pass; for now the only invariant we enforce is the D4 snapshot).

---

## Section 3: Transactional Flow — `POST /orders`

This endpoint must behave as a single atomic operation. Either the `Order` row, **all** of its `OrderItem` rows, and the computed `totalPrice` are all written, or **none** of them are. There must never be an `Order` row with a partial item list, because the `totalPrice` would no longer reconcile to its items.

### 3.1 Step-by-step

1. **Parse and shape-validate the body.**
   Reject with `400` if `customer` is missing/empty or `items` is missing/empty/not an array. No DB call has happened.

2. **Per-item shape-validate.**
   Every `item` must have `productId: Int` and `quantity: Int ≥ 1`. Reject with `400` listing the offending index. Still no DB call.

3. **Look up every referenced product in one query.**
   `prisma.product.findMany({ where: { id: { in: productIds } } })`. One round-trip, not N. Build a `Map<productId, product>` from the result.

4. **Referential validation.**
   For each requested `productId`, confirm the map contains it. If any are missing, reject with `400` and name the first missing id. No write has happened yet — important: validation lives *outside* the transaction so a bad request returns fast and we don't open a transaction we will only roll back.

5. **Compute `totalPrice` server-side.**
   `total = Σ (productMap[productId].price × quantity)`. This value is what gets persisted; the client's number, if any, is ignored.

6. **Open a Prisma transaction (`prisma.$transaction`) and inside it:**
   a. `prisma.order.create({ data: { customer, totalPrice: total, status: 'pending', orderItems: { create: items.map(i => ({ productId: i.productId, quantity: i.quantity, price: productMap[i.productId].price })) } }, include: { orderItems: true } })`.

   Prisma's nested `create` inside a single `order.create` already runs as one atomic statement at the DB level — wrapping it in `$transaction` is redundant for *this* single-statement case, but I am wrapping it anyway because:
   - Future iterations (e.g. decrementing inventory, creating a payment row) will add sibling writes that *do* need the explicit transaction.
   - It makes the atomicity guarantee visible at the call site instead of implicit in Prisma's nested-write behavior.

7. **Return `201` with the order (including its `orderItems`) as the response body.**

### 3.2 Failure modes and what each one returns

| Failure                                         | Where caught            | DB state         | Response |
|-------------------------------------------------|-------------------------|------------------|----------|
| `items` missing or empty                        | Step 1 — body validation | Untouched        | `400 { "error": "items must be a non-empty array" }` |
| `quantity < 1` or non-integer                   | Step 2 — item validation | Untouched        | `400 { "error": "items[2].quantity must be a positive integer" }` |
| `productId` references a nonexistent product    | Step 4 — referential check | Untouched      | `400 { "error": "Product 999 does not exist" }` |
| DB connection drops mid-transaction             | Step 6 — Prisma throws  | Rolled back — Postgres aborts the transaction | `500 { "error": "Failed to create order" }` |
| Product is deleted *between* step 3 and step 6  | Step 6 — FK violation   | Rolled back — `OrderItem` insert fails the FK check, the whole `order.create` aborts | `500 { "error": "Failed to create order" }` |

The race in row 5 (TOCTOU between the `findMany` lookup and the `create`) is the reason the lookup *cannot* be the only safety net — the FK constraint inside the transaction is the actual guarantee. The pre-flight `findMany` exists only to give a clean `400` for the common case (typo in productId), so callers don't have to parse a `500`.

### 3.3 Why this shape, not the alternatives

- **Why not have the client send `totalPrice`?** Trusting it is a price-manipulation vulnerability. The server has the prices already; recomputing costs nothing.
- **Why not loop and call `prisma.orderItem.create()` per item without `$transaction`?** Any failure mid-loop leaves a half-written order. The atomicity requirement isn't optional — it's the whole reason this section exists.
- **Why snapshot `price` onto `OrderItem` instead of joining to `Product` at read time?** Prices change. An order placed today for `$29.99` should still show `$29.99` next year, even if the product is repriced or deleted. See decision D4.
- **Why validate `productId`s before opening the transaction instead of catching the FK error inside?** Two reasons: (a) a `400` is the right code for "you sent a bad id" and a caught FK error is hard to translate cleanly into a useful message, (b) opening a transaction we're going to roll back wastes a connection slot under load.

### 3.4 Details not previously called out

Three small things that turned out to matter during implementation. Adding them here so the spec is the complete implementation guide:

- **Duplicate `productId`s across `items` are allowed.** A body like `[{ productId: 1, quantity: 2 }, { productId: 1, quantity: 3 }]` is valid: it creates two `OrderItem` rows for the same product, with the total summing as `5 × price1`. The lookup deduplicates ids before the `findMany` (one DB round-trip), but the line items themselves are written one-per-input-entry. This makes the API match how a real shopping cart would behave if it didn't merge lines client-side.

- **`Decimal` → number serialization.** Per D1, Prisma returns `Decimal.js` instances for `totalPrice` and `OrderItem.price`. These JSON-stringify as **strings** (e.g. `"29.99"`), but the response shape in Section 2.7/2.9 shows them as JSON numbers (`29.99`). The controller serializes via a `Number(...)` coercion before sending. The contract numbers, the model returns `Decimal`, the controller bridges. Don't move the coercion into the model — `Decimal` is the right representation for the `Σ (price × quantity)` math; precision only needs to be flattened at the JSON boundary.

- **The order's `status` is always `"pending"` on creation.** The client cannot set it via `POST /orders`. Any `status` field in the request body is silently ignored — the model hardcodes `status: 'pending'` in the `data` block. Mutating an order's status is what `PUT /orders/:id` is for. This is a deliberate restriction: an order that arrives already-`completed` would skip the workflow that an order is supposed to go through.

### 3.5 Transactional Flow — `POST /orders/:order_id/items` (append-item, recompute total)

The "append a line item" path runs as its own atomic operation. Either the new `OrderItem` row, **and** the recomputed parent `Order.totalPrice`, are both persisted — or neither is. There must never be an `Order` whose `totalPrice` doesn't reconcile to the sum of its current items (the D4 invariant).

**Step-by-step**

1. **Shape-validate the request.** Reject with `400` if `:order_id` isn't a positive integer, or if `productId`/`quantity` are missing/non-integer/non-positive. No DB call has happened.

2. **Confirm the product exists (referential check, pre-transaction).** `prisma.product.findUnique({ where: { id: productId } })`. If absent, return `400 "Product N does not exist"`. We don't open a transaction for a request we already know will fail; this matches the `POST /orders` discipline from §3.1.

3. **Open the transaction (`prisma.$transaction`).** Inside the callback `tx`:
   - **3a.** Re-fetch the order: `tx.order.findUnique({ where: { id: orderId }, include: { orderItems: true } })`. If null, throw a typed `OrderNotFoundError` — the controller catches it and translates to `404 "Order N not found"`. We re-check inside the transaction because the order may have been deleted between step 2's product lookup and the transaction's start.
   - **3b.** Re-fetch the product's price *inside* the transaction: `tx.product.findUnique({ where: { id: productId } })`. This is the snapshot price for the new line (per D4). Doing this read inside the transaction closes the TOCTOU window: the only way to race a product deletion now is to delete it *inside another concurrent transaction*, and Postgres's serializable-snapshot semantics will surface that as a serialization failure rather than a silent FK violation. (For the academic build with no concurrent writers, this is belt-and-braces, but it's the correct shape.)
   - **3c.** Insert the new `OrderItem`: `tx.orderItem.create({ data: { orderId, productId, quantity, price: product.price } })`.
   - **3d.** Recompute `totalPrice`. Two equivalent ways: re-fetch the full items list and sum, or sum the previously-fetched list plus the new line. We use the latter — the order row from 3a already has `orderItems`, so we add `(product.price × quantity)` to its existing sum. Cheaper and avoids an extra round-trip.
   - **3e.** `tx.order.update({ where: { id: orderId }, data: { totalPrice: newTotal } })`.
   - **3f.** Re-read the order with items included and return it from the callback.

4. **Commit happens automatically when the callback returns.** The controller serializes the returned order (the same `serializeOrder` from `orderController.js`) and responds with `201 { order: Order }`.

**Failure modes**

| What goes wrong                                                                                  | Status | Body                                                  | Wrote anything? |
|--------------------------------------------------------------------------------------------------|--------|-------------------------------------------------------|-----------------|
| `:order_id` is not a positive integer.                                                           | 400    | `{ "error": "Invalid order id" }`                     | No              |
| `productId` or `quantity` malformed.                                                             | 400    | `{ "error": "productId must be a positive integer" }` (or the analogous `quantity` message) | No |
| `productId` doesn't reference an existing product (step 2).                                      | 400    | `{ "error": "Product N does not exist" }`             | No              |
| Order doesn't exist when the transaction starts (step 3a).                                       | 404    | `{ "error": "Order N not found" }`                    | No (transaction rolls back) |
| Product deleted between step 2 and step 3b (TOCTOU race, very narrow window in practice).        | 500    | `{ "error": "Failed to add item to order" }`          | No (transaction rolls back) |
| DB connection failure / other Prisma error inside the transaction.                               | 500    | `{ "error": "Failed to add item to order" }`          | No (transaction rolls back) |

**Why this shape, not the alternatives**

- **Why recompute `totalPrice` in the model instead of letting it drift?** Because every reader of `Order` (frontend receipts, the future Past Orders page, analytics queries) treats `totalPrice` as authoritative. If we let it stay stale and re-derive at read time, the column becomes a footgun for anyone joining against it. The D4 snapshot rule is what makes orders historically stable; losing the on-row total would weaken it.
- **Why not delegate to `POST /orders`'s existing `Order.create` and have it write *one extra* item?** Because that path inserts a new `Order` row. Appending to an existing order is a structurally different write (`UPDATE` on the parent, `INSERT` on the child), so reusing the same model method would mean smuggling a "skip the order create" flag through it. New endpoint, new model method (`OrderItem.appendToOrder` or similar), one job each.
- **Why a typed `OrderNotFoundError` instead of returning `null` from the transaction and letting the controller branch?** Because the transaction's return type needs to be the success-shape order. Throwing inside the callback aborts the transaction cleanly (`ROLLBACK`) and gives the controller a single switch (`err instanceof OrderNotFoundError`) instead of a discriminated union return. Same shape as Prisma's own `P2025` pattern.

---

## Decisions Log — Product Model

- **Schema translation that went smoothly**: `Decimal(10, 2)` for `price` mapped cleanly from the planning doc to `@db.Decimal(10, 2)` in Prisma. The `@map("image_url")` and `@map("created_at")` annotations also kept the JS-side camelCase / DB-side snake_case split that D1 implied without any extra work — the model layer never has to think about the column names.

- **Field decision made during implementation that wasn't in the original spec**: split the model and controller into separate files (`models/productModel.js` + `controllers/productController.js`) instead of putting Express handlers directly in the model. The planning doc was silent on file layout; the split keeps the DB layer reusable from non-HTTP callers (scripts, future tests, the seed file) and matches the structure the `Order` controller will need when it has both HTTP-shaped validation *and* a `prisma.$transaction` block.

- **Route behavior that needed a spec update**: added two `400` cases the spec didn't enumerate — `Invalid product id` when `:id` is non-numeric (e.g. `/products/abc`), and `No updatable fields provided` when `PUT /products/:id` is called with an empty/junk body. Both surface as `{ "error": "..." }` per the standard error shape, so they're consistent with Section 2 — but the planning doc only spelled out the `400 Missing required field` case for `POST`. Worth a one-line update to the `PUT` and `:id` rows in Section 2.1 so the contract reflects what the server actually returns.

---

## Spec Reconciliation — Milestone 4 (Schema Audit)

### Schema vs. spec gaps found

- **No field-level gaps.** Every field in Section 1.1–1.3 is present in `schema.prisma` with the spec'd type, default, and nullability. No surprise fields in the schema either (no `updatedAt`, no `slug`, no soft-delete column) — the schema is exactly what the spec describes, nothing more.
- **Column-name mappings extended past what the spec called out.** Spec mentioned `@map("image_url")` and `@map("created_at")` explicitly, but the schema also maps `total_price`, `order_id`, and `product_id` for consistency — every multi-word column lands as snake_case in Postgres while staying camelCase in JS. The spec was silent on these; treating them as a natural extension rather than a divergence.
- **`OrderItem.quantity ≥ 1` is enforced in the controller, not the schema** — exactly as the spec called for at [Section 1.3](#L62). Confirmed the route handler rejects `quantity: 0` with `400 items[N].quantity must be a positive integer` rather than letting Prisma store the row. Documenting this here so future-me doesn't try to add a `@@check` thinking it was forgotten.

### Cascade delete verification

- **Deleting a `Product` removes associated `OrderItem` rows: ✅ tested.** Created an order with two line items, deleted one of the referenced products via `DELETE /products/:id`, then re-fetched the order via `GET /orders/:id`. The matching `orderItem` was gone; the order row survived with a stale `totalPrice` (the documented consequence from D2/[planning.md:84](#L84)), and the unrelated `orderItem` remained intact.
- **Deleting an `Order` removes associated `OrderItem` rows: ✅ tested.** Created a fresh order, captured its `orderItem` ids, deleted the order via `DELETE /orders/:id`, then checked `prisma.orderItem` in Prisma Studio. None of the captured ids remained. The order's parent `Product` rows were unaffected — cascade is correctly scoped.

### Verdict

Schema, spec, and behavior are aligned. No code changes triggered by this audit; the schema as committed is the schema the spec describes, and the cascade rules behave exactly as Sections 1.1 and 1.2 promise.

---

## Decisions Log — Order Creation Transaction

- **What the Transactional Flow spec got right**: the *outside-the-transaction validation* ordering was the most valuable thing the spec front-loaded. Doing shape validation → single `findMany` lookup → referential check → compute total → `$transaction` (in that order) meant the route returns `400` fast for the common "typo in productId" case and never opens a transaction it's going to roll back. When I started writing the controller, every guard had an obvious home because Section 3.1 had already worked out where each check belongs. The single bulk `findMany({ where: { id: { in: productIds } } })` was also exactly right — the "one round-trip, not N" call-out saved a future-me from looping `prisma.product.findUnique` in the validation step.

- **What the spec missed that was discovered during implementation**: three details that the original Section 3 didn't address, now captured in the new **Section 3.4**:
  1. **Duplicate `productId`s in `items` are allowed** — a body with `[{ productId: 1, quantity: 2 }, { productId: 1, quantity: 3 }]` is valid and writes two `OrderItem` rows. The spec never said yes or no; the implementation accepts it (matches real shopping-cart behavior when lines aren't merged client-side). Worth being explicit about so a future reader doesn't think it's a bug.
  2. **Where the `Decimal` → JSON number coercion happens**. D1 said "route handlers must `.toNumber()` before sending JSON" but didn't pick a layer. The implementation does the coercion in the controller's `serializeOrder`, not the model. Reason: `Decimal` is the correct representation for the `Σ (price × quantity)` math; precision should only be flattened at the JSON boundary.
  3. **`status` is always `"pending"` on creation, regardless of what the client sends**. The model hardcodes it. The original spec implied this (it's the schema default) but never said "the client cannot override it via `POST`." Now spelled out — the only path to a different status is `PUT /orders/:id`.

- **How the transaction error handling works**: `prisma.$transaction(async (tx) => { ... })` opens a real Postgres transaction (`BEGIN`), runs every statement inside the callback on a single dedicated connection using the transactional client `tx`, and then either:
  - **Commits** (`COMMIT`) if the callback returns normally — every write is persisted as one atomic unit.
  - **Rolls back** (`ROLLBACK`) if the callback throws *anything* — every write inside the transaction is undone, including the parent `Order` row. The callback's rejection propagates out as a thrown error, which the controller catches and translates to `500 Failed to create order`.

  The practical guarantees this gives us:
  - If the `Order` row is inserted but a child `OrderItem` insert hits an FK violation (e.g. the TOCTOU race where a product is deleted between the lookup and the transaction), Postgres rolls back the *Order too* — no half-written orders ever exist.
  - If the connection drops between the parent insert and a child insert, Postgres aborts the transaction on connection loss. Same outcome: nothing persists.
  - If a `prisma.*` call somewhere inside throws a JS-level error (validation, type mismatch), the transaction rolls back the same way.

  The wrapper is technically *redundant* for the current single-statement nested-create case — Prisma's nested write is already one DB statement and atomic at that level. The wrapper is there for two reasons: (a) it makes the atomicity guarantee visible at the call site instead of implicit in Prisma's nested-write behavior, and (b) future sibling writes (inventory decrement, payment row) will need the explicit transaction without restructuring the model.

- **One thing I'd design differently if starting over**: I'd push the totalPrice **and** referential validation into the model rather than the controller, and hand the model only `{ customer, items }` instead of `{ customer, items, productPriceById }`. The current split has the controller doing the `findMany`, building the price map, and detecting "Product N does not exist" — then handing both `items` and `productPriceById` to the model. That works, but it means the *controller* knows the shape of the price map and the *model* trusts the controller to have validated. If a second caller ever needs to create orders (a seed script, a test, a future admin endpoint), they have to redo the lookup themselves, which means the existence-check error message would need to be duplicated too.

  The cleaner shape would be: `Order.create({ customer, items })` does everything, throws a typed error (e.g. `class ProductNotFoundError extends Error { constructor(id) { ... } }`) when a product is missing, and the controller catches that specific error and translates it to `400 Product N does not exist`. The transaction wrapper would then enclose *both* the lookup and the insert, eliminating the TOCTOU race entirely and replacing the `500` row in the failure-modes table with a clean `400`. Not worth refactoring now — the current implementation is correct and the planning doc owns the failure-modes contract — but it's the design I'd reach for next time.

---

## Decisions Log — `image_url` JSON Wire Format (Controller Serializer)

- **The decision**: the Product `image_url` field is **snake_case in the JSON wire format only**. The Prisma schema field, the JS variable name, the model layer — all stay `imageUrl` (camelCase, the JS convention). The `productController` translates at the HTTP boundary in both directions.

- **Why**: the React frontend's existing reads (`product.image_url` in `ProductCard.jsx` and `ProductDetail.jsx`) and the seed data file (`data/products.json`) are both snake_case. Two paths to align them: (a) rename the Prisma field to `image_url` end-to-end, or (b) keep the JS-side conventions clean and translate at the JSON boundary. Chose (b) because:
  1. **Every other JSON field is camelCase** — `totalPrice`, `orderId`, `productId`, `createdAt`. Renaming `imageUrl` alone in the Prisma schema would single it out as inconsistent in the *model layer*, where future contributors are most likely to notice.
  2. **The controller is already the precedent for this kind of boundary translation.** `serializeOrder` in `orderController.js` already does the same thing for `Decimal` → JSON number (D1, [planning.md:76](#L76)). Adding `serializeProduct` for `imageUrl` → `image_url` is the same shape.
  3. **No DB migration needed.** Keeping `@map("image_url")` on the Prisma field means the underlying column stays the same and Prisma's generated client is unchanged.

- **How it works in `productController.js`**:
  - `serializeProduct(product)` — outbound — destructures `imageUrl` and re-keys it to `image_url` on the response. Applied to every product before `res.json(...)` in `list`, `get`, `create`, and `update`.
  - `denormalizeProductBody(body)` — inbound — destructures `image_url` from the incoming request body and re-keys it to `imageUrl` before passing to the model. Applied in `create` and `update`.
  - `REQUIRED_FIELDS` is the JSON-side list (`['name', 'description', 'price', 'image_url', 'category']`) so validation messages reference the field name the client actually sent.

- **What this costs**: a tiny bit of CPU per request to clone-and-re-key one field, and one more thing for a maintainer to remember (the model API doesn't match the HTTP API for this one field). The trade is that the snake_case quirk is contained to one file (`productController.js`) and explained in one place (this Decisions Log entry), rather than scattered across the Prisma schema, model, seed, and migration files.

- **The boundary is the contract**: if someone ever needs to call `Product.create({ imageUrl: '...' })` from a non-HTTP context (a test, a seed script, a future admin worker), they use camelCase — the model never saw the snake_case form. The only place `image_url` exists in the codebase is the JSON contract and the frontend that consumes it.

---

## Final Spec Reconciliation: Project Complete

### Full-system audit result
- **All 13 endpoints from Section 2 match the API contract end-to-end.** Walked the customer-order flow (the spec's Section 3 "important one") top to bottom — frontend cart → `POST /orders` body → controller validation → transactional insert → 201 response shape — and the request/response on the wire are byte-for-byte what `planning.md` §2.9 promises. The stretch additions `GET /order-items` (§2.12) and `POST /orders/:order_id/items` (§2.13) were spec'd before code per the same discipline; the new transactional flow in §3.5 governs the append path so the D4 snapshot invariant continues to hold after each append.
- **Spec was silent on CORS.** The implementation enables `cors()` globally in `src/server.js` so the Vite dev server (`http://localhost:5173`) can call the API on port 3000. Open by design for the dev/academic context; production would need an origin allowlist. Treating this as an implementation note rather than a divergence — the spec scoped the contract, not the transport-layer plumbing.
- **Spec was silent on `dotenv` loading and `PORT` precedence.** `server.js` calls `require('dotenv').config()` before reading `process.env.PORT`, falling back to `3000`. Same category as CORS: necessary plumbing not in the contract.
- **Pre-transaction DB failures map to `500 "Failed to create order"`** — the same code/message §2.9 reserved for "transaction rolled back." Practically equivalent (no partial write either way), but noting that the `500` arm covers two cases now: failed `findMany` lookup and failed `$transaction`.
- **Indexed validation errors** (`items[2].quantity must be a positive integer`) are stricter than the bare-array example in §2.9. Aligns with the §3.1 "reject with 400 listing the offending index" requirement, so the contract example is the loose one; implementation matches the flow doc.

### Gaps resolved during frontend integration
- **`CheckoutSuccess` was reading a shape the API doesn't return.** The component originally destructured `order.purchase.receipt.lines[]`, but the 201 response is `{ order: { id, customer, totalPrice, status, createdAt, orderItems[] } }` (§2.9). Every successful checkout fell through to the "confirmation email" placeholder. **Resolved** by rewriting `CheckoutSuccess.jsx` to render directly from `order.orderItems` + `order.totalPrice` — the spec's response shape stands; the frontend was written against an older mock and is now aligned.
- **`dorm_number` was collected by the frontend but never sent.** Removed from `userInfo` state and from the `PaymentInfo` form. The spec doesn't define a delivery location field, so the UI no longer pretends to collect one. If a future `Order.deliveryLocation` column is added, the form can come back with a real binding.
- **No frontend-side empty-cart / empty-name guards.** **Resolved**: `handleOnCheckout` now short-circuits with a local error message when `userInfo.name` is empty or the cart has no items, so the avoidable round-trip is gone. Server validation remains the source of truth — the client guards are duplicate-but-cheap UX.
- **Customer name is `.trim()`-ed server-side before persisting** ([orderController.js:87](controllers/orderController.js#L87)). Spec says "non-empty string"; trimming is a strictly safer interpretation. Captured here so the spec-vs-code diff is complete.
- **Duplicate `productId`s in `items` are accepted** and write two `OrderItem` rows. Already documented in §3.4; calling it out here too so the reconciliation list is exhaustive.

### What the spec enabled during this project
Writing §3.1 — the step-by-step transactional flow — before touching the controller meant every guard had an obvious home: shape-validate → bulk `findMany` → referential check → compute total → `$transaction`. When the validator-then-insert ordering came up later as "should we just catch the FK error?", §3.4 had already explained why the up-front check is preferable, and the answer was a doc-lookup instead of a rederivation. The §2 endpoint table also caught the `CheckoutSuccess` mismatch immediately — the moment the frontend's expected shape (`purchase.receipt.lines`) was placed next to the spec's response (`orderItems[]`), the gap was visible without any debugging.
