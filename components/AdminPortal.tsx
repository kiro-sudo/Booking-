'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Ban,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  Eye,
  Layers,
  List,
  Lock,
  LogOut,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Ship,
  Users,
  X,
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '@/lib/firebase';
import {
  adminCancelBooking,
  adminCreateTravelDate,
  adminFetchBookingsByTravelDate,
  adminSaveContactSettings,
  adminUpdateTravelDate,
  BookingRecord,
  ContactSettingsRecord,
  normalizeTelegramLink,
  normalizeTelHref,
  parseBookingSequence,
  TravelDateRecord,
} from '@/lib/booking-helpers';
import {
  formatBookingDateOnly,
  formatBookingTimeOnly,
  formatServerTimestamp,
  getTripCapacityState,
  Locale,
  TRIP_INFO,
} from '@/lib/i18n';
import { BookingReceiptCard } from './BookingReceiptCard';

const ADMIN_ALLOWLIST_EMAIL = 'zwalpyaes@gmail.com';

export function AdminPortal() {
  const [locale, setLocale] = useState<Locale>('en');

  // Server session state
  const [sessionLoading, setSessionLoading] = useState(true);
  const [serverAuthenticated, setServerAuthenticated] = useState(false);
  const [serverUsername, setServerUsername] = useState<string | null>(null);
  const [bearerToken, setBearerToken] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  // Login / setup form state
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Firebase Auth state (needed for firestore.rules isAdmin() enforcement)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseAuthReady, setFirebaseAuthReady] = useState(false);
  const [firebaseAuthError, setFirebaseAuthError] = useState<string | null>(null);

  // Dashboard data state
  const [travelDates, setTravelDates] = useState<TravelDateRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [bookingsLoadedForUid, setBookingsLoadedForUid] = useState<string | null>(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterId, setDateFilterId] = useState<string>('all');
  const [summaryDateFilterId, setSummaryDateFilterId] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<BookingRecord | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Add travel date form state
  const [newDate, setNewDate] = useState('');
  const [newCapacity, setNewCapacity] = useState('100');
  const [newIsOpen, setNewIsOpen] = useState(true);
  const [creatingDate, setCreatingDate] = useState(false);
  const [dateActionError, setDateActionError] = useState<string | null>(null);
  const [dateActionSuccess, setDateActionSuccess] = useState<string | null>(null);

  // Edit travel date modal state
  const [editingDate, setEditingDate] = useState<TravelDateRecord | null>(null);
  const [editDateValue, setEditDateValue] = useState('');
  const [editCapacityValue, setEditCapacityValue] = useState('');
  const [editIsOpenValue, setEditIsOpenValue] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Customer support contact settings state
  const [contactSettings, setContactSettings] = useState<ContactSettingsRecord>({
    adminPhone: '',
    telegramInput: '',
    updatedAtMs: 0,
  });
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);
  const [telegramDraft, setTelegramDraft] = useState<string | null>(null);
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);

  // Active dashboard tab, booking grouping view mode & date-based CSV export state
  const [activeTab, setActiveTab] = useState<'bookings' | 'capacity' | 'support'>('bookings');
  const [bookingViewMode, setBookingViewMode] = useState<'grouped' | 'table'>('grouped');
  const [exportDateId, setExportDateId] = useState<string>('');
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Check server-side admin session
  useEffect(() => {
    let active = true;
    async function checkSession() {
      try {
        const res = await fetch('/api/admin/session', { cache: 'no-store' });
        const data = (await res.json()) as {
          authenticated: boolean;
          username: string | null;
          setupRequired: boolean;
        };
        if (!active) return;
        setServerAuthenticated(Boolean(data.authenticated));
        setServerUsername(data.username ?? null);
        setSetupRequired(Boolean(data.setupRequired));
      } catch {
        if (active) setAuthError('Unable to reach server authentication service.');
      } finally {
        if (active) setSessionLoading(false);
      }
    }
    void checkSession();
    return () => {
      active = false;
    };
  }, []);

  // Track Firebase Auth user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setFirebaseAuthReady(true);
    });
    return () => unsub();
  }, []);

  const isFirebaseAuthorizedAdmin = Boolean(
    firebaseUser &&
      firebaseUser.emailVerified &&
      firebaseUser.email?.toLowerCase() === ADMIN_ALLOWLIST_EMAIL
  );

  const isFullyAuthorized = serverAuthenticated && firebaseAuthReady && isFirebaseAuthorizedAdmin;
  const dataLoading = isFullyAuthorized && bookingsLoadedForUid !== firebaseUser?.uid;

  // Subscribe to Firestore travelDates & bookings once fully authorized
  useEffect(() => {
    if (!isFullyAuthorized || !firebaseUser) {
      return;
    }

    const activeUid = firebaseUser.uid;
    const unsubDates = onSnapshot(
      query(collection(db, 'travelDates'), orderBy('date', 'asc')),
      (snap) => {
        const list: TravelDateRecord[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            date: String(data.date ?? ''),
            label: String(data.label ?? ''),
            capacity: Number(data.capacity ?? 0),
            bookedCount: Number(data.bookedCount ?? 0),
            isOpen: Boolean(data.isOpen),
            createdAtMs: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : 0,
            updatedAtMs: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : 0,
          };
        });
        setTravelDates(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'travelDates')
    );

    const unsubBookings = onSnapshot(
      query(collection(db, 'bookings'), orderBy('createdAt', 'desc')),
      (snap) => {
        const list: BookingRecord[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
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
            createdAtMs: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : 0,
            cancelledAtMs:
              data.cancelledAt instanceof Timestamp ? data.cancelledAt.toMillis() : undefined,
          };
        });
        setBookings(list);
        setBookingsLoadedForUid(activeUid);
      },
      (error) => {
        setBookingsLoadedForUid(activeUid);
        handleFirestoreError(error, OperationType.LIST, 'bookings');
      }
    );

    const unsubContact = onSnapshot(
      doc(db, 'settings', 'contact'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Record<string, unknown>;
          setContactSettings({
            adminPhone: String(data.adminPhone ?? ''),
            telegramInput: String(data.telegramInput ?? ''),
            updatedAtMs: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : 0,
          });
        } else {
          setContactSettings({ adminPhone: '', telegramInput: '', updatedAtMs: 0 });
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'settings/contact')
    );

    return () => {
      unsubDates();
      unsubBookings();
      unsubContact();
    };
  }, [isFullyAuthorized, firebaseUser]);

  const handleServerSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authSubmitting) return;
    setAuthError(null);

    if (passwordInput !== confirmPasswordInput) {
      setAuthError('Passwords do not match.');
      return;
    }

    setAuthSubmitting(true);
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });
      const data = (await res.json()) as {
        authenticated?: boolean;
        username?: string;
        token?: string;
        error?: string;
      };
      if (!res.ok || !data.authenticated) {
        setAuthError(data.error || 'Could not configure admin credentials.');
        return;
      }
      setServerAuthenticated(true);
      setServerUsername(data.username ?? usernameInput);
      setBearerToken(data.token ?? null);
      setSetupRequired(false);
      setPasswordInput('');
      setConfirmPasswordInput('');
    } catch {
      setAuthError('Failed to connect to authentication server.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleServerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authSubmitting) return;
    setAuthError(null);
    setAuthSubmitting(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });
      const data = (await res.json()) as {
        authenticated?: boolean;
        username?: string;
        token?: string;
        error?: string;
        setupRequired?: boolean;
      };
      if (data.setupRequired) {
        setSetupRequired(true);
        setAuthError(null);
        return;
      }
      if (!res.ok || !data.authenticated) {
        setAuthError(data.error || 'Invalid username or password.');
        return;
      }
      setServerAuthenticated(true);
      setServerUsername(data.username ?? usernameInput);
      setBearerToken(data.token ?? null);
      setPasswordInput('');
    } catch {
      setAuthError('Failed to sign in. Please try again.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleGoogleAdminSignIn = async () => {
    setFirebaseAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setFirebaseAuthError(
        err instanceof Error ? err.message : 'Google sign-in was cancelled or failed.'
      );
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined,
      });
    } catch {
      // Ignore network errors on logout
    }
    try {
      await signOut(auth);
    } catch {
      // Ignore
    }
    setServerAuthenticated(false);
    setServerUsername(null);
    setBearerToken(null);
    setBookings([]);
    setTravelDates([]);
  };

  const handleAddTravelDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingDate) return;
    setDateActionError(null);
    setDateActionSuccess(null);
    setCreatingDate(true);

    try {
      const capNum = Number(newCapacity);
      const created = await adminCreateTravelDate(newDate, capNum, newIsOpen);
      setDateActionSuccess(`Added travel date ${created.label} with limit ${created.capacity}.`);
      setNewDate('');
      setNewCapacity('100');
      setNewIsOpen(true);
    } catch (err) {
      setDateActionError(err instanceof Error ? err.message : 'Failed to add travel date.');
    } finally {
      setCreatingDate(false);
    }
  };

  const openEditModal = (td: TravelDateRecord) => {
    setEditingDate(td);
    setEditDateValue(td.date);
    setEditCapacityValue(String(td.capacity));
    setEditIsOpenValue(td.isOpen);
    setEditError(null);
  };

  const handleSaveEditDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDate || savingEdit) return;
    setEditError(null);
    setSavingEdit(true);

    try {
      const capNum = Number(editCapacityValue);
      await adminUpdateTravelDate(
        editingDate.id,
        {
          date: editDateValue,
          capacity: capNum,
          isOpen: editIsOpenValue,
        },
        editingDate.bookedCount
      );
      setEditingDate(null);
      setDateActionSuccess('Travel date and capacity updated.');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update travel date.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmCancelBooking = async () => {
    if (!bookingToCancel || cancellingBooking) return;
    if (bookingToCancel.status === 'Cancelled') {
      setCancelError('This booking has already been cancelled.');
      return;
    }
    setCancelError(null);
    setCancellingBooking(true);

    try {
      const result = await adminCancelBooking(bookingToCancel);
      if (result.status === 'already_cancelled') {
        setCancelError('This booking was already cancelled.');
        return;
      }
      if (result.status === 'not_found') {
        setCancelError('Booking record could not be found.');
        return;
      }
      setBookingToCancel(null);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel booking.');
    } finally {
      setCancellingBooking(false);
    }
  };

  const adminPhoneValue = phoneDraft ?? contactSettings.adminPhone;
  const telegramInputValue = telegramDraft ?? contactSettings.telegramInput;

  const handleSaveContactSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingContact) return;
    setContactError(null);
    setContactSuccess(null);
    setSavingContact(true);

    try {
      const saved = await adminSaveContactSettings(adminPhoneValue, telegramInputValue);
      setContactSettings(saved);
      setPhoneDraft(null);
      setTelegramDraft(null);
      setContactSuccess('Customer support contact settings saved and published.');
    } catch (err) {
      setContactError(
        err instanceof Error ? err.message : 'Failed to save customer support contact settings.'
      );
    } finally {
      setSavingContact(false);
    }
  };

  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bookings.filter((b) => {
      if (dateFilterId !== 'all' && b.travelDateId !== dateFilterId) return false;
      if (!q) return true;
      return (
        b.bookingNumber.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        b.normalizedPhone.toLowerCase().includes(q)
      );
    });
  }, [bookings, searchQuery, dateFilterId]);

  const groupedBookings = useMemo(() => {
    const byDateId = new Map<string, BookingRecord[]>();
    filteredBookings.forEach((b) => {
      const list = byDateId.get(b.travelDateId) ?? [];
      list.push(b);
      byDateId.set(b.travelDateId, list);
    });

    const hasSearch = searchQuery.trim().length > 0;
    const groups: Array<{
      id: string;
      label: string;
      isoDate: string;
      capacity: number | null;
      bookedCount: number;
      isOpen: boolean;
      bookings: BookingRecord[];
    }> = [];

    const seenDateIds = new Set<string>();
    travelDates.forEach((td) => {
      if (dateFilterId !== 'all' && td.id !== dateFilterId) return;
      seenDateIds.add(td.id);
      const items = (byDateId.get(td.id) ?? []).slice().sort(
        (a, b) => parseBookingSequence(a.bookingNumber) - parseBookingSequence(b.bookingNumber)
      );
      if (hasSearch && items.length === 0) return;
      groups.push({
        id: td.id,
        label: td.label,
        isoDate: td.date,
        capacity: td.capacity,
        bookedCount: td.bookedCount,
        isOpen: td.isOpen,
        bookings: items,
      });
    });

    // Include any bookings referencing a date ID not in travelDates
    byDateId.forEach((items, tdId) => {
      if (seenDateIds.has(tdId)) return;
      const sorted = items
        .slice()
        .sort((a, b) => parseBookingSequence(a.bookingNumber) - parseBookingSequence(b.bookingNumber));
      groups.push({
        id: tdId,
        label: sorted[0]?.travelDateLabel ?? tdId,
        isoDate: '',
        capacity: null,
        bookedCount: sorted.length,
        isOpen: false,
        bookings: sorted,
      });
    });

    return groups;
  }, [filteredBookings, travelDates, dateFilterId, searchQuery]);

  const dailySummaryRows = useMemo(() => {
    return travelDates.map((td) => {
      const dateBookings = bookings.filter((b) => b.travelDateId === td.id);
      const confirmedBookings = dateBookings.filter((b) => b.status === 'Confirmed').length;
      const cancelledBookings = dateBookings.filter((b) => b.status === 'Cancelled').length;
      const totalConfirmedPassengers = confirmedBookings;
      const remainingSeats = Math.max(0, td.capacity - confirmedBookings);
      return {
        id: td.id,
        date: td.date,
        label: td.label,
        capacity: td.capacity,
        confirmedBookings,
        cancelledBookings,
        totalConfirmedPassengers,
        remainingSeats,
      };
    });
  }, [travelDates, bookings]);

  const visibleSummaryRows = useMemo(() => {
    if (summaryDateFilterId === 'all') return dailySummaryRows;
    return dailySummaryRows.filter((row) => row.id === summaryDateFilterId);
  }, [dailySummaryRows, summaryDateFilterId]);

  const activeSelectedBooking = useMemo(
    () =>
      selectedBooking
        ? bookings.find((b) => b.id === selectedBooking.id) ?? selectedBooking
        : null,
    [selectedBooking, bookings]
  );

  const metrics = useMemo(() => {
    const confirmedBookings = bookings.filter((b) => b.status === 'Confirmed').length;
    const cancelledBookings = bookings.filter((b) => b.status === 'Cancelled').length;
    const totalCapacity = travelDates.reduce((s, d) => s + d.capacity, 0);
    const totalBooked = travelDates.reduce((s, d) => s + d.bookedCount, 0);
    const remainingCapacity = Math.max(0, totalCapacity - totalBooked);
    const fullDates = travelDates.filter((d) => d.bookedCount >= d.capacity).length;
    return {
      confirmedBookings,
      cancelledBookings,
      totalCapacity,
      totalBooked,
      remainingCapacity,
      fullDates,
    };
  }, [bookings, travelDates]);

  const effectiveExportDateId = useMemo(() => {
    if (exportDateId && travelDates.some((d) => d.id === exportDateId)) {
      return exportDateId;
    }
    return travelDates[0]?.id ?? '';
  }, [exportDateId, travelDates]);

  const handleExportJsonBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      travelDates,
      bookings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `boat-bookings-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportDateCsv = async () => {
    if (!effectiveExportDateId || exportingCsv) return;
    const selectedDate = travelDates.find((d) => d.id === effectiveExportDateId);
    if (!selectedDate) return;

    setExportError(null);
    setExportingCsv(true);

    try {
      const dateBookings = await adminFetchBookingsByTravelDate(effectiveExportDateId);
      const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

      const headers = [
        'Booking Number',
        'Customer Name',
        'Phone Number',
        'Travel Date',
        'Booking Date',
        'Booking Time',
        'Booking Status',
      ];

      const rows = dateBookings.map((b) => [
        escapeCsv(b.bookingNumber),
        escapeCsv(b.customerName),
        escapeCsv(b.phone),
        escapeCsv(b.travelDateLabel),
        escapeCsv(formatBookingDateOnly(b.createdAtMs)),
        escapeCsv(formatBookingTimeOnly(b.createdAtMs)),
        escapeCsv(b.status),
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bookings-${selectedDate.date}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Failed to export CSV.');
    } finally {
      setExportingCsv(false);
    }
  };

  // Loading state
  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm font-medium text-slate-600">Checking admin session...</div>
      </div>
    );
  }

  // Gate 1: Server-side Admin Setup or Login
  if (!serverAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
            <Link
              href="/"
              className="font-display text-lg font-bold tracking-tight text-[#0F3D5E] whitespace-nowrap shrink-0"
            >
              Mergui Short Boat Trip
            </Link>
            <div className="flex items-center gap-4 shrink-0">
              <Link
                href="/"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
              >
                Customer Website
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#0F3D5E]/10 text-[#0F3D5E] flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                {setupRequired ? 'Set Up Admin Account' : 'Admin Login'}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                {setupRequired
                  ? 'No server admin credentials are configured yet. Create your operator username and password to secure the Admin Panel.'
                  : 'Enter your Admin username and password to access booking records and schedule capacity controls.'}
              </p>
            </div>

            {setupRequired ? (
              <form onSubmit={handleServerSetup} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="setup-user" className="block text-sm font-semibold text-slate-800">
                    Admin Username
                  </label>
                  <input
                    id="setup-user"
                    type="text"
                    required
                    minLength={3}
                    maxLength={64}
                    autoComplete="username"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Minimum 3 characters"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]/25 focus:border-[#0F3D5E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="setup-pass" className="block text-sm font-semibold text-slate-800">
                    Admin Password
                  </label>
                  <input
                    id="setup-pass"
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]/25 focus:border-[#0F3D5E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="setup-confirm"
                    className="block text-sm font-semibold text-slate-800"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="setup-confirm"
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]/25 focus:border-[#0F3D5E]"
                  />
                </div>

                {authError && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-sm text-rose-900"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full min-h-[46px] rounded-xl bg-[#0F3D5E] text-white text-sm font-semibold hover:bg-[#0c314c] transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {authSubmitting ? 'Saving Credentials...' : 'Create Admin Account'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleServerLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="login-user" className="block text-sm font-semibold text-slate-800">
                    Username
                  </label>
                  <input
                    id="login-user"
                    type="text"
                    required
                    autoComplete="username"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]/25 focus:border-[#0F3D5E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="login-pass" className="block text-sm font-semibold text-slate-800">
                    Password
                  </label>
                  <input
                    id="login-pass"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]/25 focus:border-[#0F3D5E]"
                  />
                </div>

                {authError && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-sm text-rose-900"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full min-h-[46px] rounded-xl bg-[#0F3D5E] text-white text-sm font-semibold hover:bg-[#0c314c] transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {authSubmitting ? 'Verifying...' : 'Sign In'}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Gate 2: Firebase Admin Identity Verification for Database Security Rules
  if (!isFullyAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
            <Link
              href="/"
              className="font-display text-lg font-bold tracking-tight text-[#0F3D5E] whitespace-nowrap shrink-0"
            >
              Mergui Short Boat Trip
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-xl font-bold text-slate-900">
                Verify Admin Database Access
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Signed in as <span className="font-semibold text-slate-900">{serverUsername}</span>.
                Connect your authorized Google operator account ({ADMIN_ALLOWLIST_EMAIL}) to unlock
                Firestore database reads and schedule updates.
              </p>
            </div>

            {firebaseUser && !isFirebaseAuthorizedAdmin && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900 space-y-1">
                <p className="font-semibold">Account not authorized</p>
                <p>
                  Signed in as <span className="font-mono">{firebaseUser.email}</span>. Please
                  sign in with <span className="font-mono">{ADMIN_ALLOWLIST_EMAIL}</span>.
                </p>
              </div>
            )}

            {firebaseAuthError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-900">
                {firebaseAuthError}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleGoogleAdminSignIn}
                className="w-full min-h-[46px] rounded-xl bg-[#0F3D5E] text-white text-sm font-semibold hover:bg-[#0c314c] transition-colors cursor-pointer"
              >
                {firebaseUser ? 'Switch Google Admin Account' : 'Sign in with Google Admin Account'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Fully Authenticated Admin Dashboard
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <Ship className="w-5 h-5 text-[#0F3D5E] shrink-0" />
            <span className="font-display text-lg font-bold text-slate-900 truncate">
              Admin Dashboard
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div
              role="group"
              aria-label="Receipt preview language"
              className="hidden sm:inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200"
            >
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                  locale === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocale('my')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                  locale === 'my' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                မြန်မာ
              </button>
            </div>

            <Link
              href="/"
              className="px-3 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
            >
              Public Site
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* KPI Overview & Backup Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="text-sm text-slate-600">
            Operator: <span className="font-semibold text-slate-900">{serverUsername}</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span className="font-mono text-xs">{firebaseUser?.email}</span>
          </div>
          <div className="flex flex-col items-start lg:items-end gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={effectiveExportDateId}
                onChange={(e) => setExportDateId(e.target.value)}
                disabled={travelDates.length === 0 || exportingCsv}
                aria-label="Select travel date for CSV export"
                className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]/25 focus:border-[#0F3D5E] disabled:opacity-60"
              >
                {travelDates.length === 0 ? (
                  <option value="">No travel dates</option>
                ) : (
                  travelDates.map((td) => (
                    <option key={td.id} value={td.id}>
                      {td.label} ({td.date})
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                onClick={handleExportDateCsv}
                disabled={!effectiveExportDateId || exportingCsv}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exportingCsv ? 'Exporting...' : 'Export CSV'}</span>
              </button>
              <button
                type="button"
                onClick={handleExportJsonBackup}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F3D5E] text-white text-xs font-semibold hover:bg-[#0c314c] cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Backup JSON</span>
              </button>
            </div>
            {exportError && (
              <p role="alert" className="text-xs text-rose-700 font-medium">
                {exportError}
              </p>
            )}
          </div>
        </div>

        {/* 4-Column Metric Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-500">Confirmed Bookings</p>
            <p className="mt-1.5 font-mono tabular-nums text-2xl font-bold text-teal-700">
              {metrics.confirmedBookings}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-500">Cancelled Bookings</p>
            <p className="mt-1.5 font-mono tabular-nums text-2xl font-bold text-rose-700">
              {metrics.cancelledBookings}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-500">Total Capacity</p>
            <p className="mt-1.5 font-mono tabular-nums text-2xl font-bold text-slate-900">
              {metrics.totalCapacity}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-500">Remaining Seats</p>
            <p className="mt-1.5 font-mono tabular-nums text-2xl font-bold text-[#0F3D5E]">
              {metrics.remainingCapacity}
            </p>
          </div>
        </div>

        {/* Daily Passenger Summary */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-[#0F3D5E] shrink-0" />
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Daily Passenger Summary
                </h2>
                <p className="text-xs text-slate-500">
                  Live totals per travel date (only Confirmed bookings count toward passengers and
                  seats used).
                </p>
              </div>
            </div>

            <select
              value={summaryDateFilterId}
              onChange={(e) => setSummaryDateFilterId(e.target.value)}
              aria-label="Filter daily passenger summary by travel date"
              className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]/25 focus:border-[#0F3D5E]"
            >
              <option value="all">All Travel Dates ({dailySummaryRows.length})</option>
              {dailySummaryRows.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label} ({row.date})
                </option>
              ))}
            </select>
          </div>

          {dataLoading ? (
            <div className="p-5 space-y-2.5">
              <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : visibleSummaryRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No travel dates configured yet.
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-5">Travel Date</th>
                      <th className="py-3 px-4 text-right">Total Capacity</th>
                      <th className="py-3 px-4 text-right">Confirmed Bookings</th>
                      <th className="py-3 px-4 text-right">Cancelled Bookings</th>
                      <th className="py-3 px-4 text-right">Total Confirmed Passengers</th>
                      <th className="py-3 px-5 text-right">Remaining Seats</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {visibleSummaryRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5">
                          <p className="font-semibold text-slate-900 whitespace-nowrap">
                            {row.label}
                          </p>
                          <p className="font-mono text-xs text-slate-500">{row.date}</p>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800">
                          {row.capacity}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-teal-700">
                          {row.confirmedBookings}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-rose-700">
                          {row.cancelledBookings}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                          {row.totalConfirmedPassengers}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono tabular-nums font-bold text-[#0F3D5E]">
                          {row.remainingSeats}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-slate-200">
                {visibleSummaryRows.map((row) => (
                  <div key={row.id} className="p-4 space-y-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-semibold text-slate-900">{row.label}</p>
                      <span className="font-mono text-xs text-slate-500">{row.date}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-slate-50">
                        <span className="text-slate-500 block">Total Capacity</span>
                        <span className="font-mono tabular-nums font-bold text-slate-900">
                          {row.capacity}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50">
                        <span className="text-slate-500 block">Remaining Seats</span>
                        <span className="font-mono tabular-nums font-bold text-[#0F3D5E]">
                          {row.remainingSeats}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-teal-50/70">
                        <span className="text-teal-800 block">Confirmed Bookings</span>
                        <span className="font-mono tabular-nums font-bold text-teal-800">
                          {row.confirmedBookings}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-rose-50/70">
                        <span className="text-rose-800 block">Cancelled Bookings</span>
                        <span className="font-mono tabular-nums font-bold text-rose-800">
                          {row.cancelledBookings}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Total Confirmed Passengers:{' '}
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {row.totalConfirmedPassengers}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Segmented Tab Controls */}
        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`min-h-[40px] px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'bookings'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Booking List &amp; Search ({bookings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('capacity')}
            className={`min-h-[40px] px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'capacity'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Trip Capacity Management ({travelDates.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('support')}
            className={`min-h-[40px] px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'support'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Customer Support Contact
          </button>
        </div>

        {/* TAB 1: Booking List & Search */}
        {activeTab === 'bookings' && (
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search BT-1, Customer Name, or Phone..."
                  aria-label="Search bookings"
                  className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]/25 focus:border-[#0F3D5E]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={dateFilterId}
                  onChange={(e) => setDateFilterId(e.target.value)}
                  aria-label="Filter by travel date"
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]/25 focus:border-[#0F3D5E]"
                >
                  <option value="all">All Travel Dates</option>
                  {travelDates.map((td) => (
                    <option key={td.id} value={td.id}>
                      {td.label} ({td.bookedCount}/{td.capacity})
                    </option>
                  ))}
                </select>

                <div
                  role="group"
                  aria-label="Booking list view mode"
                  className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200"
                >
                  <button
                    type="button"
                    onClick={() => setBookingViewMode('grouped')}
                    className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      bookingViewMode === 'grouped'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span>Grouped by Date</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingViewMode('table')}
                    className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      bookingViewMode === 'table'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <List className="w-3.5 h-3.5 shrink-0" />
                    <span>All Bookings</span>
                  </button>
                </div>
              </div>
            </div>

            {dataLoading ? (
              <div className="p-6 space-y-3">
                <div className="h-11 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-11 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-11 bg-slate-100 rounded-lg animate-pulse" />
              </div>
            ) : bookingViewMode === 'grouped' ? (
              groupedBookings.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  {travelDates.length === 0 && bookings.length === 0
                    ? 'No travel dates or bookings have been created yet.'
                    : 'No travel dates or bookings match your search filter.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {groupedBookings.map((group) => {
                    const remaining =
                      group.capacity !== null ? Math.max(0, group.capacity - group.bookedCount) : null;
                    const state =
                      group.capacity !== null
                        ? getTripCapacityState(group.capacity, group.bookedCount, group.isOpen)
                        : null;
                    return (
                      <div key={group.id} className="bg-white">
                        {/* Group Header */}
                        <div className="px-4 sm:px-6 py-4 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Calendar className="w-4 h-4 text-[#0F3D5E] shrink-0" />
                            <div>
                              <h3 className="font-display text-base font-bold text-slate-900">
                                {group.label}
                              </h3>
                              {group.isoDate && (
                                <p className="font-mono text-xs text-slate-500">{group.isoDate}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            {group.capacity !== null && (
                              <span className="font-mono tabular-nums font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                                {group.bookedCount} / {group.capacity} booked · {remaining} remaining
                              </span>
                            )}
                            {state && (
                              <span
                                className={`inline-flex items-center gap-1 font-semibold ${
                                  state === 'closed'
                                    ? 'text-slate-600'
                                    : state === 'sold_out'
                                    ? 'text-rose-700'
                                    : state === 'filling_up'
                                    ? 'text-amber-700'
                                    : 'text-teal-700'
                                }`}
                              >
                                {state === 'closed' || state === 'sold_out' ? (
                                  <Lock className="w-3.5 h-3.5" />
                                ) : state === 'filling_up' ? (
                                  <Clock className="w-3.5 h-3.5" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {state === 'closed'
                                    ? 'Closed'
                                    : state === 'sold_out'
                                    ? 'Sold Out'
                                    : state === 'filling_up'
                                    ? 'Filling Up'
                                    : 'Available'}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>

                        {group.bookings.length === 0 ? (
                          <div className="px-6 py-5 text-xs sm:text-sm text-slate-500">
                            No bookings for this travel date yet.
                          </div>
                        ) : (
                          <>
                            {/* Desktop Grouped Table */}
                            <div className="hidden md:block overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-white">
                                    <th className="py-2.5 px-5">Booking No.</th>
                                    <th className="py-2.5 px-4">Customer Name</th>
                                    <th className="py-2.5 px-4">Phone Number</th>
                                    <th className="py-2.5 px-4">Status</th>
                                    <th className="py-2.5 px-4">Booking Date &amp; Time</th>
                                    <th className="py-2.5 px-5 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                  {group.bookings.map((b) => (
                                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                                      <td className="py-3 px-5 font-mono tabular-nums font-bold text-[#0F3D5E] whitespace-nowrap">
                                        {b.bookingNumber}
                                      </td>
                                      <td className="py-3 px-4 font-medium text-slate-900">
                                        {b.customerName}
                                      </td>
                                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                                        {b.phone}
                                      </td>
                                      <td className="py-3 px-4 whitespace-nowrap">
                                        <span
                                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs font-semibold ${
                                            b.status === 'Cancelled'
                                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                                              : 'bg-teal-50 text-teal-800 border-teal-200'
                                          }`}
                                        >
                                          {b.status}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                                        {formatServerTimestamp(b.createdAtMs, 'en')}
                                      </td>
                                      <td className="py-3 px-5 text-right whitespace-nowrap">
                                        <div className="inline-flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setSelectedBooking(b)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                            <span>View</span>
                                          </button>
                                          {b.status === 'Confirmed' && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setCancelError(null);
                                                setBookingToCancel(b);
                                              }}
                                              aria-label={`Cancel booking ${b.bookingNumber} on ${b.travelDateLabel}`}
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50/60 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                                            >
                                              <Ban className="w-3.5 h-3.5" />
                                              <span>Cancel</span>
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile Grouped Cards */}
                            <div className="md:hidden divide-y divide-slate-100">
                              {group.bookings.map((b) => (
                                <div key={b.id} className="p-4 space-y-2">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono tabular-nums text-base font-bold text-[#0F3D5E]">
                                        {b.bookingNumber}
                                      </span>
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${
                                          b.status === 'Cancelled'
                                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                                            : 'bg-teal-50 text-teal-800 border-teal-200'
                                        }`}
                                      >
                                        {b.status}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedBooking(b)}
                                        className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>Details</span>
                                      </button>
                                      {b.status === 'Confirmed' && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setCancelError(null);
                                            setBookingToCancel(b);
                                          }}
                                          aria-label={`Cancel booking ${b.bookingNumber} on ${b.travelDateLabel}`}
                                          className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50/60 text-xs font-semibold text-rose-700"
                                        >
                                          <Ban className="w-3.5 h-3.5" />
                                          <span>Cancel</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="font-semibold text-slate-900">{b.customerName}</p>
                                  <div className="text-xs text-slate-600 space-y-0.5">
                                    <p className="font-mono tabular-nums">Phone: {b.phone}</p>
                                    <p className="font-mono tabular-nums">
                                      Booked: {formatServerTimestamp(b.createdAtMs, 'en')}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : filteredBookings.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                {bookings.length === 0
                  ? 'No bookings have been submitted yet.'
                  : 'No bookings match your search filter.'}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-5">Booking No.</th>
                        <th className="py-3 px-4">Customer Name</th>
                        <th className="py-3 px-4">Phone Number</th>
                        <th className="py-3 px-4">Travel Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Booking Date &amp; Time</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-5 font-mono tabular-nums font-bold text-[#0F3D5E] whitespace-nowrap">
                            {b.bookingNumber}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-900">
                            {b.customerName}
                          </td>
                          <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                            {b.phone}
                          </td>
                          <td className="py-3.5 px-4 text-slate-800 whitespace-nowrap">
                            {b.travelDateLabel}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs font-semibold ${
                                b.status === 'Cancelled'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-teal-50 text-teal-800 border-teal-200'
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                            {formatServerTimestamp(b.createdAtMs, 'en')}
                          </td>
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedBooking(b)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                              {b.status === 'Confirmed' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelError(null);
                                    setBookingToCancel(b);
                                  }}
                                  aria-label={`Cancel booking ${b.bookingNumber}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50/60 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Cancel</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-200">
                  {filteredBookings.map((b) => (
                    <div key={b.id} className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums text-base font-bold text-[#0F3D5E]">
                            {b.bookingNumber}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${
                              b.status === 'Cancelled'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-teal-50 text-teal-800 border-teal-200'
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedBooking(b)}
                            className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                          {b.status === 'Confirmed' && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelError(null);
                                setBookingToCancel(b);
                              }}
                              aria-label={`Cancel booking ${b.bookingNumber}`}
                              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50/60 text-xs font-semibold text-rose-700"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="font-semibold text-slate-900">{b.customerName}</p>
                      <div className="text-xs text-slate-600 space-y-1">
                        <p className="font-mono tabular-nums">Phone: {b.phone}</p>
                        <p>Travel Date: {b.travelDateLabel}</p>
                        <p className="font-mono tabular-nums">
                          Booked: {formatServerTimestamp(b.createdAtMs, 'en')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* TAB 2: Trip Capacity Management */}
        {activeTab === 'capacity' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Add Travel Date Form */}
            <section className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 text-[#0F3D5E]">
                <CalendarPlus className="w-5 h-5 shrink-0" />
                <h2 className="font-display text-lg font-bold text-slate-900">Add Travel Date</h2>
              </div>

              <form onSubmit={handleAddTravelDate} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="add-date" className="block text-sm font-semibold text-slate-800">
                    Travel Date
                  </label>
                  <input
                    id="add-date"
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]/25 focus:border-[#0F3D5E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="add-capacity"
                    className="block text-sm font-semibold text-slate-800"
                  >
                    Booking Limit
                  </label>
                  <input
                    id="add-capacity"
                    type="number"
                    required
                    min={1}
                    max={10000}
                    step={1}
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]/25 focus:border-[#0F3D5E]"
                  />
                </div>

                <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsOpen}
                    onChange={(e) => setNewIsOpen(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#0F3D5E]"
                  />
                  <span>Open for customer booking immediately</span>
                </label>

                {dateActionError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                    {dateActionError}
                  </div>
                )}

                {dateActionSuccess && (
                  <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900">
                    {dateActionSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={creatingDate}
                  className="w-full min-h-[44px] rounded-xl bg-[#0F3D5E] text-white text-sm font-semibold hover:bg-[#0c314c] transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {creatingDate ? 'Adding...' : 'Add Travel Date'}
                </button>
              </form>
            </section>

            {/* Configured Dates Capacity Table */}
            <section className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-200">
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Configured Travel Dates &amp; Capacity
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Customers choose from open travel dates below. Each date has its own independent
                  capacity limit and per-date booking sequence starting at BT-1.
                </p>
              </div>

              {travelDates.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  No travel dates configured yet. Add your first travel date on the left.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-5">Travel Date</th>
                        <th className="py-3 px-4 text-right">Limit</th>
                        <th className="py-3 px-4 text-right">Confirmed</th>
                        <th className="py-3 px-4 text-right">Remaining</th>
                        <th className="py-3 px-4 text-right">Status</th>
                        <th className="py-3 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {travelDates.map((td) => {
                        const remaining = Math.max(0, td.capacity - td.bookedCount);
                        const state = getTripCapacityState(td.capacity, td.bookedCount, td.isOpen);
                        return (
                          <tr key={td.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-5">
                              <p className="font-semibold text-slate-900 whitespace-nowrap">
                                {td.label}
                              </p>
                              <p className="font-mono text-xs text-slate-500">{td.date}</p>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800">
                              {td.capacity}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800">
                              {td.bookedCount}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-[#0F3D5E]">
                              {remaining}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                  state === 'closed'
                                    ? 'text-slate-600'
                                    : state === 'sold_out'
                                    ? 'text-rose-700'
                                    : state === 'filling_up'
                                    ? 'text-amber-700'
                                    : 'text-teal-700'
                                }`}
                              >
                                {state === 'closed' || state === 'sold_out' ? (
                                  <Lock className="w-3.5 h-3.5" />
                                ) : state === 'filling_up' ? (
                                  <Clock className="w-3.5 h-3.5" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {state === 'closed'
                                    ? 'Closed'
                                    : state === 'sold_out'
                                    ? 'Sold Out'
                                    : state === 'filling_up'
                                    ? 'Filling Up'
                                    : 'Available'}
                                </span>
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openEditModal(td)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 3: Customer Support Contact Settings */}
        {activeTab === 'support' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <section className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <div className="space-y-1">
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Customer Support Contact Settings
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Configure the Admin Phone Number and Telegram account displayed in the Contact
                  Admin section on the customer website. Leave a field blank to hide that option.
                </p>
              </div>

              <form onSubmit={handleSaveContactSettings} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="support-phone" className="block text-sm font-semibold text-slate-800">
                    Admin Phone Number
                  </label>
                  <input
                    id="support-phone"
                    type="tel"
                    maxLength={32}
                    value={adminPhoneValue}
                    onChange={(e) => {
                      setPhoneDraft(e.target.value);
                      setContactError(null);
                      setContactSuccess(null);
                    }}
                    placeholder="e.g., 09 789 123 456 or +959789123456"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]/25 focus:border-[#0F3D5E]"
                  />
                  {adminPhoneValue.trim() && (
                    <p className="text-xs text-slate-500">
                      Dialer link:{' '}
                      <span className="font-mono text-slate-700">
                        {normalizeTelHref(adminPhoneValue) ?? 'Invalid phone format'}
                      </span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="support-telegram"
                    className="block text-sm font-semibold text-slate-800"
                  >
                    Telegram Username or Link
                  </label>
                  <input
                    id="support-telegram"
                    type="text"
                    maxLength={160}
                    value={telegramInputValue}
                    onChange={(e) => {
                      setTelegramDraft(e.target.value);
                      setContactError(null);
                      setContactSuccess(null);
                    }}
                    placeholder="e.g., @merguihorizon or https://t.me/merguihorizon"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]/25 focus:border-[#0F3D5E]"
                  />
                  {telegramInputValue.trim() && (
                    <p className="text-xs text-slate-500">
                      Telegram URL:{' '}
                      <span className="font-mono text-slate-700">
                        {normalizeTelegramLink(telegramInputValue)?.href ??
                          'Invalid Telegram username or t.me link'}
                      </span>
                    </p>
                  )}
                </div>

                {contactError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900"
                  >
                    {contactError}
                  </div>
                )}

                {contactSuccess && (
                  <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900">
                    {contactSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingContact}
                  className="w-full min-h-[44px] rounded-xl bg-[#0F3D5E] text-white text-sm font-semibold hover:bg-[#0c314c] transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {savingContact ? 'Saving...' : 'Save Contact Details'}
                </button>
              </form>
            </section>

            <section className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="space-y-1">
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Live Customer View Preview
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  Currently published contact links shown to customers:
                </p>
              </div>

              {!normalizeTelHref(contactSettings.adminPhone) &&
              !normalizeTelegramLink(contactSettings.telegramInput) ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-500">
                  No customer support contact details are published yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {normalizeTelHref(contactSettings.adminPhone) && (
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#0F3D5E]/10 text-[#0F3D5E] flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-500">Call Admin</p>
                          <p className="font-mono tabular-nums text-sm font-bold text-slate-900 truncate">
                            {contactSettings.adminPhone}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-slate-500 shrink-0">
                        {normalizeTelHref(contactSettings.adminPhone)}
                      </span>
                    </div>
                  )}

                  {normalizeTelegramLink(contactSettings.telegramInput) && (
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                          <Send className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-500">Telegram</p>
                          <p className="font-mono text-sm font-bold text-slate-900 truncate">
                            {normalizeTelegramLink(contactSettings.telegramInput)?.display}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-slate-500 truncate max-w-[180px]">
                        {normalizeTelegramLink(contactSettings.telegramInput)?.href}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Booking Details / Receipt Modal */}
      {activeSelectedBooking && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="max-w-lg w-full space-y-3 my-auto">
            <div className="flex items-center justify-between gap-3">
              {activeSelectedBooking.status === 'Confirmed' ? (
                <button
                  type="button"
                  onClick={() => {
                    setCancelError(null);
                    setBookingToCancel(activeSelectedBooking);
                  }}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 shadow cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel Booking</span>
                </button>
              ) : (
                <span className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-100 text-rose-800 text-xs font-semibold border border-rose-200">
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancelled</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                aria-label="Close details"
                className="w-10 h-10 rounded-full bg-white text-slate-700 flex items-center justify-center shadow hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <BookingReceiptCard booking={activeSelectedBooking} locale={locale} />
          </div>
        </div>
      )}

      {/* Cancel Booking Confirmation Modal */}
      {bookingToCancel && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Cancel Booking {bookingToCancel.bookingNumber}?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  This will update the booking status for{' '}
                  <span className="font-semibold text-slate-900">
                    {bookingToCancel.customerName}
                  </span>{' '}
                  (<span className="font-mono">{bookingToCancel.phone}</span>) to{' '}
                  <span className="font-semibold text-rose-700">Cancelled</span> and restore 1
                  available seat on{' '}
                  <span className="font-semibold text-slate-900">
                    {bookingToCancel.travelDateLabel}
                  </span>
                  . The booking record and number ({bookingToCancel.bookingNumber}) will be preserved
                  as history.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingToCancel(null)}
                aria-label="Close cancellation dialog"
                className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cancelError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                {cancelError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setBookingToCancel(null)}
                disabled={cancellingBooking}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelBooking}
                disabled={cancellingBooking}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60 cursor-pointer"
              >
                {cancellingBooking ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Travel Date & Capacity Modal */}
      {editingDate && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Edit Travel Date
              </h3>
              <button
                type="button"
                onClick={() => setEditingDate(null)}
                aria-label="Close modal"
                className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDate} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="edit-date" className="block text-sm font-semibold text-slate-800">
                  Travel Date
                </label>
                <input
                  id="edit-date"
                  type="date"
                  required
                  value={editDateValue}
                  onChange={(e) => setEditDateValue(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-capacity"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Booking Limit (Minimum {editingDate.bookedCount})
                </label>
                <input
                  id="edit-capacity"
                  type="number"
                  required
                  min={Math.max(1, editingDate.bookedCount)}
                  max={10000}
                  step={1}
                  value={editCapacityValue}
                  onChange={(e) => setEditCapacityValue(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm text-slate-900"
                />
                <p className="text-xs text-slate-500 font-mono tabular-nums">
                  Existing confirmed bookings: {editingDate.bookedCount}
                </p>
              </div>

              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsOpenValue}
                  onChange={(e) => setEditIsOpenValue(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#0F3D5E]"
                />
                <span>Open for customer booking</span>
              </label>

              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                  {editError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDate(null)}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="min-h-[42px] px-5 py-2 rounded-xl bg-[#0F3D5E] text-white text-sm font-semibold hover:bg-[#0c314c] disabled:opacity-60 cursor-pointer"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
