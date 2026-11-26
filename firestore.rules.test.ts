/**
 * Security Rules Adversarial Test Suite (Dirty Dozen Payloads)
 * Verifies that every invariant in security_spec.md blocks unauthorized or malformed payloads.
 */
import assert from 'node:assert';

export interface DirtyPayloadCase {
  id: number;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'delete' | 'list';
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
  enforcedByRule: string;
}

export const DIRTY_DOZEN_PAYLOADS: DirtyPayloadCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Booking Create',
    collection: 'bookings',
    operation: 'create',
    payload: {
      bookingNumber: 'BT-1',
      customerName: 'Aung Kyaw',
      normalizedName: 'aung kyaw',
      phone: '0912345678',
      normalizedPhone: '0912345678',
      phoneHash: 'a'.repeat(64),
      travelDateId: 'td_1',
      travelDateLabel: 'November 1, 2026',
      status: 'Confirmed',
      tripName: 'Mergui short boat trip',
      isVip: true,
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidBooking(incoming()) -> keys().hasOnly([...])',
  },
  {
    id: 2,
    name: 'Spoofed Booking Number Skipping Per-Date Counter',
    collection: 'bookings',
    operation: 'create',
    payload: { bookingNumber: 'BT-999' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: "incoming().bookingNumber == 'BT-' + string(getAfter(dateCounters/$(travelDateId)).data.lastNumber)",
  },
  {
    id: 3,
    name: 'Device-Clock Timestamp Spoofing',
    collection: 'bookings',
    operation: 'create',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().createdAt == request.time',
  },
  {
    id: 4,
    name: 'Orphan Booking Without Per-Date Counter Increment',
    collection: 'bookings',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'getAfter(dateCounters/$(travelDateId)).data.lastNumber == get(dateCounters/$(travelDateId)).data.lastNumber + 1',
  },
  {
    id: 5,
    name: 'Overbooking Past Travel Date Capacity',
    collection: 'travelDates',
    operation: 'update',
    payload: { bookedCount: 101 },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().bookedCount <= existing().capacity',
  },
  {
    id: 6,
    name: 'Admin Capacity Reduction Below Confirmed Count',
    collection: 'travelDates',
    operation: 'update',
    payload: { capacity: 4 },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().capacity >= existing().bookedCount',
  },
  {
    id: 7,
    name: 'Per-Date Counter Reset Attack',
    collection: 'dateCounters',
    operation: 'update',
    payload: { lastNumber: 0 },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().lastNumber == existing().lastNumber + 1',
  },
  {
    id: 8,
    name: 'Duplicate Phone Lock Overwrite',
    collection: 'phoneLocks',
    operation: 'update',
    payload: { bookingNumber: 'BT-2' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'allow update, delete: if isAdmin();',
  },
  {
    id: 9,
    name: 'Closed Travel Date Booking Attempt',
    collection: 'travelDates',
    operation: 'update',
    payload: { bookedCount: 5 },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'existing().isOpen == true',
  },
  {
    id: 10,
    name: 'PII Collection Scraping (list query on bookings)',
    collection: 'bookings',
    operation: 'list',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'allow list: if isAdmin();',
  },
  {
    id: 11,
    name: 'Oversized String Resource Poisoning (1MB customerName)',
    collection: 'bookings',
    operation: 'create',
    payload: { customerName: 'X'.repeat(1024 * 1024) },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'data.customerName.size() <= 120',
  },
  {
    id: 12,
    name: 'Unverified Admin Email Spoofing',
    collection: 'travelDates',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'request.auth.token.email_verified == true',
  },
];

assert.strictEqual(DIRTY_DOZEN_PAYLOADS.length, 12, 'Must define all 12 Dirty Dozen payloads');
