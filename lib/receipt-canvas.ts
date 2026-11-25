import type { BookingRecord } from './booking-helpers';
import { COPY, formatServerTimestamp, Locale, TRIP_INFO } from './i18n';

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function downloadBookingReceiptPng(
  booking: BookingRecord,
  locale: Locale
): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const width = 960;
  const height = 1280;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const t = COPY[locale];
  const trip = TRIP_INFO[locale];

  // Background paper canvas
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(0, 0, width, height);

  const cardX = 48;
  const cardY = 48;
  const cardW = width - 96;
  const cardH = height - 96;

  // Main receipt card
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 28);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#CBD5E1';
  ctx.stroke();

  // Header band (Maritime Navy)
  const headerH = 260;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, headerH, [28, 28, 0, 0]);
  ctx.clip();
  ctx.fillStyle = '#0F3D5E';
  ctx.fillRect(cardX, cardY, cardW, headerH);

  // Subtle geometric wave lines in header
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const baseY = cardY + 205 + i * 18;
    ctx.moveTo(cardX, baseY);
    for (let x = cardX; x <= cardX + cardW; x += 40) {
      const y = baseY + Math.sin((x - cardX) * 0.02 + i) * 6;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  const padX = cardX + 52;
  const innerW = cardW - 104;

  // Header copy
  ctx.fillStyle = '#99F6E4';
  ctx.font = '600 22px "Noto Sans Myanmar", "Plus Jakarta Sans", sans-serif';
  ctx.fillText(t.receiptTitle.toUpperCase(), padX, cardY + 62);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 34px "Noto Sans Myanmar", "Outfit", sans-serif';
  const nameLines = wrapText(ctx, trip.name, innerW);
  nameLines.slice(0, 2).forEach((line, idx) => {
    ctx.fillText(line, padX, cardY + 114 + idx * 42);
  });

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '500 20px "Noto Sans Myanmar", "Plus Jakarta Sans", sans-serif';
  ctx.fillText(t.receiptSubtitle, padX, cardY + 216);

  // Prominent Booking Number & Status Strip
  const stripY = cardY + headerH + 36;
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.roundRect(padX, stripY, innerW, 136, 16);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = '600 18px "Noto Sans Myanmar", "Plus Jakarta Sans", sans-serif';
  ctx.fillText(t.receiptBookingNo, padX + 28, stripY + 42);

  ctx.fillStyle = '#0F3D5E';
  ctx.font = '700 54px "JetBrains Mono", monospace';
  ctx.fillText(booking.bookingNumber, padX + 28, stripY + 106);

  // Confirmed badge on right
  ctx.fillStyle = '#0F766E';
  ctx.font = '700 22px "Noto Sans Myanmar", "Plus Jakarta Sans", sans-serif';
  const statusText = `✓ ${t.statusConfirmed}`;
  const statusWidth = ctx.measureText(statusText).width;
  ctx.fillText(statusText, padX + innerW - statusWidth - 28, stripY + 96);

  // Receipt detail rows
  const rows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: t.receiptTravelDate, value: booking.travelDateLabel },
    { label: t.receiptCustomerName, value: booking.customerName },
    { label: t.receiptPhone, value: booking.phone, mono: true },
    {
      label: t.receiptBookedAt,
      value: formatServerTimestamp(booking.createdAtMs, locale),
      mono: true,
    },
    { label: t.receiptStatus, value: t.statusConfirmed },
  ];

  let rowY = stripY + 178;
  rows.forEach((row, index) => {
    ctx.fillStyle = '#64748B';
    ctx.font = '500 20px "Noto Sans Myanmar", "Plus Jakarta Sans", sans-serif';
    ctx.fillText(row.label, padX, rowY);

    ctx.fillStyle = '#0F172A';
    ctx.font = row.mono
      ? '600 24px "JetBrains Mono", "Noto Sans Myanmar", monospace'
      : '600 26px "Noto Sans Myanmar", "Plus Jakarta Sans", sans-serif';
    const valLines = wrapText(ctx, row.value, innerW);
    valLines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, padX, rowY + 38 + i * 32);
    });

    if (index < rows.length - 1) {
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padX, rowY + 62);
      ctx.lineTo(padX + innerW, rowY + 62);
      ctx.stroke();
    }
    rowY += 92;
  });

  // Boarding & Payment Instructions Box
  const noticeY = cardY + cardH - 224;
  ctx.fillStyle = '#F0FDFA';
  ctx.beginPath();
  ctx.roundRect(padX, noticeY, innerW, 176, 16);
  ctx.fill();
  ctx.strokeStyle = '#99F6E4';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#0F3D5E';
  ctx.font = '700 22px "Noto Sans Myanmar", "Plus Jakarta Sans", sans-serif';
  const payLines = wrapText(ctx, trip.paymentRule, innerW - 48);
  payLines.slice(0, 1).forEach((line, i) => {
    ctx.fillText(line, padX + 24, noticeY + 42 + i * 28);
  });

  ctx.fillStyle = '#0F766E';
  ctx.font = '600 19px "Noto Sans Myanmar", "Plus Jakarta Sans", sans-serif';
  const boardLines = wrapText(ctx, trip.boardingRule, innerW - 48);
  boardLines.slice(0, 1).forEach((line, i) => {
    ctx.fillText(line, padX + 24, noticeY + 86 + i * 26);
  });

  ctx.fillStyle = '#475569';
  ctx.font = '500 18px "Noto Sans Myanmar", "Plus Jakarta Sans", sans-serif';
  const pierLines = wrapText(ctx, trip.pier, innerW - 48);
  pierLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, padX + 24, noticeY + 128 + i * 24);
  });

  // Trigger download
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `${booking.bookingNumber}-receipt.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
