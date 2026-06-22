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
| `imageUrl`    | `String`    | yes      | —                    | Mapped to column `image_url` via `@map`. |
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
  "imageUrl": "https://tinyurl.com/college-hoodie",
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
- **Body**: `{ name, description, price, imageUrl, category }`
- **201**: `{ "product": Product }`
- **400**: `{ "error": "Missing required field: price" }`

#### 5. `PUT /products/:id`
- **Body**: any subset of `{ name, description, price, imageUrl, category }`
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

Update an order's `customer` and/or `status`. The line items (`orderItems`) and the computed `totalPrice` are **not** mutable through this endpoint — the items are the source of truth for the total, and rewriting them after the fact would invalidate the snapshot guarantees from D4. If items truly need to change, the correct flow is to cancel the order and create a new one.

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
