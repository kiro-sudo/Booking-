export type Locale = 'en' | 'my';

export const TRIP_INFO = {
  en: {
    brand: 'Mergui Short Boat Trip',
    name: 'Mergui short boat trip',
    shortDesc:
      'A calm 15-min night view boat trip along the Kannar road. Life jackets provided.',
    pier: 'Kannar Road Waterfront · The departure time depends on the tides.',
    paymentRule: 'Pay cash in person on your travel date.',
    boardingRule: 'Show this booking receipt on your phone when boarding.',
  },
  my: {
    brand: 'မြိတ် အပျော်စီးသင်္ဘော',
    name: 'မြိတ် အပျော်စီးသင်္ဘော ခရီးစဉ်တို',
    shortDesc:
      'ကမ်းနားလမ်းတစ်လျှောက် ၁၅ မိနစ်ကြာ အေးချမ်းသော ညဘက်မြင်ကွင်း အပျော်စီးသင်္ဘော ခရီးစဉ်။ အသက်ကယ်အင်္ကျီများ စီစဉ်ပေးထားပါသည်။',
    pier: 'ကမ်းနားလမ်း · ထွက်ခွာချိန်သည် ဒီရေအတက်အကျပေါ် မူတည်ပါသည်။',
    paymentRule: 'ခရီးသွားမည့်နေ့တွင် လူကိုယ်တိုင် ငွေသားဖြင့် ပေးချေရပါမည်။',
    boardingRule: 'သင်္ဘောပေါ်တက်ရောက်ချိန်တွင် ဤဘိုကင်လက်မှတ်ကို ဖုန်းဖြင့် ပြသပေးပါ။',
  },
} as const;

export const COPY = {
  en: {
    navSchedule: 'Schedule',
    navBook: 'Book Trip',
    navFind: 'Find Booking',
    navAdmin: 'Admin',
    bookNow: 'Book Now',
    heroKicker: '15-Min Night View Boat Trip',
    earliestDate: 'Earliest Available Date',
    remainingSeats: 'Remaining Seats',
    openDates: 'Open Dates',
    paymentLabel: 'Payment',
    cashAtPier: 'Cash on Travel Date',
    noDatesAvailable: 'No open dates',
    seatsUnit: 'seats',
    bookSectionTitle: 'Book Your Boat Trip',
    bookSectionSub:
      'Enter your name and phone number. You will be automatically assigned to the earliest available departure date.',
    customerNameLabel: 'Customer Name',
    customerNamePlaceholder: 'e.g., Kyaw Zin Htet',
    phoneLabel: 'Phone Number',
    phonePlaceholder: 'e.g., 09 789 123 456',
    confirmBooking: 'Confirm Booking',
    submittingBooking: 'Confirming Booking...',
    autoAssignNote:
      'One active booking per phone number. Travel date is assigned automatically based on remaining capacity.',
    existingBookingNotice:
      'An active booking already exists for your name and phone number. Your original booking receipt is shown below.',
    newBookingSuccess: 'Booking confirmed. Please save your receipt as a PNG image for boarding.',
    phoneConflictError:
      'This phone number already has an active booking under a different name. Each phone number can hold only one booking.',
    noCapacityError:
      'All currently scheduled travel dates are full or closed. Please check back when new dates are added.',
    notInitializedError:
      'Booking schedule has not been initialized by the operator yet. Please try again shortly.',
    invalidInputError: 'Please enter a valid customer name (at least 2 characters) and phone number (6-24 digits).',
    genericError: 'Could not complete your request. Please check your connection and try again.',
    findSectionTitle: 'Find My Booking',
    findSectionSub:
      'Already booked and forgot to save your receipt? Enter your exact name and phone number to retrieve it.',
    findButton: 'Find My Booking',
    findingButton: 'Searching...',
    lookupNotFound:
      'No matching booking was found. Please verify that both your name and phone number match your original booking.',
    lookupRateLimit: 'Too many lookup attempts. Please wait a few minutes and try again.',
    receiptTitle: 'Official Booking Receipt',
    receiptSubtitle: 'Present this slip when boarding',
    receiptTripName: 'Boat Trip Name',
    receiptBookingNo: 'Booking Number',
    receiptCustomerName: 'Customer Name',
    receiptPhone: 'Phone Number',
    receiptBookedAt: 'Booking Date & Time',
    receiptTravelDate: 'Assigned Travel Date',
    receiptStatus: 'Booking Status',
    statusConfirmed: 'Confirmed',
    savePngButton: 'Save Receipt as PNG',
    savingPng: 'Generating PNG...',
    serverTimeBadge: 'Server Time',
    scheduleTitle: 'Upcoming Departure Schedule',
    scheduleSub:
      'Customers are automatically placed on the earliest open date below. When one date fills up, bookings roll over to the next open date.',
    colDate: 'Travel Date',
    colCapacity: 'Limit',
    colBooked: 'Booked',
    colRemaining: 'Remaining',
    colStatus: 'Status',
    statusAvailable: 'Available',
    statusFillingUp: 'Filling Up',
    statusSoldOut: 'Sold Out',
    statusClosed: 'Closed',
    nextTripLabel: 'Next Assigned Trip',
    currentTripStatus: 'Current Trip Status',
    noScheduleYet: 'No upcoming travel dates configured yet.',
    deckTitle: 'Boarding & Onboard Notes',
    deckPoint1: 'The departure time depends on the tides. Please confirm boarding time on your travel date.',
    deckPoint2: 'Show your saved PNG receipt to pier staff.',
    deckPoint3: 'No online payment needed — pay cash on your travel date.',
  },
  my: {
    navSchedule: 'ခရီးစဉ်ဇယား',
    navBook: 'ဘိုကင်တင်ရန်',
    navFind: 'ဘိုကင်ရှာရန်',
    navAdmin: 'အက်ဒ်မင်',
    bookNow: 'ဘိုကင်တင်မည်',
    heroKicker: '၁၅ မိနစ် ညဘက်မြင်ကွင်း သင်္ဘောခရီးစဉ်',
    earliestDate: 'အစောဆုံး ရရှိနိုင်သောရက်',
    remainingSeats: 'ကျန်ရှိသော နေရာ',
    openDates: 'ဖွင့်ထားသော ရက်ပေါင်း',
    paymentLabel: 'ငွေပေးချေမှု',
    cashAtPier: 'ခရီးသွားမည့်နေ့တွင် ငွေသားပေးချေရန်',
    noDatesAvailable: 'ရရှိနိုင်သောရက် မရှိသေးပါ',
    seatsUnit: 'နေရာ',
    bookSectionTitle: 'သင်္ဘောခရီးစဉ် ဘိုကင်တင်ရန်',
    bookSectionSub:
      'သင့်အမည်နှင့် ဖုန်းနံပါတ်ကိုသာ ဖြည့်သွင်းပါ။ ကျန်ရှိသောနေရာပေါ်မူတည်၍ အစောဆုံးရရှိနိုင်သော ခရီးသွားရက်ကို စနစ်မှ အလိုအလျောက် သတ်မှတ်ပေးပါမည်။',
    customerNameLabel: 'အမည်',
    customerNamePlaceholder: 'ဥပမာ - ကျော်ဇင်ထက်',
    phoneLabel: 'ဖုန်းနံပါတ်',
    phonePlaceholder: 'ဥပမာ - 09 789 123 456',
    confirmBooking: 'ဘိုကင်အတည်ပြုမည်',
    submittingBooking: 'အတည်ပြုနေသည်...',
    autoAssignNote:
      'ဖုန်းနံပါတ်တစ်ခုလျှင် ဘိုကင်တစ်ခုသာ ပြုလုပ်နိုင်ပါသည်။ ခရီးသွားရက်ကို အလိုအလျောက် သတ်မှတ်ပေးပါမည်။',
    existingBookingNotice:
      'သင့်အမည်နှင့် ဖုန်းနံပါတ်ဖြင့် ဘိုကင်ပြုလုပ်ပြီးသား ရှိနေပါသည်။ မူလဘိုကင်လက်မှတ်ကို အောက်တွင် ပြန်လည်ကြည့်ရှုနိုင်ပါသည်။',
    newBookingSuccess: 'ဘိုကင်အောင်မြင်ပါသည်။ သင်္ဘောတက်ချိန်ပြသရန် PNG ပုံအဖြစ် သိမ်းဆည်းထားပါ။',
    phoneConflictError:
      'ဤဖုန်းနံပါတ်ဖြင့် အခြားအမည်တစ်ခုဖြင့် ဘိုကင်တင်ပြီးသား ရှိနေပါသည်။ ဖုန်းနံပါတ်တစ်ခုလျှင် ဘိုကင်တစ်ခုသာ ခွင့်ပြုပါသည်။',
    noCapacityError:
      'လက်ရှိသတ်မှတ်ထားသော ခရီးသွားရက်များ အားလုံးပြည့်သွားပါပြီ။ ရက်အသစ်များ ထပ်မံထည့်သွင်းချိန်တွင် ပြန်လည်စစ်ဆေးပါ။',
    notInitializedError:
      'ခရီးစဉ်ဇယားကို စတင်ပြင်ဆင်နေဆဲဖြစ်ပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။',
    invalidInputError: 'ကျေးဇူးပြု၍ မှန်ကန်သော အမည် (စာလုံး ၂ လုံးအထက်) နှင့် ဖုန်းနံပါတ် (ဂဏန်း ၆-၂၄ လုံး) ထည့်သွင်းပါ။',
    genericError: 'လုပ်ဆောင်မှု မအောင်မြင်ပါ။ အင်တာနက်လိုင်း စစ်ဆေးပြီး ထပ်မံကြိုးစားပါ။',
    findSectionTitle: 'ကျွန်ုပ်၏ ဘိုကင်ရှာရန်',
    findSectionSub:
      'ဘိုကင်လက်မှတ် သိမ်းဆည်းရန် မေ့ကျန်ခဲ့ပါက မူလဘိုကင်တင်ခဲ့သည့် အမည်နှင့် ဖုန်းနံပါတ်ကို ထည့်၍ ပြန်လည်ရယူနိုင်ပါသည်။',
    findButton: 'ဘိုကင်ရှာမည်',
    findingButton: 'ရှာဖွေနေသည်...',
    lookupNotFound:
      'ကိုက်ညီသော ဘိုကင်မှတ်တမ်း မတွေ့ပါ။ မူလဘိုကင်တင်ခဲ့သည့် အမည်နှင့် ဖုန်းနံပါတ် အတိအကျ မှန်ကန်မှု ရှိ/မရှိ စစ်ဆေးပါ။',
    lookupRateLimit: 'ရှာဖွေမှု အကြိမ်ရေ များနေပါသည်။ မိနစ်အနည်းငယ်စောင့်ပြီး ထပ်မံကြိုးစားပါ။',
    receiptTitle: 'တရားဝင် ဘိုကင်လက်မှတ်',
    receiptSubtitle: 'သင်္ဘောတက်ရောက်ချိန်တွင် ဤလက်မှတ်ကို ပြသပါ',
    receiptTripName: 'ခရီးစဉ်အမည်',
    receiptBookingNo: 'ဘိုကင်နံပါတ်',
    receiptCustomerName: 'ခရီးသည်အမည်',
    receiptPhone: 'ဖုန်းနံပါတ်',
    receiptBookedAt: 'ဘိုကင်တင်သည့် ရက်နှင့်အချိန်',
    receiptTravelDate: 'သတ်မှတ်ခရီးသွားရက်',
    receiptStatus: 'ဘိုကင်အခြေအနေ',
    statusConfirmed: 'အတည်ပြုပြီး',
    savePngButton: 'လက်မှတ်ကို PNG ပုံဖြင့် သိမ်းမည်',
    savingPng: 'ပုံဖန်တီးနေသည်...',
    serverTimeBadge: 'ဆာဗာအချိန်',
    scheduleTitle: 'လာမည့် ခရီးစဉ်ရက်စွဲများ',
    scheduleSub:
      'အောက်ပါအစောဆုံး နေရာလွတ်ရှိသော ခရီးသွားရက်သို့ အလိုအလျောက် သတ်မှတ်ပေးပါမည်။ ရက်တစ်ခုပြည့်ပါက နောက်ရက်သို့ ဆက်လက်လက်ခံပေးပါမည်။',
    colDate: 'ခရီးသွားရက်',
    colCapacity: 'ကန့်သတ်ဦးရေ',
    colBooked: 'ဘိုကင်ပြီး',
    colRemaining: 'ကျန်ရှိ',
    colStatus: 'အခြေအနေ',
    statusAvailable: 'ရရှိနိုင်သည်',
    statusFillingUp: 'နေရာနည်းလာပြီ',
    statusSoldOut: 'လက်မှတ်ကုန်ပြီ',
    statusClosed: 'ပိတ်ထားသည်',
    nextTripLabel: 'နောက်ဆုံးသတ်မှတ်မည့် ခရီးစဉ်',
    currentTripStatus: 'လက်ရှိခရီးစဉ် အခြေအနေ',
    noScheduleYet: 'ခရီးစဉ်ရက်စွဲများ ထည့်သွင်းထားခြင်း မရှိသေးပါ။',
    deckTitle: 'သင်္ဘောတက်ရောက်ခြင်းဆိုင်ရာ အချက်အလက်များ',
    deckPoint1: 'ထွက်ခွာချိန်သည် ဒီရေအတက်အကျပေါ် မူတည်ပါသည်။ ခရီးသွားမည့်နေ့တွင် ထွက်ခွာချိန်ကို စစ်ဆေးပေးပါ။',
    deckPoint2: 'သိမ်းဆည်းထားသော PNG ဘိုကင်လက်မှတ်ကို ဝန်ထမ်းအား ပြသပါ။',
    deckPoint3: 'အွန်လိုင်းငွေပေးချေမှု မလိုအပ်ပါ — ခရီးသွားမည့်နေ့တွင် ငွေသားပေးချေပါ။',
  },
} as const;

export function formatTravelDateLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export type TripCapacityState = 'available' | 'filling_up' | 'sold_out' | 'closed';

export function getTripCapacityState(
  capacity: number,
  bookedCount: number,
  isOpen: boolean
): TripCapacityState {
  if (!isOpen) return 'closed';
  const remaining = Math.max(0, capacity - bookedCount);
  if (remaining === 0) return 'sold_out';
  if (bookedCount > 0 && (remaining <= 5 || remaining / Math.max(1, capacity) <= 0.3)) {
    return 'filling_up';
  }
  return 'available';
}

export function formatServerTimestamp(ms: number, locale: Locale): string {
  if (!ms) return '-';
  const dt = new Date(ms);
  return dt.toLocaleString(locale === 'my' ? 'en-GB' : 'en-US', {
    timeZone: 'Asia/Yangon',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }) + ' (MMT)';
}
