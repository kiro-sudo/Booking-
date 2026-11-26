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
    navContact: 'Contact',
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
      'Choose your preferred departure date from the open dates below, then enter your name and phone number.',
    selectDateLabel: 'Select Travel Date',
    seatsLeftLabel: 'left',
    noSelectableDates: 'No open travel dates are currently available for booking.',
    customerNameLabel: 'Customer Name',
    customerNamePlaceholder: 'e.g., Kyaw Zin Htet',
    phoneLabel: 'Phone Number',
    phonePlaceholder: 'e.g., 09 789 123 456',
    confirmBooking: 'Confirm Booking',
    submittingBooking: 'Confirming Booking...',
    autoAssignNote:
      'One booking per phone number per travel date. You may book different travel dates with the same phone number. Each date starts its sequence at BT-1.',
    existingBookingNotice:
      'You already have an active booking for this travel date with your name and phone number. Your original booking receipt is shown below.',
    newBookingSuccess: 'Booking confirmed. Please save your receipt as a PNG image for boarding.',
    phoneConflictError:
      'This phone number already has an active booking on the selected travel date under a different name. Each phone number can hold one booking per travel date.',
    selectedDateFullError:
      'The selected travel date has reached its capacity limit. Please choose another available date.',
    selectedDateUnavailableError:
      'The selected travel date is closed or no longer available. Please choose another open date.',
    selectDateRequiredError: 'Please select an available travel date before confirming.',
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
    receiptTravelDate: 'Selected Travel Date',
    receiptStatus: 'Booking Status',
    statusConfirmed: 'Confirmed',
    statusCancelled: 'Cancelled',
    cancelledReceiptNote:
      'This booking has been cancelled by the Admin and is no longer valid for boarding.',
    savePngButton: 'Save Receipt as PNG',
    savingPng: 'Generating PNG...',
    serverTimeBadge: 'Server Time',
    scheduleTitle: 'Upcoming Departure Schedule',
    scheduleSub:
      'Select any available travel date above to book. Each date has an independent seat limit and automatically closes once sold out.',
    colDate: 'Travel Date',
    colCapacity: 'Limit',
    colBooked: 'Booked',
    colRemaining: 'Remaining',
    colStatus: 'Status',
    statusAvailable: 'Available',
    statusFillingUp: 'Filling Up',
    statusSoldOut: 'Sold Out',
    statusClosed: 'Closed',
    selectedTripLabel: 'Selected Travel Date',
    currentTripStatus: 'Current Trip Status',
    noScheduleYet: 'No upcoming travel dates configured yet.',
    deckTitle: 'Boarding & Onboard Notes',
    deckPoint1: 'The departure time depends on the tides. Please confirm boarding time on your travel date.',
    deckPoint2: 'Show your saved PNG receipt to pier staff.',
    deckPoint3: 'No online payment needed — pay cash on your travel date.',
    contactTitle: 'Customer Support — Contact Admin',
    contactSub: 'Need help with your booking or departure tide schedule? Reach our operator directly.',
    callAdminLabel: 'Call Admin',
    telegramLabel: 'Telegram',
    telegramAction: 'Message on Telegram',
    contactNotConfigured: 'Admin support contact details are not configured yet.',
  },
  my: {
    navSchedule: 'ခရီးစဉ်ဇယား',
    navBook: 'ဘိုကင်တင်ရန်',
    navFind: 'ဘိုကင်ရှာရန်',
    navContact: 'ဆက်သွယ်ရန်',
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
      'အောက်ပါဖွင့်ထားသော ရက်စွဲများထဲမှ နှစ်သက်ရာ ခရီးသွားရက်ကို ရွေးချယ်ပြီး သင့်အမည်နှင့် ဖုန်းနံပါတ်ကို ဖြည့်သွင်းပါ။',
    selectDateLabel: 'ခရီးသွားရက် ရွေးချယ်ပါ',
    seatsLeftLabel: 'နေရာကျန်',
    noSelectableDates: 'လက်ရှိတွင် ဘိုကင်တင်နိုင်သော ခရီးသွားရက် မရှိသေးပါ။',
    customerNameLabel: 'အမည်',
    customerNamePlaceholder: 'ဥပမာ - ကျော်ဇင်ထက်',
    phoneLabel: 'ဖုန်းနံပါတ်',
    phonePlaceholder: 'ဥပမာ - 09 789 123 456',
    confirmBooking: 'ဘိုကင်အတည်ပြုမည်',
    submittingBooking: 'အတည်ပြုနေသည်...',
    autoAssignNote:
      'ခရီးသွားရက်တစ်ရက်လျှင် ဖုန်းနံပါတ်တစ်ခုဖြင့် ဘိုကင်တစ်ခုသာ ပြုလုပ်နိုင်ပါသည်။ မတူညီသော အခြားခရီးသွားရက်များကိုမူ ထပ်မံဘိုကင်တင်နိုင်ပါသည်။ ရက်စွဲတစ်ခုစီတိုင်းအတွက် ဘိုကင်နံပါတ်သည် BT-1 မှ စတင်ပါမည်။',
    existingBookingNotice:
      'သင့်အမည်နှင့် ဖုန်းနံပါတ်ဖြင့် ဤခရီးသွားရက်အတွက် ဘိုကင်ပြုလုပ်ပြီးသား ရှိနေပါသည်။ မူလဘိုကင်လက်မှတ်ကို အောက်တွင် ပြန်လည်ကြည့်ရှုနိုင်ပါသည်။',
    newBookingSuccess: 'ဘိုကင်အောင်မြင်ပါသည်။ သင်္ဘောတက်ချိန်ပြသရန် PNG ပုံအဖြစ် သိမ်းဆည်းထားပါ။',
    phoneConflictError:
      'ဤဖုန်းနံပါတ်ဖြင့် ရွေးချယ်ထားသော ခရီးသွားရက်တွင် အခြားအမည်တစ်ခုဖြင့် ဘိုကင်တင်ပြီးသား ရှိနေပါသည်။ ရက်တစ်ရက်လျှင် ဖုန်းနံပါတ်တစ်ခုအတွက် ဘိုကင်တစ်ခုသာ ခွင့်ပြုပါသည်။',
    selectedDateFullError:
      'ရွေးချယ်ထားသော ခရီးသွားရက်သည် နေရာပြည့်သွားပါပြီ။ အခြားရရှိနိုင်သော ရက်တစ်ခုကို ရွေးချယ်ပေးပါ။',
    selectedDateUnavailableError:
      'ရွေးချယ်ထားသော ခရီးသွားရက်ကို ပိတ်ထားပါသည် သို့မဟုတ် မရရှိနိုင်တော့ပါ။ အခြားဖွင့်ထားသော ရက်တစ်ခုကို ရွေးချယ်ပေးပါ။',
    selectDateRequiredError: 'ဘိုကင်အတည်မပြုမီ ရရှိနိုင်သော ခရီးသွားရက်တစ်ခုကို ရွေးချယ်ပေးပါ။',
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
    receiptTravelDate: 'ရွေးချယ်ထားသော ခရီးသွားရက်',
    receiptStatus: 'ဘိုကင်အခြေအနေ',
    statusConfirmed: 'အတည်ပြုပြီး',
    statusCancelled: 'ပယ်ဖျက်ပြီး',
    cancelledReceiptNote:
      'ဤဘိုကင်ကို အက်ဒ်မင်မှ ပယ်ဖျက်ထားပြီးဖြစ်ပါသဖြင့် သင်္ဘောတက်ရောက်ရန် အသုံးမပြုနိုင်တော့ပါ။',
    savePngButton: 'လက်မှတ်ကို PNG ပုံဖြင့် သိမ်းမည်',
    savingPng: 'ပုံဖန်တီးနေသည်...',
    serverTimeBadge: 'ဆာဗာအချိန်',
    scheduleTitle: 'လာမည့် ခရီးစဉ်ရက်စွဲများ',
    scheduleSub:
      'အထက်ပါဖောင်တွင် နှစ်သက်ရာ ခရီးသွားရက်ကို ရွေးချယ်ဘိုကင်တင်နိုင်ပါသည်။ ရက်တစ်ခုပြည့်သွားပါက ထိုရက်အတွက် ဘိုကင်အလိုအလျောက် ပိတ်သွားပါမည်။',
    colDate: 'ခရီးသွားရက်',
    colCapacity: 'ကန့်သတ်ဦးရေ',
    colBooked: 'ဘိုကင်ပြီး',
    colRemaining: 'ကျန်ရှိ',
    colStatus: 'အခြေအနေ',
    statusAvailable: 'ရရှိနိုင်သည်',
    statusFillingUp: 'နေရာနည်းလာပြီ',
    statusSoldOut: 'လက်မှတ်ကုန်ပြီ',
    statusClosed: 'ပိတ်ထားသည်',
    selectedTripLabel: 'ရွေးချယ်ထားသော ခရီးသွားရက်',
    currentTripStatus: 'လက်ရှိခရီးစဉ် အခြေအနေ',
    noScheduleYet: 'ခရီးစဉ်ရက်စွဲများ ထည့်သွင်းထားခြင်း မရှိသေးပါ။',
    deckTitle: 'သင်္ဘောတက်ရောက်ခြင်းဆိုင်ရာ အချက်အလက်များ',
    deckPoint1: 'ထွက်ခွာချိန်သည် ဒီရေအတက်အကျပေါ် မူတည်ပါသည်။ ခရီးသွားမည့်နေ့တွင် ထွက်ခွာချိန်ကို စစ်ဆေးပေးပါ။',
    deckPoint2: 'သိမ်းဆည်းထားသော PNG ဘိုကင်လက်မှတ်ကို ဝန်ထမ်းအား ပြသပါ။',
    deckPoint3: 'အွန်လိုင်းငွေပေးချေမှု မလိုအပ်ပါ — ခရီးသွားမည့်နေ့တွင် ငွေသားပေးချေပါ။',
    contactTitle: 'အကူအညီရယူရန် — အက်ဒ်မင်သို့ ဆက်သွယ်ပါ',
    contactSub: 'ဘိုကင်ကိစ္စ သို့မဟုတ် ဒီရေထွက်ခွာချိန် မေးမြန်းလိုပါက အက်ဒ်မင်ထံ တိုက်ရိုက်ဆက်သွယ်နိုင်ပါသည်။',
    callAdminLabel: 'ဖုန်းခေါ်ဆိုရန်',
    telegramLabel: 'Telegram',
    telegramAction: 'Telegram ဖြင့် စာပို့ရန်',
    contactNotConfigured: 'ဆက်သွယ်ရန် ဖုန်းနံပါတ်နှင့် Telegram အချက်အလက်များ မသတ်မှတ်ရသေးပါ။',
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

export function formatBookingDateOnly(ms: number): string {
  if (!ms) return '-';
  const dt = new Date(ms);
  return dt.toLocaleDateString('en-CA', {
    timeZone: 'Asia/Yangon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatBookingTimeOnly(ms: number): string {
  if (!ms) return '-';
  const dt = new Date(ms);
  return (
    dt.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Yangon',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }) + ' (MMT)'
  );
}
