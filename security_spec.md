# Security Specification & Payload-First TDD (`security_spec.md`)

## 1. Data Invariants

1. **Global Sequence Monotonicity**: `counters/booking.lastNumber` must strictly increase by `+1` per booking creation and can never be decreased or deleted, even by an Admin.
2. **One Active Booking Per Phone**: Creating a booking in `bookings/{bookingId}` requires creating `phoneLocks/{phoneHash}` atomically where `phoneLocks/{phoneHash}` did not previously exist.
3. **Capacity Integrity**: `travelDates/{dateId}.bookedCount` can only increment by `+1` atomically with a valid `counters/booking` increment, must satisfy `bookedCount <= capacity`, and Admin cannot update `capacity` below `bookedCount`.
4. **Server Timestamp Integrity**: All `createdAt` and `updatedAt` fields must equal `request.time`.
5. **PII Isolation**: Public `list` queries on `bookings` and `phoneLocks` are forbidden (`allow list: if isAdmin()`). `phoneLocks` stores only cryptographic SHA-256 hashes and `bookingNumber`. `bookings/{bookingId}` uses `SHA-256(normalizedName + '|' + normalizedPhone)` as its document ID so non-admins cannot enumerate or guess other customers' bookings.
6. **Immutable Customer Bookings**: Customers cannot modify or delete existing bookings (`allow update, delete: if isAdmin()`).

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Shadow Field Injection on Booking Create**: Sending `bookings/{id}` with an extra `isVip: true` field -> Rejected by `keys().hasOnly(...)`.
2. **Spoofed Booking Number**: Sending `bookingNumber: "BT-999"` while counter is at `5` -> Rejected by `incoming().bookingNumber == 'BT-' + string(getAfter(counters/booking).data.lastNumber)`.
3. **Device-Clock Timestamp Spoofing**: Sending `createdAt: Timestamp(2020-01-01)` -> Rejected by `incoming().createdAt == request.time`.
4. **Orphan Booking Without Counter Increment**: Creating `bookings/{id}` without updating `counters/booking` in the same transaction -> Rejected by `getAfter(counters/booking)` check.
5. **Overbooking Past Capacity**: Updating `travelDates/{dateId}.bookedCount` to `capacity + 1` -> Rejected by `incoming().bookedCount <= existing().capacity`.
6. **Admin Capacity Reduction Below Confirmed Count**: Admin reducing `capacity` to `4` when `bookedCount == 10` -> Rejected by `incoming().capacity >= existing().bookedCount`.
7. **Counter Reset Attack**: Attempting to set `counters/booking.lastNumber` to `0` or delete `counters/booking` -> Rejected by `incoming().lastNumber >= existing().lastNumber` and `allow delete: if false`.
8. **Duplicate Phone Lock Overwrite**: Attempting to overwrite an existing `phoneLocks/{phoneHash}` via `create` or `update` -> Rejected by `allow create` (doc exists) and `allow update: if isAdmin()`.
9. **Closed Date Booking**: Attempting to increment `bookedCount` on a travel date with `isOpen: false` -> Rejected by `existing().isOpen == true`.
10. **PII Collection Scraping (`list` query)**: Unauthenticated or non-admin user running `getDocs(collection(db, 'bookings'))` -> Rejected by `allow list: if isAdmin()`.
11. **Oversized String Resource Poisoning**: Sending a 1MB `customerName` in `bookings/{id}` -> Rejected by `data.customerName.size() <= 120`.
12. **Unverified Admin Email Spoofing**: Authenticated user whose email is unverified (`email_verified: false`) attempting admin actions -> Rejected by `request.auth.token.email_verified == true`.
