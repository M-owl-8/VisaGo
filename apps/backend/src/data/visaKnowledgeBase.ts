export type VisaType = 'tourist' | 'student';

// Change summary (2025-11-24): Clarified Canada study permit terminology so AI consistently asks for LOA from a DLI instead of the US-specific I-20.

type VisaKbSection =
  | 'eligibility'
  | 'documents'
  | 'finance'
  | 'application_process'
  | 'refusal_reasons';

type VisaKbEntry = {
  country: string;
  visaType: VisaType;
  section: VisaKbSection;
  content: string;
};

const SPAIN_VISA_RULES: VisaKbEntry[] = [
  {
    country: 'Spain',
    visaType: 'tourist',
    section: 'eligibility',
    content: `
- Purpose of trip is tourism, visiting friends/relatives, or short business meetings.
- Intended stay is up to 90 days in any 180-day period (Schengen short-stay).
- Applicant must have a valid passport, travel insurance, and sufficient funds for the trip.
- Applicant typically applies in the country of legal residence.
- No intention to overstay or work illegally in Spain or the Schengen Area.

(General advice, must be confirmed on the official consulate or VFS website.)
    `.trim(),
  },
  {
    country: 'Spain',
    visaType: 'tourist',
    section: 'documents',
    content: `
Typical documents for a Spain Schengen tourist visa may include:

- Valid passport (issued within the last 10 years, valid at least 3 months beyond return date, with 2+ blank pages).
- Completed and signed Schengen visa application form.
- 1–2 biometric photos (passport-size, meeting Schengen specifications).
- Round-trip flight reservation or itinerary.
- Proof of accommodation (hotel booking, Airbnb, invitation letter, etc.).
- Travel medical insurance covering at least 30,000 EUR for the entire Schengen stay.
- Proof of financial means (recent bank statements, sponsorship letter, or income proof).
- Proof of ties to home country (employment letter, student certificate, property documents, family ties).

Exact requirements can vary by consulate; always confirm on the official website or VFS page.
    `.trim(),
  },
  {
    country: 'Spain',
    visaType: 'tourist',
    section: 'finance',
    content: `
For tourist visas, consulates generally expect the applicant to show enough funds to cover:

- Travel costs (tickets), accommodation, daily expenses, and emergencies.
- Some consulates apply a daily minimum amount per person (for example, a certain number of EUR per day).
- Funds are usually shown via bank statements for the last 3–6 months, income proofs, or sponsorship.

The exact amount and financial rules vary by embassy and time; the applicant must verify the current thresholds on the official consulate or VFS website.
    `.trim(),
  },
  {
    country: 'Spain',
    visaType: 'tourist',
    section: 'application_process',
    content: `
Spain Schengen tourist visa process typically includes:

1) Determine the correct consulate or VFS center based on country of residence.
2) Complete the online or paper visa application form.
3) Book an appointment via the consulate or VFS website.
4) Prepare all required documents, including biometrics and photos.
5) Attend the appointment, submit documents, and give fingerprints.
6) Wait for processing (often around 15 calendar days, but it can be longer).
7) Collect the passport or receive the decision as instructed.

Exact procedures and portals may differ by country; always follow the instructions on the official consulate or VFS website.
    `.trim(),
  },
  {
    country: 'Spain',
    visaType: 'tourist',
    section: 'refusal_reasons',
    content: `
Common refusal reasons for Spain Schengen tourist visas can include:

- Insufficient or unclear financial proof.
- Weak ties to home country (risk of overstay).
- Incomplete or inconsistent documentation.
- Questionable travel purpose or itinerary.
- Previous immigration violations or Schengen overstays.

Applicants should focus on clear, honest documentation, strong ties to home country, and a realistic travel plan.
    `.trim(),
  },
  {
    country: 'Spain',
    visaType: 'student',
    section: 'eligibility',
    content: `
For Spain student (long-stay study) visas, typical eligibility criteria include:

- Acceptance to a recognized educational institution in Spain (language school, university, etc.).
- Course duration usually longer than 90 days.
- Sufficient financial means to cover tuition and living costs.
- Health insurance coverage for the duration of stay.
- Clean criminal record and no threat to public order.

Exact rules depend on the type of program and local consulate guidelines.
    `.trim(),
  },
  {
    country: 'Spain',
    visaType: 'student',
    section: 'documents',
    content: `
Typical documents for a Spain student visa may include:

- Valid passport.
- Completed long-stay visa application form.
- Recent passport-size photos.
- Official letter of admission from the Spanish institution.
- Proof of tuition payment or scholarship (if applicable).
- Proof of sufficient financial means (bank statements, sponsorship, scholarship).
- Health insurance valid in Spain for the full duration of the stay.
- Criminal record certificate and, if required, medical certificate (depending on consulate).

Exact document sets are defined by each consulate and can change; always check the official instructions.
    `.trim(),
  },
  {
    country: 'Spain',
    visaType: 'student',
    section: 'finance',
    content: `
For student visas, consulates require proof that the student can cover:

- Tuition fees (or proof of scholarship).
- Monthly living costs in Spain (rent, food, transport, etc.).
- Some consulates use an approximate monthly minimum amount; this can change over time and may differ by region.

Financial proof is usually shown via bank statements, sponsorship from parents, or scholarship letters.

Applicants must verify the current financial thresholds on the official consulate website.
    `.trim(),
  },
  {
    country: 'Spain',
    visaType: 'student',
    section: 'application_process',
    content: `
Spain student visa process typically includes:

1) Obtain an official admission/acceptance letter from the Spanish institution.
2) Collect all required documents (including translations/apostilles if needed).
3) Book an appointment at the consulate responsible for the applicant's place of residence.
4) Submit the application in person, pay the visa fee, and provide biometrics.
5) Wait for processing (which can take several weeks).
6) If approved, collect the visa and travel to Spain, then complete local registration procedures as required (e.g. TIE, local police/immigration).

Details vary by consulate, so the applicant must follow their specific instructions.
    `.trim(),
  },
  {
    country: 'Spain',
    visaType: 'student',
    section: 'refusal_reasons',
    content: `
Common refusal reasons for Spain student visas can include:

- Doubts about the genuineness of the study plan.
- Insufficient or unclear financial proof.
- Incomplete documentation or missing legalizations/translations.
- Concerns about the applicant overstaying or not returning after studies.
- Previous immigration violations.

Applicants should present a clear, logical study plan, strong financial documentation, and demonstrate ties or a realistic long-term plan.
    `.trim(),
  },
];

// USA Visa Rules
const USA_VISA_RULES: VisaKbEntry[] = [
  {
    country: 'USA',
    visaType: 'tourist',
    section: 'eligibility',
    content: `
- Qisqa muddatli sayohat maqsadi: turizm, qarindoshlarni ko'rish, biznes uchrashuvlari.
- Immigratsion niyat bo'lmasligi (vaqtinchalik tashrif).
- Vatanga qaytish bog'liqligi (ish, oila, mulk) isbotlangan bo'lishi kerak.
- Oldingi vizalar yoki safarlar ijobiy omil bo'lishi mumkin.
    `.trim(),
  },
  {
    country: 'USA',
    visaType: 'tourist',
    section: 'documents',
    content: `
Asosiy hujjatlar:
1. Pasport (kamida 6 oy muddat qolgan).
2. DS-160 formasi (onlayn to'ldiriladi).
3. Interview tasdiqlovchi sahifa.
4. Biometrik surat (5x5 sm).
5. Bank statement (so'nggi 3-6 oy).
6. Ish joyidan ma'lumotnoma yoki biznes hujjatlari.
7. Agar bor bo'lsa, oldingi vizalar va safar hujjatlari.
8. Safar rejasi yoki mehmonxona bron.
    `.trim(),
  },
  {
    country: 'USA',
    visaType: 'tourist',
    section: 'finance',
    content: `
Moliyaviy talablar:
- Safar xarajatlarini qoplaydigan mablag' isboti (aviabilet, yashash, kundalik xarajatlar).
- Bank statement yoki homiylik xati.
- Konsullik aniq minimal summani ko'rsatmaydi, lekin safar xarajatlarini qoplash yetarli bo'lishi kerak.
    `.trim(),
  },
  {
    country: 'USA',
    visaType: 'tourist',
    section: 'application_process',
    content: `
Ariza berish jarayoni:
1. DS-160 formasi onlayn to'ldiriladi.
2. To'lov qilinadi (MRV to'lovi).
3. Elchixona yoki konsullikda interviewga vaqt band qilinadi.
4. Hujjatlar bilan intervyuga boriladi.
5. Biometrik ma'lumotlar olinadi.
6. Qaror bir necha kundan bir necha haftagacha beriladi.
    `.trim(),
  },
  {
    country: 'USA',
    visaType: 'tourist',
    section: 'refusal_reasons',
    content: `
Rad etish sabablari:
- Yetarli moliyaviy asos yo'qligi.
- Vatanga qaytish bog'liqligi yetarli isbotlanmagan (ish, oila, o'qish).
- Noto'g'ri yoki soxta ma'lumot.
- Immigratsion risk (qolib ketish xavfi).
- Oldingi immigratsion qoidabuzarliklar.
    `.trim(),
  },
  {
    country: 'USA',
    visaType: 'student',
    section: 'eligibility',
    content: `
Talabalar uchun:
- Qabul qilingan o'quv muassasasi (I-20 hujjati).
- Uzluksiz o'qish maqsadi, immigratsion niyat emasligi.
- O'qish va yashash xarajatlarini qoplaydigan mablag'.
- SEVIS to'lovi to'langan bo'lishi kerak.
    `.trim(),
  },
  {
    country: 'USA',
    visaType: 'student',
    section: 'documents',
    content: `
CRITICAL TERMINOLOGY RULE: USA student visas use "Form I-20" (for F-1) or "DS-2019" (for J-1 exchange programs). This is US-specific and should NOT be used for other countries.

Talabalar uchun hujjatlar (8-15 items recommended):
1. Form I-20 (Certificate of Eligibility for Nonimmigrant Student Status) - o'quv muassasasi tomonidan beriladi, F-1 talabalar uchun.
2. DS-2019 (Certificate of Eligibility for Exchange Visitor Status) - agar J-1 exchange dasturida bo'lsa.
3. SEVIS fee payment receipt (I-901) - SEVIS to'lovi kvitansiyasi, I-20 yoki DS-2019 dan oldin to'lanishi kerak.
4. DS-160 formasi - onlayn to'ldirilgan va tasdiqlangan nonimmigrant visa application form.
5. DS-160 confirmation page - interview uchun kerak.
6. MRV fee receipt - visa application to'lovi kvitansiyasi.
7. Pasport - kamida 6 oy muddati qolgan, kamida 2 bo'sh sahifa.
8. Passport photos - 5x5 cm, US specifications ga mos kelishi kerak.
9. Bank statement (so'nggi 6-12 oy) - o'qish va yashash xarajatlarini qoplaydigan mablag' isboti.
10. Homiylik xati (sponsor letter) - agar ota-ona yoki boshqa shaxs homiy bo'lsa.
11. Homiydan bank statement va employment letter - agar homiylik mavjud bo'lsa.
12. Ta'lim hujjatlari (diplomlar, transkriptlar, attestatlar) - notarial tasdiqlangan yoki apostille bilan.
13. Til sertifikati (TOEFL, IELTS yoki boshqa) - agar talab qilinsa.
14. Proof of ties to Uzbekistan - mulk hujjatlari, ish joyidan ma'lumotnoma, oila hujjatlari, vatanga qaytish niyatini ko'rsatuvchi hujjatlar.
15. Travel itinerary yoki flight reservation (agar mavjud bo'lsa).

USA-specific: Always use "Form I-20" terminology, not "LOA" or generic "acceptance letter".
    `.trim(),
  },
  {
    country: 'USA',
    visaType: 'student',
    section: 'finance',
    content: `
Moliyaviy talablar:
- I-20 hujjatida ko'rsatilgan o'qish va yashash xarajatlarini qoplaydigan mablag'.
- Bank statement, homiylik xati yoki scholarship hujjatlari.
- Mablag' so'nggi 6-12 oy davomida mavjud bo'lishi kerak.
    `.trim(),
  },
  {
    country: 'USA',
    visaType: 'student',
    section: 'application_process',
    content: `
Ariza berish jarayoni:
1. I-20 hujjati olinadi (o'quv muassasasidan).
2. SEVIS to'lovi to'lanadi.
3. DS-160 formasi to'ldiriladi.
4. Konsullikda intervyuga vaqt band qilinadi.
5. Hujjatlar bilan intervyuga boriladi.
6. I-20 dagi ma'lumotlarga mos kelishi tekshiriladi.
7. Qaror bir necha kundan bir necha haftagacha beriladi.
    `.trim(),
  },
  {
    country: 'USA',
    visaType: 'student',
    section: 'refusal_reasons',
    content: `
Rad etish sabablari:
- Moliyaviy isbot yetarli emas.
- O'qish rejasining ishonarsizligi.
- Noto'g'ri ma'lumot yoki soxta hujjatlar.
- Immigratsion niyat shubhasi.
- Til yoki ta'lim talablariga javob bermaslik.
    `.trim(),
  },
];

// Canada Visa Rules
const CANADA_VISA_RULES: VisaKbEntry[] = [
  {
    country: 'Canada',
    visaType: 'tourist',
    section: 'eligibility',
    content: `
- Qisqa muddatli tashrif maqsadi (turizm, qarindoshlarni ko'rish).
- Vatanga qaytish bog'liqligi (ish, oila, o'qish).
- Immigratsion risk bo'lmasligi.
- Visitor visa yoki eTA (elektron ruxsat) talab qilinadi.
    `.trim(),
  },
  {
    country: 'Canada',
    visaType: 'tourist',
    section: 'documents',
    content: `
Asosiy hujjatlar:
1. Pasport (kamida 6 oy muddat qolgan).
2. Ariza formasi (onlayn yoki qog'oz).
3. Bank statement (so'nggi 3-6 oy).
4. Ish joyidan ma'lumotnoma.
5. Travel history (oldingi vizalar va safarlar).
6. Safar rejasi va mehmonxona bron.
7. Biometrik ma'lumotlar (agar talab qilinsa).
    `.trim(),
  },
  {
    country: 'Canada',
    visaType: 'tourist',
    section: 'finance',
    content: `
Moliyaviy talablar:
- Safar va yashash xarajatlarini qoplaydigan mablag'.
- Bank statement, ish joyidan ma'lumotnoma yoki homiylik xati.
- Konsullik aniq minimal summani ko'rsatmaydi, lekin safar xarajatlarini qoplash yetarli bo'lishi kerak.
    `.trim(),
  },
  {
    country: 'Canada',
    visaType: 'tourist',
    section: 'application_process',
    content: `
Ariza berish jarayoni:
1. Onlayn ariza to'ldiriladi.
2. To'lov qilinadi.
3. Biometrik ma'lumotlar olinadi (VAC markazida).
4. Kerak bo'lsa, medical tekshiruv o'tkaziladi.
5. Hujjatlar yuboriladi yoki shaxsan topshiriladi.
6. Qaror bir necha haftadan bir necha oygacha beriladi.
    `.trim(),
  },
  {
    country: 'Canada',
    visaType: 'tourist',
    section: 'refusal_reasons',
    content: `
Rad etish sabablari:
- Moliyaviy yetarli bo'lmasligi.
- Immigratsion risk (qolib ketish xavfi).
- Hujjatdagi ziddiyatlar yoki nomuvofiqlik.
- Vatanga qaytish bog'liqligi yetarli isbotlanmagan.
- Oldingi immigratsion qoidabuzarliklar.
    `.trim(),
  },
  {
    country: 'Canada',
    visaType: 'student',
    section: 'eligibility',
    content: `
Talabalar uchun:
- DLI (Designated Learning Institution) qabul xati.
- O'qish va yashash xarajatlarini qoplaydigan mablag'.
- GIC (Guaranteed Investment Certificate) yoki boshqa moliyaviy isbot.
- Til sertifikati (agar talab qilinsa).
    `.trim(),
  },
  {
    country: 'Canada',
    visaType: 'student',
    section: 'documents',
    content: `
CRITICAL TERMINOLOGY RULE: Canada study permits use "Letter of Acceptance (LOA) from a Designated Learning Institution (DLI)". NEVER use "I-20" or "Form I-20" for Canada - that is US-specific terminology.

Talabalar uchun hujjatlar (8-15 items recommended):
1. Letter of Acceptance (LOA) from a Designated Learning Institution (DLI) – rasmiy qabul xati bo'lib, dastur nomi, boshlanish sanasi, DLI raqami va talaba ID ni ko'rsatadi. Kanadada hech qachon "I-20" deb atalmaydi.
2. O'qish to'lovi kvitansiyasi yoki to'lov jadvali (tuition payment receipt or payment schedule).
3. Bank statement (so'nggi 4 oy) - o'qish va yashash xarajatlarini qoplaydigan mablag' isboti.
4. GIC (Guaranteed Investment Certificate) hujjati - agar talab qilinsa, kamida 10,000 CAD.
5. Homiylik xati (sponsor letter) - agar ota-ona yoki boshqa shaxs homiy bo'lsa, ularning moliyaviy hujjatlari bilan birga.
6. Homiydan bank statement - agar homiylik mavjud bo'lsa.
7. Til sertifikati (IELTS, TOEFL, CELPIP yoki konsullik ko'rsatgan boshqa test).
8. Ta'lim hujjatlari (diplomlar, transkriptlar, attestatlar) - apostille yoki notarial tasdiqlangan.
9. Study plan / Statement of Purpose - ta'lim maqsadini, rejasini va vatanga qaytish niyatini tushuntiruvchi eslatma.
10. Passport va passport photos (biometric specifications).
11. Medical examination certificate - agar talab qilinsa.
12. Police clearance certificate - agar talab qilinsa.
13. Proof of ties to Uzbekistan - mulk hujjatlari, ish joyidan ma'lumotnoma, oila hujjatlari.
14. Travel itinerary yoki flight reservation (agar mavjud bo'lsa).
15. Accommodation proof - yashash joyi isboti (agar mavjud bo'lsa).

DO NOT mention I-20 for Canada. Always use LOA from DLI terminology.
    `.trim(),
  },
  {
    country: 'Canada',
    visaType: 'student',
    section: 'finance',
    content: `
Moliyaviy talablar:
- GIC (10,000 CAD yoki undan ko'p) yoki o'qish+yashash xarajatlarini qoplaydigan mablag'.
- Bank statement (so'nggi 4 oy).
- Homiylik xati va homiydan bank statement (agar bor bo'lsa).
- Konsullik aniq minimal summani ko'rsatadi, lekin u o'zgarishi mumkin.
    `.trim(),
  },
  {
    country: 'Canada',
    visaType: 'student',
    section: 'application_process',
    content: `
Ariza berish jarayoni:
1. DLI qabul xati olinadi.
2. GIC ochiladi yoki moliyaviy isbot tayyorlanadi.
3. Onlayn ariza to'ldiriladi.
4. To'lov qilinadi.
5. Biometrik ma'lumotlar olinadi.
6. Medical tekshiruv o'tkaziladi (agar talab qilinsa).
7. Hujjatlar yuboriladi.
8. Qaror bir necha haftadan bir necha oygacha beriladi.
    `.trim(),
  },
  {
    country: 'Canada',
    visaType: 'student',
    section: 'refusal_reasons',
    content: `
Rad etish sabablari:
- Study plan ishonarsiz yoki noto'g'ri.
- Moliyaviy yetishmovchilik.
- Hujjatlar orasida nomuvofiqlik.
- Immigratsion risk (qolib ketish xavfi).
- Til yoki ta'lim talablariga javob bermaslik.
    `.trim(),
  },
];

// Australia Visa Rules
const AUSTRALIA_VISA_RULES: VisaKbEntry[] = [
  {
    country: 'Australia',
    visaType: 'tourist',
    section: 'eligibility',
    content: `
- Qisqa muddatli tashrif maqsadi (turizm, qarindoshlarni ko'rish).
- Vatanga qaytish asoslari (ish, oila, mulk).
- Immigratsion risk bo'lmasligi.
- Visitor visa (subclass 600) talab qilinadi.
    `.trim(),
  },
  {
    country: 'Australia',
    visaType: 'tourist',
    section: 'documents',
    content: `
Asosiy hujjatlar:
1. Pasport (kamida 6 oy muddat qolgan).
2. Onlayn ariza (ImmiAccount orqali).
3. Travel history (oldingi vizalar va safarlar).
4. Bank statement (so'nggi 3-6 oy).
5. Ish joyidan ma'lumotnoma yoki biznes hujjatlari.
6. Safar rejasi va mehmonxona bron.
7. Sug'urta tavsiya (ba'zi hollarda).
    `.trim(),
  },
  {
    country: 'Australia',
    visaType: 'tourist',
    section: 'finance',
    content: `
Moliyaviy talablar:
- Safar va yashash xarajatlarini qoplaydigan mablag'.
- Bank statement, ish joyidan ma'lumotnoma yoki homiylik xati.
- Konsullik aniq minimal summani ko'rsatmaydi, lekin safar xarajatlarini qoplash yetarli bo'lishi kerak.
    `.trim(),
  },
  {
    country: 'Australia',
    visaType: 'tourist',
    section: 'application_process',
    content: `
Ariza berish jarayoni:
1. ImmiAccount yaratiladi.
2. Onlayn ariza to'ldiriladi.
3. To'lov qilinadi.
4. Hujjatlar yuklanadi.
5. Biometrik ma'lumotlar olinadi (agar talab qilinsa).
6. Qaror bir necha kundan bir necha haftagacha beriladi.
    `.trim(),
  },
  {
    country: 'Australia',
    visaType: 'tourist',
    section: 'refusal_reasons',
    content: `
Rad etish sabablari:
- Tashrif maqsadi ishonarsiz.
- Vatanga qaytish asoslari yetarli emas.
- Moliyaviy yetishmaslik.
- Immigratsion risk.
- Oldingi immigratsion qoidabuzarliklar.
    `.trim(),
  },
  {
    country: 'Australia',
    visaType: 'student',
    section: 'eligibility',
    content: `
Talabalar uchun:
- COE (Confirmation of Enrolment) hujjati.
- OSHC (Overseas Student Health Cover) sug'urtasi.
- O'qish va yashash xarajatlarini qoplaydigan mablag'.
- GTE (Genuine Temporary Entrant) tushuntiruvchi xat.
- Til sertifikati (agar talab qilinsa).
    `.trim(),
  },
  {
    country: 'Australia',
    visaType: 'student',
    section: 'documents',
    content: `
Talabalar uchun hujjatlar:
1. COE hujjati (o'quv muassasasidan).
2. OSHC sug'urta polisi.
3. Bank statement yoki homiylik xati.
4. GTE xati (o'qish maqsadi va vatanga qaytish niyati).
5. Til sertifikati (IELTS, TOEFL yoki boshqa).
6. Ta'lim hujjatlari (diplomlar, transkriptlar).
7. Pasport va surat.
    `.trim(),
  },
  {
    country: 'Australia',
    visaType: 'student',
    section: 'finance',
    content: `
Moliyaviy talablar:
- O'qish va yashash xarajatlarini qoplaydigan mablag'.
- Bank statement (so'nggi 3-6 oy).
- Homiylik xati va homiydan bank statement (agar bor bo'lsa).
- Konsullik aniq minimal summani ko'rsatadi, lekin u o'zgarishi mumkin.
    `.trim(),
  },
  {
    country: 'Australia',
    visaType: 'student',
    section: 'application_process',
    content: `
Ariza berish jarayoni:
1. COE hujjati olinadi.
2. OSHC sug'urtasi olinadi.
3. GTE xati tayyorlanadi.
4. ImmiAccount orqali onlayn ariza to'ldiriladi.
5. To'lov qilinadi.
6. Hujjatlar yuklanadi.
7. Biometrik ma'lumotlar olinadi.
8. Medical tekshiruv o'tkaziladi (agar talab qilinsa).
9. Qaror bir necha haftadan bir necha oygacha beriladi.
    `.trim(),
  },
  {
    country: 'Australia',
    visaType: 'student',
    section: 'refusal_reasons',
    content: `
Rad etish sabablari:
- GTE ishontirmasligi (o'qish maqsadi shubhali).
- Moliyaviy yetishmaslik.
- Til yoki ta'lim talablariga javob bermaslik.
- Hujjatlar bo'yicha shubha.
- Immigratsion risk.
    `.trim(),
  },
];

// United Kingdom Visa Rules
const UK_VISA_RULES: VisaKbEntry[] = [
  {
    country: 'United Kingdom',
    visaType: 'tourist',
    section: 'eligibility',
    content: `
- Qisqa muddatli safar maqsadi (turizm, qarindoshlarni ko'rish).
- Immigratsion niyat emasligi.
- Vatanga qaytish bog'liqligi (ish, oila, o'qish).
- Standard Visitor visa talab qilinadi.
    `.trim(),
  },
  {
    country: 'United Kingdom',
    visaType: 'tourist',
    section: 'documents',
    content: `
Asosiy hujjatlar:
1. Pasport (kamida 6 oy muddat qolgan).
2. Ariza formasi (onlayn).
3. Travel plan va mehmonxona bron.
4. Bank statement (so'nggi 3-6 oy).
5. Ish joyidan ma'lumotnoma yoki tadbirkorlik hujjatlari.
6. Safar rejasi.
7. Biometrik ma'lumotlar (VAC markazida).
    `.trim(),
  },
  {
    country: 'United Kingdom',
    visaType: 'tourist',
    section: 'finance',
    content: `
Moliyaviy talablar:
- Safar va yashash xarajatlarini qoplaydigan mablag'.
- Bank statement, ish joyidan ma'lumotnoma yoki homiylik xati.
- Konsullik aniq minimal summani ko'rsatmaydi, lekin safar xarajatlarini qoplash yetarli bo'lishi kerak.
    `.trim(),
  },
  {
    country: 'United Kingdom',
    visaType: 'tourist',
    section: 'application_process',
    content: `
Ariza berish jarayoni:
1. Onlayn ariza to'ldiriladi.
2. To'lov qilinadi.
3. Biometrik ma'lumotlar olinadi (VAC markazida).
4. Hujjatlar yuboriladi yoki shaxsan topshiriladi.
5. Ba'zan intervyu talab qilinadi.
6. Qaror bir necha kundan bir necha haftagacha beriladi.
    `.trim(),
  },
  {
    country: 'United Kingdom',
    visaType: 'tourist',
    section: 'refusal_reasons',
    content: `
Rad etish sabablari:
- Moliyaviy yetishmaslik.
- Immigratsion risk.
- Vatanga qaytish bog'liqligi yetarli emas.
- Hujjatdagi ziddiyatlar.
- Oldingi immigratsion qoidabuzarliklar.
    `.trim(),
  },
  {
    country: 'United Kingdom',
    visaType: 'student',
    section: 'eligibility',
    content: `
Talabalar uchun:
- CAS (Confirmation of Acceptance for Studies) hujjati.
- O'qish va yashash xarajatlarini qoplaydigan mablag'.
- Til talablari (IELTS yoki boshqa).
- ATAS (Academic Technology Approval Scheme) agar talab qilinsa.
    `.trim(),
  },
  {
    country: 'United Kingdom',
    visaType: 'student',
    section: 'documents',
    content: `
Talabalar uchun hujjatlar:
1. CAS hujjati (o'quv muassasasidan).
2. Til sertifikati (IELTS yoki boshqa).
3. Bank statement (o'qish va yashash xarajatlari uchun).
4. Ta'lim hujjatlari (diplomlar, transkriptlar).
5. ATAS hujjati (agar talab qilinsa).
6. Pasport va surat.
7. Medical tekshiruv hujjati (agar talab qilinsa).
    `.trim(),
  },
  {
    country: 'United Kingdom',
    visaType: 'student',
    section: 'finance',
    content: `
Moliyaviy talablar:
- O'qish va yashash xarajatlarini qoplaydigan mablag'.
- Bank statement (so'nggi 28 kun).
- Homiylik xati va homiydan bank statement (agar bor bo'lsa).
- Konsullik aniq minimal summani ko'rsatadi, lekin u o'zgarishi mumkin.
    `.trim(),
  },
  {
    country: 'United Kingdom',
    visaType: 'student',
    section: 'application_process',
    content: `
Ariza berish jarayoni:
1. CAS hujjati olinadi.
2. Til sertifikati olinadi (agar talab qilinsa).
3. ATAS hujjati olinadi (agar talab qilinsa).
4. Onlayn ariza to'ldiriladi.
5. To'lov qilinadi.
6. Biometrik ma'lumotlar olinadi.
7. Hujjatlar yuboriladi.
8. Intervyu ehtimoli.
9. Qaror bir necha haftadan bir necha oygacha beriladi.
    `.trim(),
  },
  {
    country: 'United Kingdom',
    visaType: 'student',
    section: 'refusal_reasons',
    content: `
Rad etish sabablari:
- CAS bilan mos kelmaslik.
- Moliyaviy yetmaganligi.
- Study planning ishonarsizligi.
- Til yoki ta'lim talablariga javob bermaslik.
- Immigratsion risk.
    `.trim(),
  },
];

// New Zealand Visa Rules
const NEW_ZEALAND_VISA_RULES: VisaKbEntry[] = [
  {
    country: 'New Zealand',
    visaType: 'tourist',
    section: 'eligibility',
    content: `
- Qisqa muddatli tashrif maqsadi (turizm, qarindoshlarni ko'rish).
- Vatanga qaytish bog'liqligi (ish, oila, o'qish).
- Immigratsion risk bo'lmasligi.
- Visitor visa talab qilinadi.
    `.trim(),
  },
  {
    country: 'New Zealand',
    visaType: 'tourist',
    section: 'documents',
    content: `
Asosiy hujjatlar:
1. Pasport (kamida 3 oy muddat qolgan).
2. Ariza formasi (onlayn).
3. Travel plan va mehmonxona bron.
4. Bank statement (so'nggi 3-6 oy).
5. Ish joyidan ma'lumotnoma.
6. Safar rejasi.
7. Sug'urta tavsiya.
8. Biometrik ma'lumotlar (agar talab qilinsa).
    `.trim(),
  },
  {
    country: 'New Zealand',
    visaType: 'tourist',
    section: 'finance',
    content: `
Moliyaviy talablar:
- Safar va yashash xarajatlarini qoplaydigan mablag'.
- Bank statement, ish joyidan ma'lumotnoma yoki homiylik xati.
- Konsullik aniq minimal summani ko'rsatmaydi, lekin safar xarajatlarini qoplash yetarli bo'lishi kerak.
    `.trim(),
  },
  {
    country: 'New Zealand',
    visaType: 'tourist',
    section: 'application_process',
    content: `
Ariza berish jarayoni:
1. Onlayn ariza to'ldiriladi.
2. To'lov qilinadi.
3. Hujjatlar yuklanadi.
4. Biometrik ma'lumotlar olinadi (agar talab qilinsa).
5. Qaror bir necha kundan bir necha haftagacha beriladi.
    `.trim(),
  },
  {
    country: 'New Zealand',
    visaType: 'tourist',
    section: 'refusal_reasons',
    content: `
Rad etish sabablari:
- Moliyaviy yetishmaslik.
- Immigratsion risk.
- Vatanga qaytish bog'liqligi yetarli emas.
- Hujjatdagi ziddiyatlar.
- Oldingi immigratsion qoidabuzarliklar.
    `.trim(),
  },
  {
    country: 'New Zealand',
    visaType: 'student',
    section: 'eligibility',
    content: `
Talabalar uchun:
- Qabul xati (o'quv muassasasidan).
- O'qish va yashash xarajatlarini qoplaydigan mablag'.
- Til sertifikati (agar talab qilinsa).
    `.trim(),
  },
  {
    country: 'New Zealand',
    visaType: 'student',
    section: 'documents',
    content: `
Talabalar uchun hujjatlar:
1. Qabul xati (o'quv muassasasidan).
2. To'lov kvitansiyasi.
3. Bank statement (o'qish va yashash xarajatlari uchun).
4. Til sertifikati (agar talab qilinsa).
5. Ta'lim hujjatlari (diplomlar, transkriptlar).
6. Pasport va surat.
7. Medical tekshiruv hujjati (agar talab qilinsa).
    `.trim(),
  },
  {
    country: 'New Zealand',
    visaType: 'student',
    section: 'finance',
    content: `
Moliyaviy talablar:
- O'qish va yashash xarajatlarini qoplaydigan mablag'.
- Bank statement (so'nggi 3-6 oy).
- Homiylik xati va homiydan bank statement (agar bor bo'lsa).
- Konsullik aniq minimal summani ko'rsatadi, lekin u o'zgarishi mumkin.
    `.trim(),
  },
  {
    country: 'New Zealand',
    visaType: 'student',
    section: 'application_process',
    content: `
Ariza berish jarayoni:
1. Qabul xati olinadi.
2. To'lov qilinadi.
3. Onlayn ariza to'ldiriladi.
4. Hujjatlar yuklanadi.
5. Medical tekshiruv o'tkaziladi (agar talab qilinsa).
6. Biometrik ma'lumotlar olinadi (agar talab qilinsa).
7. Qaror bir necha haftadan bir necha oygacha beriladi.
    `.trim(),
  },
  {
    country: 'New Zealand',
    visaType: 'student',
    section: 'refusal_reasons',
    content: `
Rad etish sabablari:
- Moliyaviy yetishmaslik.
- O'qish rejasi ishonarsiz.
- Til yoki ta'lim talablariga javob bermaslik.
- Immigratsion risk.
- Hujjatdagi ziddiyatlar.
    `.trim(),
  },
];

// Japan Visa Rules
const JAPAN_VISA_RULES: VisaKbEntry[] = [
  {
    country: 'Japan',
    visaType: 'tourist',
    section: 'eligibility',
    content: `
- Qisqa muddatli tashrif maqsadi (turizm, qarindoshlarni ko'rish).
- Vatanga qaytish bog'liqligi (ish, oila, o'qish).
- Immigratsion risk bo'lmasligi.
- Short-term visitor visa talab qilinadi.
    `.trim(),
  },
  {
    country: 'Japan',
    visaType: 'tourist',
    section: 'documents',
    content: `
Asosiy hujjatlar:
1. Pasport (kamida 6 oy muddat qolgan).
2. Ariza formasi.
3. Biometrik surat.
4. Ish joyidan ma'lumotnoma.
5. Bank statement (so'nggi 3-6 oy).
6. Travel itinerary (safar rejasi).
7. Mehmonxona bron yoki taklif xati.
8. Garantor bo'lsa, u bilan bog'liq hujjatlar.
    `.trim(),
  },
  {
    country: 'Japan',
    visaType: 'tourist',
    section: 'finance',
    content: `
Moliyaviy talablar:
- Safar va yashash xarajatlarini qoplaydigan mablag'.
- Bank statement, ish joyidan ma'lumotnoma yoki garantor hujjatlari.
- Konsullik aniq minimal summani ko'rsatmaydi, lekin safar xarajatlarini qoplash yetarli bo'lishi kerak.
    `.trim(),
  },
  {
    country: 'Japan',
    visaType: 'tourist',
    section: 'application_process',
    content: `
Ariza berish jarayoni:
1. Vize markazi yoki elchixona orqali ariza beriladi.
2. Ariza formasi to'ldiriladi.
3. Hujjatlar tayyorlanadi.
4. Shaxsan topshiriladi yoki vize markaziga yuboriladi.
5. Qaror bir necha kundan bir necha haftagacha beriladi.
    `.trim(),
  },
  {
    country: 'Japan',
    visaType: 'tourist',
    section: 'refusal_reasons',
    content: `
Rad etish sabablari:
- Moliyaviy yetishmaslik.
- Immigratsion risk.
- Vatanga qaytish bog'liqligi yetarli emas.
- Hujjatdagi ziddiyatlar.
- Oldingi immigratsion qoidabuzarliklar.
    `.trim(),
  },
  {
    country: 'Japan',
    visaType: 'student',
    section: 'eligibility',
    content: `
Talabalar uchun:
- COE (Certificate of Eligibility) hujjati.
- Qabul xati (o'quv muassasasidan).
- O'qish va yashash xarajatlarini qoplaydigan mablag'.
- Ta'lim tarixi (diplomlar, transkriptlar).
    `.trim(),
  },
  {
    country: 'Japan',
    visaType: 'student',
    section: 'documents',
    content: `
Talabalar uchun hujjatlar:
1. COE hujjati (o'quv muassasasi tomonidan olinadi).
2. Qabul xati.
3. Bank statement (o'qish va yashash xarajatlari uchun).
4. Ta'lim hujjatlari (diplomlar, transkriptlar).
5. Pasport va surat.
6. Medical tekshiruv hujjati (agar talab qilinsa).
    `.trim(),
  },
  {
    country: 'Japan',
    visaType: 'student',
    section: 'finance',
    content: `
Moliyaviy talablar:
- O'qish va yashash xarajatlarini qoplaydigan mablag'.
- Bank statement (so'nggi 3-6 oy).
- Homiylik xati va homiydan bank statement (agar bor bo'lsa).
- Konsullik aniq minimal summani ko'rsatadi, lekin u o'zgarishi mumkin.
    `.trim(),
  },
  {
    country: 'Japan',
    visaType: 'student',
    section: 'application_process',
    content: `
Ariza berish jarayoni:
1. Qabul xati olinadi.
2. COE hujjati olinadi (o'quv muassasasi tomonidan).
3. Elchixonaga COE asosida student vizaga murojaat qilinadi.
4. Hujjatlar tayyorlanadi va topshiriladi.
5. Qaror bir necha haftadan bir necha oygacha beriladi.
    `.trim(),
  },
  {
    country: 'Japan',
    visaType: 'student',
    section: 'refusal_reasons',
    content: `
Rad etish sabablari:
- COE bilan mos kelmaslik.
- Moliyaviy yetishmaslik.
- Ta'lim tarixi yoki o'qish rejasi ishonarsiz.
- Immigratsion risk.
- Hujjatdagi ziddiyatlar.
    `.trim(),
  },
];

// South Korea Visa Rules
const SOUTH_KOREA_VISA_RULES: VisaKbEntry[] = [
  {
    country: 'South Korea',
    visaType: 'tourist',
    section: 'eligibility',
    content: `
- Qisqa muddatli tashrif maqsadi (turizm, qarindoshlarni ko'rish).
- Vatanga qaytish bog'liqligi (ish, oila, o'qish).
- Immigratsion risk bo'lmasligi.
- Short-term visitor visa talab qilinadi.
    `.trim(),
  },
  {
    country: 'South Korea',
    visaType: 'tourist',
    section: 'documents',
    content: `
Asosiy hujjatlar:
1. Pasport (kamida 6 oy muddat qolgan).
2. Ariza formasi.
3. Ish joyidan ma'lumotnoma yoki biznes hujjatlari.
4. Bank statement (so'nggi 3-6 oy).
5. Travel plan va mehmonxona bron.
6. Biometrik ma'lumotlar (agar talab qilinsa).
    `.trim(),
  },
  {
    country: 'South Korea',
    visaType: 'tourist',
    section: 'finance',
    content: `
Moliyaviy talablar:
- Safar va yashash xarajatlarini qoplaydigan mablag'.
- Bank statement, ish joyidan ma'lumotnoma yoki homiylik xati.
- Konsullik aniq minimal summani ko'rsatmaydi, lekin safar xarajatlarini qoplash yetarli bo'lishi kerak.
    `.trim(),
  },
  {
    country: 'South Korea',
    visaType: 'tourist',
    section: 'application_process',
    content: `
Ariza berish jarayoni:
1. Elchixona yoki vize markaziga murojaat qilinadi.
2. Ariza formasi to'ldiriladi.
3. Hujjatlar tayyorlanadi.
4. Shaxsan topshiriladi yoki yuboriladi.
5. Biometrik ma'lumotlar olinadi (agar talab qilinsa).
6. Intervyu ehtimoli (mamlakat qoidalariga qarab).
7. Qaror bir necha kundan bir necha haftagacha beriladi.
    `.trim(),
  },
  {
    country: 'South Korea',
    visaType: 'tourist',
    section: 'refusal_reasons',
    content: `
Rad etish sabablari:
- Moliyaviy yetishmaslik.
- Immigratsion risk.
- Vatanga qaytish bog'liqligi yetarli emas.
- Hujjatdagi ziddiyatlar.
- Oldingi immigratsion qoidabuzarliklar.
    `.trim(),
  },
  {
    country: 'South Korea',
    visaType: 'student',
    section: 'eligibility',
    content: `
Talabalar uchun:
- Qabul xati (o'quv muassasasidan).
- O'qish va yashash xarajatlarini qoplaydigan mablag'.
- D-2 (university) yoki D-4 (language course) vizalar konsepsiyasi.
- Ta'lim hujjatlari.
    `.trim(),
  },
  {
    country: 'South Korea',
    visaType: 'student',
    section: 'documents',
    content: `
Talabalar uchun hujjatlar:
1. Qabul xati (o'quv muassasasidan).
2. To'lov kvitansiyasi.
3. Bank statement (o'qish va yashash xarajatlari uchun).
4. Ta'lim hujjatlari (diplomlar, transkriptlar).
5. Pasport va surat.
6. Medical tekshiruv hujjati (agar talab qilinsa).
    `.trim(),
  },
  {
    country: 'South Korea',
    visaType: 'student',
    section: 'finance',
    content: `
Moliyaviy talablar:
- O'qish va yashash xarajatlarini qoplaydigan mablag'.
- Bank statement (so'nggi 3-6 oy).
- Homiylik xati va homiydan bank statement (agar bor bo'lsa).
- Konsullik aniq minimal summani ko'rsatadi, lekin u o'zgarishi mumkin.
    `.trim(),
  },
  {
    country: 'South Korea',
    visaType: 'student',
    section: 'application_process',
    content: `
Ariza berish jarayoni:
1. Qabul xati olinadi.
2. To'lov qilinadi.
3. Hujjatlar tayyorlanadi.
4. Elchixonaga topshiriladi.
5. Qaror bir necha haftadan bir necha oygacha beriladi.
    `.trim(),
  },
  {
    country: 'South Korea',
    visaType: 'student',
    section: 'refusal_reasons',
    content: `
Rad etish sabablari:
- Moliyaviy yetishmaslik.
- O'qish rejasi ishonarsiz.
- Ta'lim hujjatlari yetarli emas.
- Immigratsion risk.
- Hujjatdagi ziddiyatlar.
    `.trim(),
  },
];

// Germany Visa Rules
const GERMANY_VISA_RULES: VisaKbEntry[] = [
  {
    country: 'Germany',
    visaType: 'tourist',
    section: 'eligibility',
    content: `
- Qisqa muddatli sayohat maqsadi (turizm, qarindoshlarni ko'rish, qisqa muddatli biznes).
- Intended stay is up to 90 days in any 180-day period (Schengen short-stay).
- Immigratsion niyat bo'lmasligi.
- Valid passport, travel insurance, and sufficient funds.
    `.trim(),
  },
  {
    country: 'Germany',
    visaType: 'tourist',
    section: 'documents',
    content: `
CRITICAL SCHENGEN REQUIREMENTS: Germany is a Schengen country. All Schengen tourist visas require travel health insurance covering at least 30,000 EUR and proof of accommodation.

Asosiy hujjatlar (8-15 items recommended):
1. Pasport (kamida 3 oy muddat qolgan, 2+ bo'sh sahifa, issued within last 10 years).
2. Schengen visa application form - to'ldirilgan va imzolangan.
3. Biometrik surat (passport-size, Schengen specifications ga mos).
4. Travel health insurance - kamida 30,000 EUR qoplama, butun Schengen bo'ylab amal qilishi kerak (CRITICAL for Schengen).
5. Proof of accommodation - mehmonxona bron, Airbnb, taklif xati yoki boshqa yashash joyi isboti (CRITICAL for Schengen).
6. Round-trip flight reservation yoki aviabilet bron - butun safar davri uchun.
7. Bank statement (so'nggi 3-6 oy) - safar xarajatlarini qoplaydigan mablag' isboti.
8. Ish joyidan ma'lumotnoma yoki tadbirkorlik hujjatlari - vatanga qaytish bog'liqligini ko'rsatadi.
9. Proof of ties to home country - mulk hujjatlari, oila hujjatlari, ish shartnomasi.
10. Travel itinerary - batafsil safar rejasi (qaysi shaharlar, qancha vaqt).
11. Invitation letter - agar qarindosh yoki do'st taklif qilgan bo'lsa.
12. Sponsor financial documents - agar homiylik mavjud bo'lsa.
13. Previous visa copies - agar oldingi Schengen yoki boshqa vizalar bo'lsa (ijobiy omil).
14. Employment verification letter - ish beruvchidan rasmiy ma'lumotnoma.
15. Cover letter - safar maqsadini tushuntiruvchi eslatma (ixtiyoriy, lekin tavsiya etiladi).

Schengen-specific: Always include travel health insurance (minimum 30,000 EUR coverage) and accommodation proof.
    `.trim(),
  },
  {
    country: 'Germany',
    visaType: 'tourist',
    section: 'finance',
    content: `
Moliyaviy talablar:
- Safar xarajatlarini qoplaydigan mablag' (aviabilet, yashash, kundalik xarajatlar).
- Bank statement, ish joyidan ma'lumotnoma yoki homiylik xati.
- Ba'zi konsulliklar kunlik minimal summani qo'llaydi; aniq miqdorni rasmiy manbalardan tekshirish kerak.
    `.trim(),
  },
  {
    country: 'Germany',
    visaType: 'tourist',
    section: 'application_process',
    content: `
Ariza berish jarayoni:
1. VFS yoki elchixona orqali ariza beriladi.
2. Onlayn yoki qog'oz ariza formasi to'ldiriladi.
3. VFS yoki elchixonada vaqt band qilinadi.
4. Hujjatlar bilan shaxsan boriladi.
5. Biometrik ma'lumotlar olinadi.
6. Qaror odatda 15 kalendar kun ichida, lekin uzoqroq bo'lishi mumkin.
    `.trim(),
  },
  {
    country: 'Germany',
    visaType: 'tourist',
    section: 'refusal_reasons',
    content: `
Rad etish sabablari:
- Moliyaviy yetishmaslik.
- Sayohat maqsadi ishonarsiz.
- Soxta hujjatlar.
- Immigratsion risk.
- Oldingi Schengen qoidabuzarliklari.
    `.trim(),
  },
  {
    country: 'Germany',
    visaType: 'student',
    section: 'eligibility',
    content: `
Talabalar uchun:
- Qabul xati (university, Studienkolleg, til kursi).
- O'qish va yashash xarajatlarini qoplaydigan mablag'.
- Bloklangan hisob (Sperrkonto) yoki moliyaviy homiylik.
- Sug'urta, yashash joyi, ta'lim hujjatlari.
- Til sertifikati (agar talab qilinsa).
    `.trim(),
  },
  {
    country: 'Germany',
    visaType: 'student',
    section: 'documents',
    content: `
Talabalar uchun hujjatlar:
1. Qabul xati (o'quv muassasasidan).
2. Bloklangan hisob (Sperrkonto) yoki moliyaviy homiylik hujjati.
3. Sug'urta hujjati.
4. Yashash joyi tasdig'i (yotoqxona yoki ijara shartnomasi).
5. Ta'lim hujjatlari (diplomlar, transkriptlar).
6. Til sertifikati (agar talab qilinsa).
7. Pasport va surat.
    `.trim(),
  },
  {
    country: 'Germany',
    visaType: 'student',
    section: 'finance',
    content: `
Moliyaviy talablar:
- Bloklangan hisob (Sperrkonto) yoki o'qish va yashash xarajatlarini qoplaydigan mablag'.
- Bank statement (so'nggi 3-6 oy).
- Homiylik xati va homiydan bank statement (agar bor bo'lsa).
- Konsullik aniq minimal summani ko'rsatadi, lekin u o'zgarishi mumkin.
    `.trim(),
  },
  {
    country: 'Germany',
    visaType: 'student',
    section: 'application_process',
    content: `
Ariza berish jarayoni:
1. Qabul xati olinadi.
2. Bloklangan hisob ochiladi yoki moliyaviy isbot tayyorlanadi.
3. Sug'urta olinadi.
4. Yashash joyi topiladi va tasdiqlanadi.
5. Elchixonada intervyuga vaqt band qilinadi.
6. Hujjatlar bilan shaxsan boriladi.
7. Qaror bir necha haftadan bir necha oygacha beriladi (uzun muddatli qayta ishlash).
    `.trim(),
  },
  {
    country: 'Germany',
    visaType: 'student',
    section: 'refusal_reasons',
    content: `
Rad etish sabablari:
- Moliyaviy yetishmaslik.
- O'qish rejasi ishonarsiz.
- Til yoki ta'lim talablariga javob bermaslik.
- Immigratsion risk.
- Hujjatdagi ziddiyatlar.
    `.trim(),
  },
];

// Poland Visa Rules
const POLAND_VISA_RULES: VisaKbEntry[] = [
  {
    country: 'Poland',
    visaType: 'tourist',
    section: 'eligibility',
    content: `
- Qisqa muddatli sayohat maqsadi (turizm, qarindoshlarni ko'rish).
- Intended stay is up to 90 days in any 180-day period (Schengen short-stay).
- Immigratsion niyat bo'lmasligi.
- Valid passport, travel insurance, and sufficient funds.
    `.trim(),
  },
  {
    country: 'Poland',
    visaType: 'tourist',
    section: 'documents',
    content: `
Asosiy hujjatlar:
1. Pasport (kamida 3 oy muddat qolgan, 2+ bo'sh sahifa).
2. Schengen visa ariza formasi.
3. Biometrik surat (passport-size).
4. Sug'urta (kamida 30,000 EUR qoplama).
5. Mehmonxona bron.
6. Aviabilet bron.
7. Bank statement (so'nggi 3-6 oy).
8. Ish joyidan ma'lumotnoma.
    `.trim(),
  },
  {
    country: 'Poland',
    visaType: 'tourist',
    section: 'finance',
    content: `
Moliyaviy talablar:
- Safar xarajatlarini qoplaydigan mablag' (aviabilet, yashash, kundalik xarajatlar).
- Bank statement, ish joyidan ma'lumotnoma yoki homiylik xati.
- Ba'zi konsulliklar kunlik minimal summani qo'llaydi; aniq miqdorni rasmiy manbalardan tekshirish kerak.
    `.trim(),
  },
  {
    country: 'Poland',
    visaType: 'tourist',
    section: 'application_process',
    content: `
Ariza berish jarayoni:
1. VFS yoki konsullik orqali ariza beriladi.
2. Onlayn yoki qog'oz ariza formasi to'ldiriladi.
3. VFS yoki konsullikda vaqt band qilinadi.
4. Hujjatlar bilan shaxsan boriladi.
5. Biometrik ma'lumotlar olinadi.
6. Qaror odatda 15 kalendar kun ichida, lekin uzoqroq bo'lishi mumkin.
    `.trim(),
  },
  {
    country: 'Poland',
    visaType: 'tourist',
    section: 'refusal_reasons',
    content: `
Rad etish sabablari:
- Moliyaviy yetishmaslik.
- Immigratsion risk.
- Vatanga qaytish bog'liqligi yetarli emas.
- Hujjatdagi ziddiyatlar.
- Oldingi Schengen qoidabuzarliklari.
    `.trim(),
  },
  {
    country: 'Poland',
    visaType: 'student',
    section: 'eligibility',
    content: `
Talabalar uchun:
- Qabul xati (university yoki college).
- O'qish va yashash xarajatlarini qoplaydigan mablag'.
- Ta'lim to'lovi haqida ma'lumot.
- Sug'urta, yashash joyi, ta'lim hujjatlari.
- Til talablari (ingliz yoki polyak tili programmasiga qarab).
    `.trim(),
  },
  {
    country: 'Poland',
    visaType: 'student',
    section: 'documents',
    content: `
Talabalar uchun hujjatlar:
1. Qabul xati (o'quv muassasasidan).
2. Ta'lim to'lovi haqida ma'lumot.
3. Bank statement (o'qish va yashash xarajatlari uchun).
4. Homiylik xati (agar bor bo'lsa).
5. Sug'urta hujjati.
6. Yashash joyi tasdig'i (yotoqxona yoki ijara shartnomasi).
7. Ta'lim hujjatlari (diplomlar, transkriptlar).
8. Til sertifikati (agar talab qilinsa).
9. Pasport va surat.
    `.trim(),
  },
  {
    country: 'Poland',
    visaType: 'student',
    section: 'finance',
    content: `
Moliyaviy talablar:
- O'qish va yashash xarajatlarini qoplaydigan mablag'.
- Bank statement (so'nggi 3-6 oy).
- Homiylik xati va homiydan bank statement (agar bor bo'lsa).
- Konsullik aniq minimal summani ko'rsatadi, lekin u o'zgarishi mumkin.
    `.trim(),
  },
  {
    country: 'Poland',
    visaType: 'student',
    section: 'application_process',
    content: `
Ariza berish jarayoni:
1. Qabul xati olinadi.
2. Ta'lim to'lovi to'lanadi (agar talab qilinsa).
3. Sug'urta olinadi.
4. Yashash joyi topiladi va tasdiqlanadi.
5. Elchixona yoki konsullikda milliy student vizaga ariza beriladi.
6. Hujjatlar bilan shaxsan boriladi.
7. Qaror bir necha haftadan bir necha oygacha beriladi.
    `.trim(),
  },
  {
    country: 'Poland',
    visaType: 'student',
    section: 'refusal_reasons',
    content: `
Rad etish sabablari:
- Moliyaviy yetishmaslik.
- O'qish rejasi ishonarsiz.
- Til yoki ta'lim talablariga javob bermaslik.
- Immigratsion risk.
- Hujjatdagi ziddiyatlar.
    `.trim(),
  },
];

/**
 * Get visa knowledge base content for a given country and visa type
 * @param country - Country name (e.g., "Spain", "USA", "Canada")
 * @param visaType - Visa type (e.g., "tourist" or "student")
 * @returns Formatted knowledge base string, or empty string if not found
 */
export function getVisaKnowledgeBase(
  country: string | null | undefined,
  visaType: string | null | undefined
): string {
  if (!country || !visaType) return '';

  const normalizedCountry = country.trim().toLowerCase();
  const normalizedVisaType = visaType.trim().toLowerCase() as VisaType;

  // Only support tourist and student
  if (normalizedVisaType !== 'tourist' && normalizedVisaType !== 'student') {
    return '';
  }

  // Normalize country names to canonical keys
  let countryKey: string | null = null;
  let countryDisplayName: string = '';

  if (
    normalizedCountry === 'usa' ||
    normalizedCountry === 'united states' ||
    normalizedCountry === 'america' ||
    normalizedCountry === 'amerika'
  ) {
    countryKey = 'usa';
    countryDisplayName = 'USA';
  } else if (normalizedCountry === 'canada' || normalizedCountry === 'kanada') {
    countryKey = 'canada';
    countryDisplayName = 'Canada';
  } else if (normalizedCountry === 'australia' || normalizedCountry === 'avstraliya') {
    countryKey = 'australia';
    countryDisplayName = 'Australia';
  } else if (
    normalizedCountry === 'united kingdom' ||
    normalizedCountry === 'uk' ||
    normalizedCountry === 'great britain' ||
    normalizedCountry === 'buyuk britaniya'
  ) {
    countryKey = 'uk';
    countryDisplayName = 'United Kingdom';
  } else if (normalizedCountry === 'new zealand' || normalizedCountry === 'yangi zelandiya') {
    countryKey = 'new_zealand';
    countryDisplayName = 'New Zealand';
  } else if (normalizedCountry === 'japan' || normalizedCountry === 'yaponiya') {
    countryKey = 'japan';
    countryDisplayName = 'Japan';
  } else if (
    normalizedCountry === 'south korea' ||
    normalizedCountry === 'korea' ||
    normalizedCountry === 'janubiy koreya'
  ) {
    countryKey = 'south_korea';
    countryDisplayName = 'South Korea';
  } else if (normalizedCountry === 'spain' || normalizedCountry === 'ispaniya') {
    countryKey = 'spain';
    countryDisplayName = 'Spain';
  } else if (normalizedCountry === 'germany' || normalizedCountry === 'germaniya') {
    countryKey = 'germany';
    countryDisplayName = 'Germany';
  } else if (normalizedCountry === 'poland' || normalizedCountry === 'polsha') {
    countryKey = 'poland';
    countryDisplayName = 'Poland';
  }

  if (!countryKey) {
    return '';
  }

  // Select the appropriate rules array based on country
  let rules: VisaKbEntry[] = [];
  switch (countryKey) {
    case 'usa':
      rules = USA_VISA_RULES;
      break;
    case 'canada':
      rules = CANADA_VISA_RULES;
      break;
    case 'australia':
      rules = AUSTRALIA_VISA_RULES;
      break;
    case 'uk':
      rules = UK_VISA_RULES;
      break;
    case 'new_zealand':
      rules = NEW_ZEALAND_VISA_RULES;
      break;
    case 'japan':
      rules = JAPAN_VISA_RULES;
      break;
    case 'south_korea':
      rules = SOUTH_KOREA_VISA_RULES;
      break;
    case 'spain':
      rules = SPAIN_VISA_RULES;
      break;
    case 'germany':
      rules = GERMANY_VISA_RULES;
      break;
    case 'poland':
      rules = POLAND_VISA_RULES;
      break;
    default:
      return '';
  }

  // Filter entries by visa type
  const entries = rules.filter((entry) => entry.visaType === normalizedVisaType);

  if (!entries.length) return '';

  const groupedBySection: Record<VisaKbSection, string[]> = {
    eligibility: [],
    documents: [],
    finance: [],
    application_process: [],
    refusal_reasons: [],
  };

  for (const entry of entries) {
    groupedBySection[entry.section].push(entry.content);
  }

  const parts: string[] = [];
  parts.push(`COUNTRY: ${countryDisplayName}`);
  parts.push(`VISA TYPE: ${normalizedVisaType.toUpperCase()}`);
  parts.push(
    `NOTE: The following is general guidance based on typical consulate requirements. Applicants must always confirm details on the official consulate or VFS website.`
  );

  const addSection = (title: string, key: VisaKbSection) => {
    const sectionContents = groupedBySection[key];
    if (sectionContents.length === 0) return;
    parts.push(`\n[${title}]\n${sectionContents.join('\n\n')}`);
  };

  addSection('Eligibility', 'eligibility');
  addSection('Required Documents', 'documents');
  addSection('Financial Requirements', 'finance');
  addSection('Application Process', 'application_process');
  addSection('Common Refusal Reasons', 'refusal_reasons');

  return parts.join('\n\n').trim();
}
