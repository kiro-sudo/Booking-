# Security Specification & Payload-First TDD (`security_spec.md`)

## 1. Data Invariants

1. **Per-Date Sequence Monotonicity**: `dateCounters/{dateId}.lastNumber` must start at `0` (or `1` on first booking) and strictly increase by `+1` per booking on that specific `dateId`, never decreasing or resetting, even when a booking is deleted by Admin. Each travel date has its own independent `BT-1, BT-2, ...` sequence.
2. **One Active Booking Per Phone Per Travel Date**: Creating a booking in `bookings/{bookingId}` requires creating `phoneLocks/{datePhoneHash}` (`SHA-256(normalizedPhone + '|' + travelDateId)`) atomically where `phoneLocks/{datePhoneHash}` did not previously exist. The same phone number may book different travel dates, but never the same travel date twice.
3. **Capacity Integrity**: `travelDates/{dateId}.bookedCount` can only increment by `+1` atomically with a valid `dateCounters/{dateId}` increment for the same `dateId`, must satisfy `bookedCount <= capacity`, and Admin cannot update `capacity` below `bookedCount`.
4. **Server Timestamp Integrity**: All `createdAt` and `updatedAt` fields must equal `request.time`.
5. **PII Isolation**: Public `list` queries on `bookings` and `phoneLocks` are forbidden (`allow list: if isAdmin()`). `phoneLocks` stores only cryptographic SHA-256 hashes and `bookingNumber`. `bookings/{bookingId}` uses `SHA-256(normalizedName + '|' + normalizedPhone + '|' + travelDateId)` (and legacy `SHA-256(normalizedName + '|' + normalizedPhone)`) as its document ID so non-admins cannot enumerate or guess other customers' bookings.
6. **Immutable Customer Bookings & Admin-Only Cancellation**: Customers cannot modify, cancel, or delete bookings (`allow update: if isAdmin(); allow delete: if false;`). Only an Admin can transition a booking from `'Confirmed'` to `'Cancelled'` atomically alongside restoring `travelDates/{dateId}.bookedCount` (`-1`, preventing negative capacity or duplicate cancellation). Cancelled bookings remain in Firestore permanently as historical records.
7. **Admin-Managed Support Contact**: Only an Admin can create/update `/settings/contact`; public read (`get` only) exposes the configured support phone and Telegram link.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Shadow Field Injection on Booking Create**: Sending `bookings/{id}` with an extra `isVip: true` field -> Rejected by `keys().hasOnly(...)`.
2. **Spoofed Booking Number**: Sending `bookingNumber: "BT-999"` while `dateCounters/{dateId}` is at `5` -> Rejected by `incoming().bookingNumber == 'BT-' + string(getAfter(dateCounters/$(travelDateId)).data.lastNumber)`.
3. **Device-Clock Timestamp Spoofing**: Sending `createdAt: Timestamp(2020-01-01)` -> Rejected by `incoming().createdAt == request.time`.
4. **Orphan Booking Without Per-Date Counter Increment**: Creating `bookings/{id}` without incrementing `dateCounters/{travelDateId}` in the same transaction -> Rejected by `getAfter(dateCounters/$(travelDateId))` check.
5. **Overbooking Past Capacity**: Updating `travelDates/{dateId}.bookedCount` to `capacity + 1` -> Rejected by `incoming().bookedCount <= existing().capacity`.
6. **Admin Capacity Reduction Below Confirmed Count**: Admin reducing `capacity` to `4` when `bookedCount == 10` -> Rejected by `incoming().capacity >= existing().bookedCount`.
7. **Per-Date Counter Reset Attack**: Attempting to set `dateCounters/{dateId}.lastNumber` to `0` or delete `dateCounters/{dateId}` -> Rejected by `incoming().lastNumber == existing().lastNumber + 1` and `allow delete: if false`.
8. **Duplicate Phone Lock Overwrite**: Attempting to overwrite an existing `phoneLocks/{phoneHash}` via `create` or `update` -> Rejected by `allow create` (doc exists) and `allow update: if isAdmin()`.
9. **Closed Date Booking**: Attempting to increment `bookedCount` on a travel date with `isOpen: false` -> Rejected by `existing().isOpen == true`.
10. **PII Collection Scraping (`list` query)**: Unauthenticated or non-admin user running `getDocs(collection(db, 'bookings'))` -> Rejected by `allow list: if isAdmin()`.
11. **Oversized String Resource Poisoning**: Sending a 1MB `customerName` in `bookings/{id}` -> Rejected by `data.customerName.size() <= 120`.
12. **Unverified Admin Email Spoofing**: Authenticated user whose email is unverified (`email_verified: false`) attempting admin actions -> Rejected by `request.auth.token.email_verified == true`.
