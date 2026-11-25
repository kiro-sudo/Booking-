'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Lock,
  Search,
  Ship,
  Users,
} from 'lucide-react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import {
  BookingRecord,
  createAtomicBooking,
  lookupCustomerBooking,
  TravelDateRecord,
} from '@/lib/booking-helpers';
import { COPY, Locale, TRIP_INFO } from '@/lib/i18n';
import { BookingReceiptCard } from './BookingReceiptCard';

export function CustomerBookingPortal() {
  const [locale, setLocale] = useState<Locale>('en');
  const [travelDates, setTravelDates] = useState<TravelDateRecord[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);

  // Booking form state
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<{
    booking: BookingRecord;
    notice: string;
  } | null>(null);

  // Lookup form state
  const [lookupName, setLookupName] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupSubmitting, setLookupSubmitting] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<BookingRecord | null>(null);

  // Image fallback state
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [deckImgFailed, setDeckImgFailed] = useState(false);

  const t = COPY[locale];
  const trip = TRIP_INFO[locale];

  useEffect(() => {
    const q = query(collection(db, 'travelDates'), orderBy('date', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: TravelDateRecord[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            date: String(data.date ?? ''),
            label: String(data.label ?? ''),
            capacity: Number(data.capacity ?? 0),
            bookedCount: Number(data.bookedCount ?? 0),
            isOpen: Boolean(data.isOpen),
            createdAtMs: 0,
            updatedAtMs: 0,
          };
        });
        setTravelDates(items);
        setScheduleLoading(false);
      },
      (error) => {
        setScheduleLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'travelDates');
      }
    );
    return () => unsub();
  }, []);

  const scheduleSummary = useMemo(() => {
    const openAvailable = travelDates.filter((d) => d.isOpen && d.bookedCount < d.capacity);
    const earliest = openAvailable[0] ?? null;
    const totalRemaining = openAvailable.reduce(
      (sum, d) => sum + Math.max(0, d.capacity - d.bookedCount),
      0
    );
    return {
      earliest,
      openCount: openAvailable.length,
      totalRemaining,
    };
  }, [travelDates]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingSubmitting) return;

    setBookingSubmitting(true);
    setBookingError(null);

    try {
      const res = await createAtomicBooking(customerName, phone);
      if (res.status === 'created') {
        setBookingResult({ booking: res.booking, notice: t.newBookingSuccess });
        setCustomerName('');
        setPhone('');
      } else if (res.status === 'existing') {
        setBookingResult({ booking: res.booking, notice: t.existingBookingNotice });
      } else if (res.status === 'phone_conflict') {
        setBookingResult(null);
        setBookingError(t.phoneConflictError);
      } else if (res.status === 'no_capacity') {
        setBookingResult(null);
        setBookingError(t.noCapacityError);
      } else if (res.status === 'not_initialized') {
        setBookingResult(null);
        setBookingError(t.notInitializedError);
      } else if (res.status === 'invalid_input') {
        setBookingError(t.invalidInputError);
      }
    } catch {
      setBookingError(t.genericError);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lookupSubmitting) return;

    setLookupSubmitting(true);
    setLookupError(null);

    try {
      const res = await lookupCustomerBooking(lookupName, lookupPhone);
      if (res.status === 'found') {
        setLookupResult(res.booking);
      } else if (res.status === 'not_found') {
        setLookupResult(null);
        setLookupError(t.lookupNotFound);
      } else if (res.status === 'rate_limited') {
        setLookupResult(null);
        setLookupError(`${t.lookupRateLimit} (${res.retryAfterSec}s)`);
      } else if (res.status === 'invalid_input') {
        setLookupResult(null);
        setLookupError(t.invalidInputError);
      }
    } catch {
      setLookupError(t.genericError);
    } finally {
      setLookupSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#"
            className="font-display text-lg font-bold tracking-tight text-[#0F3D5E] whitespace-nowrap shrink-0"
          >
            {trip.brand}
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#schedule"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              {t.navSchedule}
            </a>
            <a
              href="#book-trip"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              {t.navBook}
            </a>
            <a
              href="#find-booking"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              {t.navFind}
            </a>
            <Link
              href="/admin"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              {t.navAdmin}
            </Link>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#book-trip"
              className="inline-flex items-center justify-center min-h-[40px] px-4 py-2 rounded-lg bg-[#0F3D5E] text-white text-sm font-semibold hover:bg-[#0c314c] transition-colors whitespace-nowrap shrink-0"
            >
              {t.bookNow}
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Split Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8 sm:pt-10 sm:pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Hero Content */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
              <div className="space-y-5">
                {/* Language Switcher inside Hero toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-medium text-teal-800">{t.heroKicker}</span>
                  <div
                    role="group"
                    aria-label="Language switcher"
                    className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200"
                  >
                    <button
                      type="button"
                      onClick={() => setLocale('en')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        locale === 'en'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocale('my')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        locale === 'my'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      မြန်မာ
                    </button>
                  </div>
                </div>

                <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-slate-900 leading-[1.15] text-balance">
                  {trip.name}
                </h1>

                <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                  {trip.shortDesc}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <p className="text-xs sm:text-sm font-medium text-slate-700">{trip.pier}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="#book-trip"
                    className="min-h-[44px] inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#0F3D5E] text-white text-sm font-semibold hover:bg-[#0c314c] transition-colors whitespace-nowrap shrink-0"
                  >
                    {t.bookNow}
                  </a>
                  <a
                    href="#find-booking"
                    className="min-h-[44px] inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-sm font-semibold hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
                  >
                    {t.findButton}
                  </a>
                </div>
              </div>
            </div>

            {/* Hero 16:9 Media */}
            <div className="lg:col-span-6 relative min-h-[260px] sm:min-h-[340px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-200">
              {!heroImgFailed ? (
                <img
                  src="/images/hero_mergui_night.jpg"
                  alt={trip.name}
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full lg:h-full object-cover"
                />
              ) : (
                <div className="w-full h-full min-h-[260px] bg-gradient-to-br from-[#0F3D5E] via-[#155E75] to-[#0D9488] flex flex-col items-center justify-center p-8 text-white text-center gap-3">
                  <Ship className="w-12 h-12 text-teal-200" />
                  <p className="font-display text-xl font-semibold">{trip.name}</p>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/60 via-slate-950/20 to-transparent" />
            </div>
          </div>

          {/* Full-Width 4-Column Live Schedule Summary Strip */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
              <p className="text-xs font-medium text-slate-500">{t.earliestDate}</p>
              <p className="mt-1.5 text-lg font-semibold text-slate-900 tabular-nums">
                {scheduleLoading
                  ? '...'
                  : scheduleSummary.earliest
                  ? scheduleSummary.earliest.label
                  : t.noDatesAvailable}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
              <p className="text-xs font-medium text-slate-500">{t.remainingSeats}</p>
              <p className="mt-1.5 font-mono tabular-nums text-lg font-bold text-[#0F3D5E]">
                {scheduleLoading
                  ? '...'
                  : scheduleSummary.earliest
                  ? `${scheduleSummary.earliest.capacity - scheduleSummary.earliest.bookedCount} ${t.seatsUnit}`
                  : `0 ${t.seatsUnit}`}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
              <p className="text-xs font-medium text-slate-500">{t.openDates}</p>
              <p className="mt-1.5 font-mono tabular-nums text-lg font-bold text-slate-900">
                {scheduleLoading ? '...' : `${scheduleSummary.openCount}`}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
              <p className="text-xs font-medium text-slate-500">{t.paymentLabel}</p>
              <p className="mt-1.5 text-base font-semibold text-teal-800">{t.cashAtPier}</p>
            </div>
          </div>
        </section>

        {/* Booking Form + Find My Booking Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Customer Booking Form */}
            <div id="book-trip" className="lg:col-span-6 space-y-6 scroll-mt-20">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl font-bold text-slate-900">
                    {t.bookSectionTitle}
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">{t.bookSectionSub}</p>
                </div>

                <form onSubmit={handleBookingSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label
                      htmlFor="booking-name"
                      className="block text-sm font-semibold text-slate-800"
                    >
                      {t.customerNameLabel}
                    </label>
                    <input
                      id="booking-name"
                      type="text"
                      required
                      minLength={2}
                      maxLength={120}
                      autoComplete="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={t.customerNamePlaceholder}
                      className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]/25 focus:border-[#0F3D5E]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="booking-phone"
                      className="block text-sm font-semibold text-slate-800"
                    >
                      {t.phoneLabel}
                    </label>
                    <input
                      id="booking-phone"
                      type="tel"
                      required
                      minLength={6}
                      maxLength={30}
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t.phonePlaceholder}
                      className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]/25 focus:border-[#0F3D5E]"
                    />
                  </div>

                  {bookingError && (
                    <div
                      role="alert"
                      className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-sm text-rose-900"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{bookingError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0F3D5E] text-white text-base font-semibold hover:bg-[#0c314c] active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>{bookingSubmitting ? t.submittingBooking : t.confirmBooking}</span>
                  </button>

                  <p className="text-xs text-slate-500 leading-relaxed">{t.autoAssignNote}</p>
                </form>
              </div>

              {/* Automatically generated Receipt after booking */}
              {bookingResult && (
                <BookingReceiptCard
                  booking={bookingResult.booking}
                  locale={locale}
                  noticeText={bookingResult.notice}
                />
              )}
            </div>

            {/* Find My Booking Section */}
            <div id="find-booking" className="lg:col-span-6 space-y-6 scroll-mt-20">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl font-bold text-slate-900">
                    {t.findSectionTitle}
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">{t.findSectionSub}</p>
                </div>

                <form onSubmit={handleLookupSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label
                      htmlFor="lookup-name"
                      className="block text-sm font-semibold text-slate-800"
                    >
                      {t.customerNameLabel}
                    </label>
                    <input
                      id="lookup-name"
                      type="text"
                      required
                      minLength={2}
                      maxLength={120}
                      value={lookupName}
                      onChange={(e) => setLookupName(e.target.value)}
                      placeholder={t.customerNamePlaceholder}
                      className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/25 focus:border-teal-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="lookup-phone"
                      className="block text-sm font-semibold text-slate-800"
                    >
                      {t.phoneLabel}
                    </label>
                    <input
                      id="lookup-phone"
                      type="tel"
                      required
                      minLength={6}
                      maxLength={30}
                      value={lookupPhone}
                      onChange={(e) => setLookupPhone(e.target.value)}
                      placeholder={t.phonePlaceholder}
                      className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/25 focus:border-teal-700"
                    />
                  </div>

                  {lookupError && (
                    <div
                      role="alert"
                      className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-sm text-rose-900"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{lookupError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={lookupSubmitting}
                    className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-700 text-white text-base font-semibold hover:bg-teal-800 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap"
                  >
                    <Search className="w-4 h-4 shrink-0" />
                    <span>{lookupSubmitting ? t.findingButton : t.findButton}</span>
                  </button>
                </form>
              </div>

              {/* Retrieved Read-Only Original Receipt */}
              {lookupResult && <BookingReceiptCard booking={lookupResult} locale={locale} />}
            </div>
          </div>
        </section>

        {/* Departure Schedule & Boarding Info */}
        <section id="schedule" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 scroll-mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Configured Dates Table */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 text-[#0F3D5E]">
                  <Calendar className="w-5 h-5 shrink-0" />
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    {t.scheduleTitle}
                  </h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{t.scheduleSub}</p>
              </div>

              {scheduleLoading ? (
                <div className="p-6 space-y-3">
                  <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                </div>
              ) : travelDates.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">{t.noScheduleYet}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-5">{t.colDate}</th>
                        <th className="py-3 px-4 text-right">{t.colCapacity}</th>
                        <th className="py-3 px-4 text-right">{t.colBooked}</th>
                        <th className="py-3 px-4 text-right">{t.colRemaining}</th>
                        <th className="py-3 px-5 text-right">{t.colStatus}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {travelDates.map((td) => {
                        const remaining = Math.max(0, td.capacity - td.bookedCount);
                        const isFull = remaining === 0;
                        const statusText = !td.isOpen
                          ? t.statusClosed
                          : isFull
                          ? t.statusFull
                          : t.statusOpen;
                        return (
                          <tr key={td.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-5 font-medium text-slate-900 whitespace-nowrap">
                              {td.label}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                              {td.capacity}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                              {td.bookedCount}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#0F3D5E]">
                              {remaining}
                            </td>
                            <td className="py-3.5 px-5 text-right whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                  !td.isOpen
                                    ? 'text-slate-500'
                                    : isFull
                                    ? 'text-amber-700'
                                    : 'text-teal-700'
                                }`}
                              >
                                {isFull || !td.isOpen ? (
                                  <Lock className="w-3.5 h-3.5 shrink-0" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                )}
                                <span>{statusText}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Boat Deck Showcase + Boarding Instructions */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="aspect-[4/3] bg-slate-200 relative overflow-hidden">
                {!deckImgFailed ? (
                  <img
                    src="/images/boat_upper_deck.jpg"
                    alt={t.deckTitle}
                    referrerPolicy="no-referrer"
                    onError={() => setDeckImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-700 to-[#0F3D5E] flex items-center justify-center text-white">
                    <Users className="w-10 h-10 text-teal-200" />
                  </div>
                )}
              </div>
              <div className="p-6 space-y-4">
                <h3 className="font-display text-lg font-bold text-slate-900">{t.deckTitle}</h3>
                <ul className="space-y-2.5 text-sm text-slate-600 leading-relaxed">
                  <li>01. {t.deckPoint1}</li>
                  <li>02. {t.deckPoint2}</li>
                  <li>03. {t.deckPoint3}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-slate-500">
          <div className="space-y-1">
            <p className="font-semibold text-slate-800">{trip.name}</p>
            <p className="text-xs text-slate-500">{trip.pier}</p>
          </div>
          <div className="flex items-center gap-6 text-xs font-medium">
            <a href="#book-trip" className="hover:text-slate-900 transition-colors">
              {t.navBook}
            </a>
            <a href="#find-booking" className="hover:text-slate-900 transition-colors">
              {t.navFind}
            </a>
            <Link href="/admin" className="hover:text-slate-900 transition-colors">
              {t.navAdmin}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
