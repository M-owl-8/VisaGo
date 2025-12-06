export type DocumentKey =
  | 'passport'
  | 'bank_statement'
  | 'police_clearance'
  | 'property_certificate'
  | 'employment_letter'
  | 'student_status_letter'
  | 'travel_insurance'
  | 'marriage_certificate'
  | 'sponsor_letter'
  | 'flight_booking'
  | 'accommodation_proof';

type DocumentGuide = {
  key: DocumentKey;
  title: string;
  // Keywords / phrases in Uzbek, Russian and English used to match user queries
  aliases: string[];
  content: string;
};

const DOCUMENT_GUIDES: DocumentGuide[] = [
  {
    key: 'passport',
    title: 'Zagran pasport (xalqaro pasport)',
    aliases: [
      'zagran pasport',
      'xalqaro pasport',
      'passport',
      'pasport',
      'загранпаспорт',
      'заграничный паспорт',
      'foreign passport',
    ],
    content: `Uzbekistonda xalqaro (biometrik) pasport quyidagicha olinadi:

Ariza beruvchi yashash manzili bo'yicha migratsiya xizmatiga yoki Ichki ishlar organlarining tegishli bo'limiga murojaat qiladi (ko'pincha "YIDXP" yoki migratsiya bo'limi).

Talab qilinadigan umumiy hujjatlar:
- Ichki pasport yoki ID karta.
- Biometrik suratlar (agar joyida olinmasa).
- Davlat boji / konsullik yig'imi to'langanligi haqida chek (bank yoki to'lov tizimi kvitansiyasi).

Ariza onlayn yoki oflayn shaklda to'ldiriladi, biometrik ma'lumotlar olinadi.

Odatda tayyor bo'lish muddati bir necha ish kuni haftadan bir necha haftagacha bo'lishi mumkin, hududga qarab farq qiladi. Aniq ro'yxat va muddatlar hududingizdagi rasmiy migratsiya xizmatida tekshirilishi kerak.`,
  },
  {
    key: 'bank_statement',
    title: "Bank hisob varag'i (bank statement)",
    aliases: [
      'bank statement',
      'bank vypiska',
      'bank hisob varagi',
      "bank hisob varag'i",
      'выписка из банка',
      'выписка по счету',
      'hisob varagi',
    ],
    content: `Bank hisob varag'i (statement) odatda quyidagicha olinadi:

Visa uchun odatda so'nggi 3–6 oylik hisob varag'i so'raladi.

Mijoz o'zining asosiy bankiga murojaat qiladi (milliy yoki xorijiy valyutadagi hisob).

Hisob varag'ini olish usullari:
- Filialga pasport bilan borish va "rasmiy bank statement" so'rash.
- Ba'zi banklarda mobil ilova yoki internet-banking orqali PDF statement yuklab olish mumkin, lekin visa uchun ko'pincha bank muhri bilan qog'oz variantini so'rashadi.

Bank xodimiga maqsad (vizaga topshirish) haqida aytilsa, ular ko'pincha ingliz tilida yoki xalqaro formatda statement tayyorlab berishadi.

Hisob varag'ida ism, hisob raqami, valyuta, kunlik/oylik qoldiq va aylanmalar ko'rinishi kerak. Aniq talablar har bir konsullik va bankda farq qiladi, rasmiy manbalarni tekshirish zarur.`,
  },
  {
    key: 'police_clearance',
    title: "Sudlanmaganlik haqida ma'lumot (police clearance)",
    aliases: [
      'sudlanmaganlik',
      'spravka o nesudimosti',
      'справка о несудимости',
      'police clearance',
      "ma'lumotnoma sudlanmaganlik",
      'sudlanmaganlik spravkasi',
    ],
    content: `Sudlanmaganlik haqida ma'lumotnoma odatda quyidagicha olinadi:

Ma'lumotnoma Ichki ishlar organlari yoki tegishli adliya/migratsiya bo'limlari orqali beriladi (mamlakatdagi amaldagi tartibga qarab).

Odatda ariza berish usullari:
- Yashash manzili bo'yicha ichki ishlar bo'limiga shaxsan borish.
- Yagona interaktiv davlat xizmatlari portalidan (e-gov) onlayn buyurtma berish (agar mavjud bo'lsa).

Kerak bo'lishi mumkin bo'lgan hujjatlar:
- Pasport yoki ID karta nusxasi.
- Ariza shakli (joyida to'ldiriladi yoki onlayn).

Ma'lumotnoma tayyor bo'lish muddati bir necha ish kuni, ba'zida uzoqroq bo'lishi mumkin.

Agar hujjat chet elga topshirish uchun bo'lsa, ko'pincha apostil yoki konsullik tasdig'i talab qilinishi mumkin; buni oldindan aniqlashtirish muhim.`,
  },
  {
    key: 'property_certificate',
    title: "Ko'chmas mulk huquqi haqida guvohnoma",
    aliases: [
      'mulk hujjati',
      'property certificate',
      'nedvizhimost',
      'квитанция на недвижимость',
      'kadastr',
      'kadastr hujjati',
    ],
    content: `Ko'chmas mulk huquqi haqida hujjatlar odatda quyidagicha olinadi:

Mulk ro'yxatdan o'tgan kadastr organi yoki davlat reyestridan tegishli ma'lumotnoma olinadi.

Egasi:
- Pasport bilan murojaat qiladi.
- Mulk kadastr raqamini yoki manzilini ko'rsatadi.

Ba'zi hollarda ma'lumotnomani onlayn portallar orqali olish mumkin, lekin ko'pincha kadastr idorasiga borish talab etiladi.

Visa uchun ko'pincha:
- Mulk egasi sifatida yozilganingizni tasdiqlovchi hujjat nusxasi.
- Ba'zan kadastrdan so'nggi holat bo'yicha ma'lumotnoma so'raladi.

Aniq shakl va talablarni konsullik ko'rsatmalarida tekshirish kerak.`,
  },
  {
    key: 'employment_letter',
    title: "Ish joyidan ma'lumotnoma (employment letter)",
    aliases: [
      'ish joyidan spravka',
      "ish joyidan ma'lumotnoma",
      'employment letter',
      'справка с работы',
      'ish joyidan reference',
    ],
    content: `Ish joyidan ma'lumotnoma odatda quyidagicha tayyorlanadi:

Xodim kadrlar bo'limi yoki rahbariyatga yozma yoki og'zaki so'rov qiladi.

Ma'lumotnomada quyidagilar bo'lishi kerak:
- Kompaniya nomi, manzili va aloqa ma'lumotlari.
- Xodimning F.I.Sh., lavozimi va ish boshlagan sanasi.
- O'rtacha oylik maosh yoki yillik daromad (agar kerak bo'lsa).
- Ish joyini saqlab qolishi (ta'til yoki xizmat safariga ruxsat) haqida ibora, agar mos bo'lsa.

Hujjat kompaniya blankasida, mas'ul shaxs imzosi va muhri bilan berilishi lozim.

Kerak bo'lsa, ingliz tiliga tarjima va notarial tasdiq qilingan nusxa tayyorlanadi.`,
  },
  {
    key: 'student_status_letter',
    title: "Talabalik haqida ma'lumotnoma (student status letter)",
    aliases: [
      'talabalik spravkasi',
      'student spravka',
      "talabalik haqida ma'lumot",
      'student status letter',
      'справка с университета',
      "o'qishdan spravka",
    ],
    content: `Talabalik haqida ma'lumotnoma:

Talaba o'qiyotgan litsey, kollej yoki oliy ta'lim muassasasining dekanat / o'quv bo'limiga murojaat qiladi.

Ma'lumotnomada:
- Talabaning F.I.Sh.
- O'qish turi (kunduzgi/sirtqi), kurs, fakultet.
- O'qish boshlangan sanasi va taxminiy tugash sanasi.

Hujjat muassasa blankasida, mas'ul shaxs imzosi va muhr bilan beriladi.

Agar chet elga topshirilsa, ko'pincha ingliz tiliga tarjima va ba'zida apostil/notarial tasdiq talab qilinadi.`,
  },
  {
    key: 'travel_insurance',
    title: "Sayohat sug'urtasi (travel insurance)",
    aliases: [
      'travel insurance',
      "sug'urta",
      "safar sug'urtasi",
      'страховка для визы',
      'страховка для поездки',
    ],
    content: `Sayohat sug'urtasini olish:

Litsenziyaga ega sug'urta kompaniyalari yoki ularning agentliklariga murojaat qilinadi.

Konsullik ko'rsatmalarida aniq minimal qoplama summasi berilgan bo'ladi (masalan, Schengen uchun 30 000 EUR).

Sug'urta polisini rasmiylashtirishda:
- Safar sanalari.
- Boriladigan davlatlar.
- Sug'urta turi (tibbiy xarajatlar, repatriatsiya va h.k.).
kiritiladi.

Polis qog'oz yoki elektron shaklda beriladi; visa uchun ko'pincha qog'oz nusxa topshiriladi.`,
  },
  {
    key: 'marriage_certificate',
    title: 'Nikoh haqida guvohnoma',
    aliases: [
      'nikoh haqida guvohnoma',
      'marriage certificate',
      'свидетельство о браке',
      'nikoh guvohnomasi',
    ],
    content: `Nikoh haqida guvohnoma:

Agar nikoh allaqachon ro'yxatdan o'tgan bo'lsa, guvohnoma ZAGS yoki FHDYO organlari tomonidan beriladi.

Agar asl hujjat yo'qolgan bo'lsa, qayta nusxasini olish uchun nikoh qayd etilgan bo'limga murojaat qilinadi.

Visa uchun ko'pincha:
- Asl guvohnoma nusxasi.
- Kerak bo'lsa, tarjima va notarial tasdiq, ba'zan apostil talab qilinadi.`,
  },
  {
    key: 'sponsor_letter',
    title: 'Homiylik xati (sponsorship letter)',
    aliases: ['sponsor letter', 'homiylik xati', 'письмо спонсора', 'sponsorship', 'homiy'],
    content: `Homiylik xati odatda quyidagicha tayyorlanadi:

Homiy (ota-ona, qarindosh yoki boshqa shaxs) ingliz yoki talablarga mos tilida rasmiy xat yozadi.

Xatda:
- Homiy F.I.Sh. va pasport ma'lumotlari.
- Ariza beruvchi bilan qarindoshlik darajasi (agar mavjud bo'lsa).
- Qaysi xarajatlarni qoplayotgani (o'qish, yashash, aviabiletlar va boshqalar).
- Homiyda yetarli mablag' borligini ko'rsatuvchi ibora.

Xat homiyning imzosi bilan beriladi; ko'pincha bank statement, ish joyidan ma'lumotnoma va mulk hujjatlari bilan birga topshiriladi.

Kerak bo'lsa, notarial tasdiqlangan bo'lishi mumkin; bu konsullik talablariga bog'liq.`,
  },
  {
    key: 'flight_booking',
    title: 'Aviabilet bron qilish (flight booking)',
    aliases: [
      'flight booking',
      'aviabilet bron',
      'bron qilingan bilet',
      'бронирование билета',
      'aviachipta',
    ],
    content: `Aviabilet bron qilish:

Konsullik ko'pincha to'liq sotib olingan biletni emas, balki qaytarish mumkin bo'lgan bron yoki rezervatsiyani qabul qiladi.

Bron qilish usullari:
- Aviakompaniya rasmiy sayti orqali qaytariladigan tarif bilan bilet olish.
- Ishonchli agentlik yoki turfirmadan "visa uchun booking" xizmatini olish.

Muhim: soxta, tekshirilmaydigan bronlardan foydalanish tavsiya etilmaydi; bu rad etish xavfini oshirishi mumkin.

Har doim konsullik ko'rsatmalarini tekshirish lozim: ba'zi davlatlar aniq qoidalar keltiradi.`,
  },
  {
    key: 'accommodation_proof',
    title: "Yashash joyi tasdig'i (accommodation proof)",
    aliases: [
      'hotel booking',
      'mehmonxona bron',
      "yashash joyi tasdig'i",
      'accommodation proof',
      'подтверждение проживания',
      'bron qilingan mehmonxona',
    ],
    content: `Yashash joyi tasdig'i:

Turistlar uchun:
- Mehmonxona yoki boshqa turar joyni bron qilib, tasdiq xatini olish (ism, sanalar va manzil ko'rsatilgan).

Talabalar uchun:
- Talim muassasasi yotoqxonasidan joy ajratilganligi haqidagi xat.
- Yoki ijara shartnomasi (landlord bilan tuzilgan shartnoma).

Ba'zi konsulliklar bron qilingan mehmonxonani to'liq to'lovsiz ham qabul qilishi mumkin, lekin shartlar har xil; rasmiy ko'rsatmalarni tekshirish zarur.`,
  },
];

/**
 * Get relevant document guides based on user query
 * @param query - User's message/question
 * @param maxGuides - Maximum number of guides to return (default: 2)
 * @returns Combined text of relevant document guides, or empty string if none match
 */
export function getRelevantDocumentGuides(query: string, maxGuides: number = 2): string {
  if (!query) return '';

  const normalized = query.toLowerCase();

  const matches: DocumentGuide[] = [];

  for (const guide of DOCUMENT_GUIDES) {
    for (const alias of guide.aliases) {
      if (alias && normalized.includes(alias.toLowerCase())) {
        matches.push(guide);
        break;
      }
    }
  }

  if (matches.length === 0) {
    return '';
  }

  const limited = matches.slice(0, maxGuides);

  const parts: string[] = [];
  for (const guide of limited) {
    parts.push(`DOCUMENT: ${guide.title}\n${guide.content}`);
  }

  return parts.join('\n\n').trim();
}
