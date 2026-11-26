'use client';

import React, { useState } from 'react';
import { CheckCircle2, Download, Ship } from 'lucide-react';
import type { BookingRecord } from '@/lib/booking-helpers';
import { COPY, formatServerTimestamp, Locale, TRIP_INFO } from '@/lib/i18n';
import { downloadBookingReceiptPng } from '@/lib/receipt-canvas';

interface BookingReceiptCardProps {
  booking: BookingRecord;
  locale: Locale;
  noticeText?: string;
}

export function BookingReceiptCard({
  booking,
  locale,
  noticeText,
}: BookingReceiptCardProps) {
  const [downloading, setDownloading] = useState(false);
  const t = COPY[locale];
  const trip = TRIP_INFO[locale];

  const handleDownloadPng = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadBookingReceiptPng(booking, locale);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {noticeText && (
        <div className="bg-teal-50 border-b border-teal-200 px-5 py-3 flex items-start gap-2.5 text-sm text-teal-900">
          <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{noticeText}</p>
        </div>
      )}

      {/* Maritime Header Band */}
      <div className="bg-[#0F3D5E] text-white px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium tracking-wide text-teal-200">
              {t.receiptTitle}
            </p>
            <h3 className="font-display text-lg sm:text-xl font-bold leading-snug text-white">
              {trip.name}
            </h3>
            <p className="text-xs text-slate-300">{t.receiptSubtitle}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Ship className="w-5 h-5 text-teal-200" />
          </div>
        </div>
      </div>

      {/* Prominent Booking Number & Status */}
      <div className="px-5 py-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{t.receiptBookingNo}</p>
          <p className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#0F3D5E] tracking-tight mt-0.5">
            {booking.bookingNumber}
          </p>
        </div>
        {booking.status === 'Cancelled' ? (
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5">
            <span>{t.statusCancelled}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-3 py-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
            <span>{t.statusConfirmed}</span>
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="px-5 py-4 sm:px-6 divide-y divide-slate-100">
        <div className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <span className="text-xs font-medium text-slate-500">{t.receiptTravelDate}</span>
          <span className="text-base font-semibold text-slate-900">
            {booking.travelDateLabel}
          </span>
        </div>

        <div className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <span className="text-xs font-medium text-slate-500">{t.receiptCustomerName}</span>
          <span className="text-sm font-semibold text-slate-900">{booking.customerName}</span>
        </div>

        <div className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <span className="text-xs font-medium text-slate-500">{t.receiptPhone}</span>
          <span className="font-mono tabular-nums text-sm font-medium text-slate-900">
            {booking.phone}
          </span>
        </div>

        <div className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <span className="text-xs font-medium text-slate-500">
            {t.receiptBookedAt} · {t.serverTimeBadge}
          </span>
          <span className="font-mono tabular-nums text-xs sm:text-sm font-medium text-slate-800">
            {formatServerTimestamp(booking.createdAtMs, locale)}
          </span>
        </div>

        <div className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <span className="text-xs font-medium text-slate-500">{t.receiptStatus}</span>
          <span
            className={`text-sm font-semibold ${
              booking.status === 'Cancelled' ? 'text-rose-700' : 'text-teal-800'
            }`}
          >
            {booking.status === 'Cancelled' ? t.statusCancelled : t.statusConfirmed}
          </span>
        </div>
      </div>

      {/* Boarding & Payment Notice */}
      {booking.status === 'Cancelled' ? (
        <div className="mx-5 mb-5 sm:mx-6 sm:mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5">
          <p className="text-sm font-semibold text-rose-900">{t.cancelledReceiptNote}</p>
        </div>
      ) : (
        <div className="mx-5 mb-5 sm:mx-6 sm:mb-6 p-4 rounded-xl bg-teal-50/70 border border-teal-200/80 space-y-1.5">
          <p className="text-sm font-semibold text-[#0F3D5E]">{trip.paymentRule}</p>
          <p className="text-xs sm:text-sm text-teal-900 leading-relaxed">{trip.boardingRule}</p>
          <p className="text-xs text-slate-600 leading-relaxed">{trip.pier}</p>
        </div>
      )}

      {/* Action Button */}
      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={downloading}
          className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0F3D5E] text-white text-sm font-semibold hover:bg-[#0c314c] active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>{downloading ? t.savingPng : t.savePngButton}</span>
        </button>
      </div>
    </div>
  );
}
