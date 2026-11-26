import {
  collection,
  doc,
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

export type BookingStatus = 'Confirmed' | 'Cancelled';

export interface BookingRecord {
  id: string;
  bookingNumber: string;
  customerName: string;
  normalizedName: string;
  phone: string;
  normalizedPhone: string;
  phoneHash: string;
  datePhoneHash?: string;
  travelDateId: string;
  travelDateLabel: string;
  status: BookingStatus;
  tripName: string;
  createdAtMs: number;
  cancelledAtMs?: number;
}

export interface ContactSettingsRecord {
  adminPhone: string;
  telegramInput: string;
  updatedAtMs: number;
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
  const cancelledAtMs =
    data.cancelledAt instanceof Timestamp ? data.cancelledAt.toMillis() : undefined;
  return {
    id,
    bookingNumber: String(data.bookingNumber ?? ''),
    customerName: String(data.customerName ?? ''),
    normalizedName: String(data.normalizedName ?? ''),
    phone: String(data.phone ?? ''),
    normalizedPhone: String(data.normalizedPhone ?? ''),
    phoneHash: String(data.phoneHash ?? ''),
    datePhoneHash: typeof data.datePhoneHash === 'string' ? data.datePhoneHash : undefined,
    travelDateId: String(data.travelDateId ?? ''),
    travelDateLabel: String(data.travelDateLabel ?? ''),
    status: data.status === 'Cancelled' ? 'Cancelled' : 'Confirmed',
    tripName: String(data.tripName ?? TRIP_INFO.en.name),
    createdAtMs: createdAt,
    cancelledAtMs,
  };
}

export function normalizeTelHref(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[\s\-().]/g, '');
  if (!/^[+]?[0-9]{6,24}$/.test(cleaned)) return null;
  return `tel:${cleaned}`;
}

export function normalizeTelegramLink(input: string): { href: string; display: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let path = trimmed;
  if (/^https?:\/\/(t\.me|telegram\.me)\//i.test(trimmed)) {
    path = trimmed.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '').replace(/\/+$/, '');
  } else if (/^(t\.me|telegram\.me)\//i.test(trimmed)) {
    path = trimmed.replace(/^(t\.me|telegram\.me)\//i, '').replace(/\/+$/, '');
  } else {
    if (trimmed.includes('/') || trimmed.includes(':')) return null;
    path = trimmed.replace(/^@+/, '');
  }

  if (!/^[a-zA-Z0-9_+/]{3,64}$/.test(path)) return null;
  const display = path.startsWith('+') ? 'Telegram' : `@${path.split('/')[0]}`;
  return {
    href: `https://t.me/${path}`,
    display,
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

export function parseBookingSequence(bookingNumber: string): number {
  const match = /^BT-([1-9][0-9]*)$/.exec(bookingNumber.trim());
  return match ? Number(match[1]) : 0;
}

export type CreateBookingResult =
  | { status: 'created'; booking: BookingRecord }
  | { status: 'existing'; booking: BookingRecord }
  | { status: 'phone_conflict' }
  | { status: 'date_full' }
  | { status: 'date_unavailable' }
  | { status: 'no_date_selected' }
  | { status: 'invalid_input' };

export async function createAtomicBooking(
  customerName: string,
  phone: string,
  selectedTravelDateId: string
): Promise<CreateBookingResult> {
  const cleanDateId = selectedTravelDateId.trim();
  if (!/^[a-zA-Z0-9_-]{3,64}$/.test(cleanDateId)) {
    return { status: 'no_date_selected' };
  }

  const check = validateBookingInputs(customerName, phone);
  if (!check.valid) {
    return { status: 'invalid_input' };
  }

  const { cleanName, normalizedName, cleanPhone, normalizedPhone } = check;
  const phoneHash = await sha256Hex(normalizedPhone);
  const datePhoneHash = await sha256Hex(`${normalizedPhone}|${cleanDateId}`);
  const nameHash = await sha256Hex(normalizedName);
  const bookingId = await sha256Hex(`${normalizedName}|${normalizedPhone}|${cleanDateId}`);

  const phoneLockRef = doc(db, 'phoneLocks', datePhoneHash);
  const legacyPhoneLockRef = doc(db, 'phoneLocks', phoneHash);
  const bookingRef = doc(db, 'bookings', bookingId);
  const dateRef = doc(db, 'travelDates', cleanDateId);
  const dateCounterRef = doc(db, 'dateCounters', cleanDateId);

  // Pre-check existing per-date lock (and legacy lock if on the same date)
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

    const legacyLockSnap = await getDocFromServer(legacyPhoneLockRef);
    if (legacyLockSnap.exists()) {
      const legacyLockData = legacyLockSnap.data() as { bookingId: string; nameHash: string };
      const legacyBookingRef = doc(db, 'bookings', legacyLockData.bookingId);
      const legacyBookingSnap = await getDocFromServer(legacyBookingRef);
      if (legacyBookingSnap.exists()) {
        const legacyBooking = mapBooking(
          legacyBookingSnap.id,
          legacyBookingSnap.data() as Record<string, unknown>
        );
        if (legacyBooking.travelDateId === cleanDateId) {
          if (legacyLockData.nameHash === nameHash) {
            return { status: 'existing', booking: legacyBooking };
          }
          return { status: 'phone_conflict' };
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `phoneLocks/${datePhoneHash}`);
  }

  try {
    const txOutcome = await runTransaction(db, async (tx) => {
      const lockSnap = await tx.get(phoneLockRef);
      if (lockSnap.exists()) {
        const lockData = lockSnap.data() as { nameHash: string };
        if (lockData.nameHash === nameHash) {
          const existingSnap = await tx.get(bookingRef);
          if (existingSnap.exists()) {
            return { kind: 'existing' as const, existingId: bookingId };
          }
        }
        throw new Error('__PHONE_CONFLICT__');
      }

      const legacyLockSnap = await tx.get(legacyPhoneLockRef);
      if (legacyLockSnap.exists()) {
        const legacyLockData = legacyLockSnap.data() as { bookingId: string; nameHash: string };
        const legacyBookingSnap = await tx.get(doc(db, 'bookings', legacyLockData.bookingId));
        if (legacyBookingSnap.exists()) {
          const legacyData = legacyBookingSnap.data() as { travelDateId?: string };
          if (legacyData.travelDateId === cleanDateId) {
            if (legacyLockData.nameHash === nameHash) {
              return { kind: 'existing' as const, existingId: legacyBookingSnap.id };
            }
            throw new Error('__PHONE_CONFLICT__');
          }
        }
      }

      const dateSnap = await tx.get(dateRef);
      if (!dateSnap.exists()) {
        throw new Error('__DATE_UNAVAILABLE__');
      }
      const dateData = dateSnap.data() as {
        isOpen: boolean;
        bookedCount: number;
        capacity: number;
        label: string;
      };
      if (!dateData.isOpen) {
        throw new Error('__DATE_UNAVAILABLE__');
      }
      if (dateData.bookedCount >= dateData.capacity) {
        throw new Error('__DATE_FULL__');
      }

      const dateCounterSnap = await tx.get(dateCounterRef);
      const currentNumber = dateCounterSnap.exists()
        ? Number((dateCounterSnap.data() as { lastNumber: number }).lastNumber ?? 0)
        : 0;
      const nextNumber = currentNumber + 1;
      const bookingNumber = `BT-${nextNumber}`;

      if (dateCounterSnap.exists()) {
        tx.update(dateCounterRef, {
          lastNumber: nextNumber,
          lastBookingId: bookingId,
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.set(dateCounterRef, {
          lastNumber: nextNumber,
          lastBookingId: bookingId,
          updatedAt: serverTimestamp(),
        });
      }

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
        datePhoneHash,
        travelDateId: cleanDateId,
        travelDateLabel: dateData.label,
        status: 'Confirmed',
        tripName: TRIP_INFO.en.name,
        createdAt: serverTimestamp(),
      });

      return { kind: 'created' as const, existingId: bookingId };
    });

    const targetRef = doc(db, 'bookings', txOutcome.existingId);
    const finalSnap = await getDocFromServer(targetRef);
    if (finalSnap.exists()) {
      return {
        status: txOutcome.kind,
        booking: mapBooking(finalSnap.id, finalSnap.data() as Record<string, unknown>),
      };
    }
    return { status: 'date_unavailable' };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === '__PHONE_CONFLICT__') return { status: 'phone_conflict' };
      if (error.message === '__DATE_UNAVAILABLE__') return { status: 'date_unavailable' };
      if (error.message === '__DATE_FULL__') return { status: 'date_full' };
    }
    handleFirestoreError(error, OperationType.WRITE, `bookings/${bookingId}`);
  }
}

export type LookupBookingResult =
  | { status: 'found'; bookings: BookingRecord[] }
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

  const dates = await fetchTravelDates();
  const dateOrderMap = new Map<string, string>(dates.map((d) => [d.id, d.date]));

  const candidateIds = await Promise.all([
    sha256Hex(`${check.normalizedName}|${check.normalizedPhone}`),
    ...dates.map((d) => sha256Hex(`${check.normalizedName}|${check.normalizedPhone}|${d.id}`)),
  ]);
  const uniqueIds = Array.from(new Set(candidateIds));

  try {
    const snaps = await Promise.all(
      uniqueIds.map((id) => getDocFromServer(doc(db, 'bookings', id)))
    );
    const found: BookingRecord[] = [];
    snaps.forEach((snap) => {
      if (snap.exists()) {
        found.push(mapBooking(snap.id, snap.data() as Record<string, unknown>));
      }
    });

    if (found.length === 0) {
      return { status: 'not_found' };
    }

    found.sort((a, b) => {
      const dateA = dateOrderMap.get(a.travelDateId) ?? '';
      const dateB = dateOrderMap.get(b.travelDateId) ?? '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return a.createdAtMs - b.createdAtMs;
    });

    return {
      status: 'found',
      bookings: found,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'bookings/lookup');
  }
}

// -----------------------------------------------------------------------------
// Admin-only Firestore operations (protected by firestore.rules isAdmin())
// -----------------------------------------------------------------------------

export async function adminFetchAllBookings(): Promise<BookingRecord[]> {
  try {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapBooking(d.id, d.data() as Record<string, unknown>));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'bookings');
  }
}

export async function adminFetchBookingsByTravelDate(
  travelDateId: string
): Promise<BookingRecord[]> {
  try {
    const q = query(collection(db, 'bookings'), where('travelDateId', '==', travelDateId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => mapBooking(d.id, d.data() as Record<string, unknown>));
    list.sort((a, b) => parseBookingSequence(a.bookingNumber) - parseBookingSequence(b.bookingNumber));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `bookings?travelDateId=${travelDateId}`);
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

  const id = `td_${isoDate.replace(/-/g, '')}_${Math.random().toString(36).slice(2, 7)}`;
  const label = formatTravelDateLabel(isoDate);
  const dateRef = doc(db, 'travelDates', id);
  const dateCounterRef = doc(db, 'dateCounters', id);

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
    await setDoc(dateCounterRef, {
      lastNumber: 0,
      lastBookingId: 'INIT',
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

export type CancelBookingResult =
  | { status: 'cancelled' }
  | { status: 'already_cancelled' }
  | { status: 'not_found' };

export async function adminCancelBooking(booking: BookingRecord): Promise<CancelBookingResult> {
  const bookingRef = doc(db, 'bookings', booking.id);
  const dateRef = doc(db, 'travelDates', booking.travelDateId);

  try {
    return await runTransaction(db, async (tx) => {
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists()) {
        return { status: 'not_found' as const };
      }

      const currentStatus = (bookingSnap.data() as { status?: string }).status;
      if (currentStatus === 'Cancelled') {
        return { status: 'already_cancelled' as const };
      }

      const dateSnap = await tx.get(dateRef);
      if (dateSnap.exists()) {
        const currentBooked = Number((dateSnap.data() as { bookedCount: number }).bookedCount ?? 0);
        if (currentBooked < 1) {
          throw new Error('Cannot restore capacity below zero.');
        }
        tx.update(dateRef, {
          bookedCount: currentBooked - 1,
          updatedAt: serverTimestamp(),
        });
      }

      tx.update(bookingRef, {
        status: 'Cancelled',
        cancelledAt: serverTimestamp(),
      });

      return { status: 'cancelled' as const };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${booking.id}`);
  }
}

export async function adminSaveContactSettings(
  adminPhone: string,
  telegramInput: string
): Promise<ContactSettingsRecord> {
  const cleanPhone = adminPhone.trim();
  const cleanTelegram = telegramInput.trim();

  if (cleanPhone.length > 32) {
    throw new Error('Phone number must be 32 characters or fewer.');
  }
  if (cleanPhone.length > 0) {
    if (!/^[0-9+\-\s().]{6,32}$/.test(cleanPhone) || !normalizeTelHref(cleanPhone)) {
      throw new Error('Please enter a valid phone number (6-24 digits).');
    }
  }

  if (cleanTelegram.length > 160) {
    throw new Error('Telegram username or link is too long.');
  }
  if (cleanTelegram.length > 0 && !normalizeTelegramLink(cleanTelegram)) {
    throw new Error(
      'Please enter a valid Telegram username (e.g., @username) or link (e.g., https://t.me/username).'
    );
  }

  const contactRef = doc(db, 'settings', 'contact');
  try {
    await setDoc(contactRef, {
      adminPhone: cleanPhone,
      telegramInput: cleanTelegram,
      updatedAt: serverTimestamp(),
    });
    const snap = await getDocFromServer(contactRef);
    const data = (snap.data() ?? {}) as Record<string, unknown>;
    return {
      adminPhone: String(data.adminPhone ?? cleanPhone),
      telegramInput: String(data.telegramInput ?? cleanTelegram),
      updatedAtMs: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/contact');
  }
}
