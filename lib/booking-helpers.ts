import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { formatTravelDateLabel, TRIP_INFO } from './i18n';

export interface TravelDateRecord {
  id: string;
  date: string; // YYYY-MM-DD
  label: string;
  capacity: number;
  bookedCount: number;
  isOpen: boolean;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface BookingRecord {
  id: string;
  bookingNumber: string;
  customerName: string;
  normalizedName: string;
  phone: string;
  normalizedPhone: string;
  phoneHash: string;
  travelDateId: string;
  travelDateLabel: string;
  status: 'Confirmed';
  tripName: string;
  createdAtMs: number;
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizePhone(phone: string): string {
  const stripped = phone.trim().replace(/[\s\-().]/g, '');
  if (stripped.startsWith('+959')) {
    return '09' + stripped.slice(4);
  }
  if (stripped.startsWith('959') && stripped.length >= 10) {
    return '09' + stripped.slice(3);
  }
  return stripped;
}

export function validateBookingInputs(name: string, phone: string): {
  valid: boolean;
  cleanName: string;
  normalizedName: string;
  cleanPhone: string;
  normalizedPhone: string;
} {
  const cleanName = name.trim().replace(/\s+/g, ' ');
  const normName = normalizeName(cleanName);
  const cleanPhone = phone.trim().replace(/\s+/g, ' ');
  const normPhone = normalizePhone(cleanPhone);

  const validName = cleanName.length >= 2 && cleanName.length <= 120;
  const validPhone = /^[0-9+]{6,24}$/.test(normPhone);

  return {
    valid: validName && validPhone,
    cleanName,
    normalizedName: normName,
    cleanPhone,
    normalizedPhone: normPhone,
  };
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function mapTravelDate(id: string, data: Record<string, unknown>): TravelDateRecord {
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : 0;
  const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : 0;
  return {
    id,
    date: String(data.date ?? ''),
    label: String(data.label ?? ''),
    capacity: Number(data.capacity ?? 0),
    bookedCount: Number(data.bookedCount ?? 0),
    isOpen: Boolean(data.isOpen),
    createdAtMs: createdAt,
    updatedAtMs: updatedAt,
  };
}

function mapBooking(id: string, data: Record<string, unknown>): BookingRecord {
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
  return {
    id,
    bookingNumber: String(data.bookingNumber ?? ''),
    customerName: String(data.customerName ?? ''),
    normalizedName: String(data.normalizedName ?? ''),
    phone: String(data.phone ?? ''),
    normalizedPhone: String(data.normalizedPhone ?? ''),
    phoneHash: String(data.phoneHash ?? ''),
    travelDateId: String(data.travelDateId ?? ''),
    travelDateLabel: String(data.travelDateLabel ?? ''),
    status: 'Confirmed',
    tripName: String(data.tripName ?? TRIP_INFO.en.name),
    createdAtMs: createdAt,
  };
}

export async function fetchTravelDates(): Promise<TravelDateRecord[]> {
  try {
    const q = query(collection(db, 'travelDates'), orderBy('date', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapTravelDate(d.id, d.data() as Record<string, unknown>));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'travelDates');
  }
}

export type CreateBookingResult =
  | { status: 'created'; booking: BookingRecord }
  | { status: 'existing'; booking: BookingRecord }
  | { status: 'phone_conflict' }
  | { status: 'no_capacity' }
  | { status: 'not_initialized' }
  | { status: 'invalid_input' };

export async function createAtomicBooking(
  customerName: string,
  phone: string
): Promise<CreateBookingResult> {
  const check = validateBookingInputs(customerName, phone);
  if (!check.valid) {
    return { status: 'invalid_input' };
  }

  const { cleanName, normalizedName, cleanPhone, normalizedPhone } = check;
  const phoneHash = await sha256Hex(normalizedPhone);
  const nameHash = await sha256Hex(normalizedName);
  const bookingId = await sha256Hex(`${normalizedName}|${normalizedPhone}`);

  const phoneLockRef = doc(db, 'phoneLocks', phoneHash);
  const bookingRef = doc(db, 'bookings', bookingId);
  const counterRef = doc(db, 'counters', 'booking');

  // Pre-check existing phone lock to avoid unnecessary transactions on repeat clicks
  try {
    const lockSnap = await getDocFromServer(phoneLockRef);
    if (lockSnap.exists()) {
      const lockData = lockSnap.data() as { nameHash: string };
      if (lockData.nameHash === nameHash) {
        const existingSnap = await getDocFromServer(bookingRef);
        if (existingSnap.exists()) {
          return {
            status: 'existing',
            booking: mapBooking(existingSnap.id, existingSnap.data() as Record<string, unknown>),
          };
        }
      }
      return { status: 'phone_conflict' };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `phoneLocks/${phoneHash}`);
  }

  // Retry loop handles simultaneous requests that fill the earliest open date
  for (let attempt = 0; attempt < 5; attempt++) {
    const allDates = await fetchTravelDates();
    const openCandidates = allDates.filter((d) => d.isOpen && d.bookedCount < d.capacity);

    if (openCandidates.length === 0) {
      return { status: 'no_capacity' };
    }

    const candidate = openCandidates[0];
    const dateRef = doc(db, 'travelDates', candidate.id);

    try {
      const txOutcome = await runTransaction(db, async (tx) => {
        const lockSnap = await tx.get(phoneLockRef);
        if (lockSnap.exists()) {
          const lockData = lockSnap.data() as { nameHash: string };
          if (lockData.nameHash === nameHash) {
            const existingSnap = await tx.get(bookingRef);
            if (existingSnap.exists()) {
              return { kind: 'existing' as const };
            }
          }
          throw new Error('__PHONE_CONFLICT__');
        }

        const counterSnap = await tx.get(counterRef);
        if (!counterSnap.exists()) {
          throw new Error('__NOT_INITIALIZED__');
        }

        const dateSnap = await tx.get(dateRef);
        if (!dateSnap.exists()) {
          throw new Error('__DATE_FULL_RETRY__');
        }
        const dateData = dateSnap.data() as {
          isOpen: boolean;
          bookedCount: number;
          capacity: number;
          label: string;
        };
        if (!dateData.isOpen || dateData.bookedCount >= dateData.capacity) {
          throw new Error('__DATE_FULL_RETRY__');
        }

        const currentNumber = Number((counterSnap.data() as { lastNumber: number }).lastNumber ?? 0);
        const nextNumber = currentNumber + 1;
        const bookingNumber = `BT-${nextNumber}`;

        tx.update(counterRef, {
          lastNumber: nextNumber,
          lastBookingId: bookingId,
          updatedAt: serverTimestamp(),
        });

        tx.update(dateRef, {
          bookedCount: dateData.bookedCount + 1,
          updatedAt: serverTimestamp(),
        });

        tx.set(phoneLockRef, {
          bookingId,
          bookingNumber,
          nameHash,
          createdAt: serverTimestamp(),
        });

        tx.set(bookingRef, {
          bookingNumber,
          customerName: cleanName,
          normalizedName,
          phone: cleanPhone,
          normalizedPhone,
          phoneHash,
          travelDateId: candidate.id,
          travelDateLabel: dateData.label,
          status: 'Confirmed',
          tripName: TRIP_INFO.en.name,
          createdAt: serverTimestamp(),
        });

        return { kind: 'created' as const };
      });

      const finalSnap = await getDocFromServer(bookingRef);
      if (finalSnap.exists()) {
        return {
          status: txOutcome.kind,
          booking: mapBooking(finalSnap.id, finalSnap.data() as Record<string, unknown>),
        };
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === '__PHONE_CONFLICT__') return { status: 'phone_conflict' };
        if (error.message === '__NOT_INITIALIZED__') return { status: 'not_initialized' };
        if (error.message === '__DATE_FULL_RETRY__') continue;
      }
      handleFirestoreError(error, OperationType.WRITE, `bookings/${bookingId}`);
    }
  }

  return { status: 'no_capacity' };
}

export type LookupBookingResult =
  | { status: 'found'; booking: BookingRecord }
  | { status: 'not_found' }
  | { status: 'rate_limited'; retryAfterSec: number }
  | { status: 'invalid_input' };

export async function lookupCustomerBooking(
  customerName: string,
  phone: string
): Promise<LookupBookingResult> {
  const check = validateBookingInputs(customerName, phone);
  if (!check.valid) {
    return { status: 'invalid_input' };
  }

  // Enforce server-side rate limiting before querying Firestore
  const guardRes = await fetch('/api/lookup-guard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (guardRes.status === 429) {
    const body = (await guardRes.json().catch(() => ({}))) as { retryAfterSec?: number };
    return { status: 'rate_limited', retryAfterSec: body.retryAfterSec ?? 120 };
  }

  const bookingId = await sha256Hex(`${check.normalizedName}|${check.normalizedPhone}`);
  try {
    const snap = await getDocFromServer(doc(db, 'bookings', bookingId));
    if (!snap.exists()) {
      return { status: 'not_found' };
    }
    return {
      status: 'found',
      booking: mapBooking(snap.id, snap.data() as Record<string, unknown>),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `bookings/${bookingId}`);
  }
}

// -----------------------------------------------------------------------------
// Admin-only Firestore operations (protected by firestore.rules isAdmin())
// -----------------------------------------------------------------------------

export async function ensureBookingCounterInitialized(): Promise<void> {
  const counterRef = doc(db, 'counters', 'booking');
  try {
    const snap = await getDoc(counterRef);
    if (!snap.exists()) {
      await setDoc(counterRef, {
        lastNumber: 0,
        lastBookingId: 'INIT',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'counters/booking');
  }
}

export async function adminFetchAllBookings(): Promise<BookingRecord[]> {
  try {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapBooking(d.id, d.data() as Record<string, unknown>));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'bookings');
  }
}

export async function adminCreateTravelDate(
  isoDate: string,
  capacity: number,
  isOpen = true
): Promise<TravelDateRecord> {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(isoDate)) {
    throw new Error('Invalid date format. Use YYYY-MM-DD.');
  }
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000) {
    throw new Error('Capacity must be a whole number between 1 and 10,000.');
  }

  await ensureBookingCounterInitialized();

  const id = `td_${isoDate.replace(/-/g, '')}_${Math.random().toString(36).slice(2, 7)}`;
  const label = formatTravelDateLabel(isoDate);
  const dateRef = doc(db, 'travelDates', id);

  try {
    await setDoc(dateRef, {
      date: isoDate,
      label,
      capacity,
      bookedCount: 0,
      isOpen,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const snap = await getDocFromServer(dateRef);
    return mapTravelDate(snap.id, snap.data() as Record<string, unknown>);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `travelDates/${id}`);
  }
}

export async function adminUpdateTravelDate(
  dateId: string,
  updates: { date: string; capacity: number; isOpen: boolean },
  currentBookedCount: number
): Promise<void> {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(updates.date)) {
    throw new Error('Invalid date format.');
  }
  if (!Number.isInteger(updates.capacity) || updates.capacity < currentBookedCount) {
    throw new Error(
      `Capacity cannot be reduced below existing confirmed bookings (${currentBookedCount}).`
    );
  }
  if (updates.capacity < 1 || updates.capacity > 10000) {
    throw new Error('Capacity must be between 1 and 10,000.');
  }

  const label = formatTravelDateLabel(updates.date);
  const dateRef = doc(db, 'travelDates', dateId);

  try {
    await updateDoc(dateRef, {
      date: updates.date,
      label,
      capacity: updates.capacity,
      isOpen: updates.isOpen,
      updatedAt: serverTimestamp(),
    });

    // Keep travelDateLabel synchronized on existing bookings for this travelDateId
    const affectedSnap = await getDocs(
      query(collection(db, 'bookings'), where('travelDateId', '==', dateId))
    );
    if (!affectedSnap.empty) {
      const batch = writeBatch(db);
      affectedSnap.docs.forEach((bDoc) => {
        batch.update(bDoc.ref, { travelDateLabel: label });
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `travelDates/${dateId}`);
  }
}
