/**
 * STATIC FALLBACK CHECKLISTS
 *
 * WARNING:
 * These are emergency-only checklists used when:
 * - there is no approved VisaRuleSet for (country, visaType), OR
 * - both rules-based and legacy GPT-based generation have failed.
 *
 * They MUST NOT be used as a primary or canonical source of truth
 * for document requirements.
 *
 * Canonical source: VisaRuleSet (+ VisaRuleReference + DocumentCatalog).
 *
 * ========================================================================
 * Emergency Fallback Checklists
 * Categorized fallback sets for each country/visa type combination
 * ========================================================================
 */

export interface FallbackChecklistItem {
  document: string;
  name: string;
  nameUz: string;
  nameRu: string;
  category: 'required' | 'highly_recommended' | 'optional';
  description: string;
  descriptionUz: string;
  descriptionRu: string;
  required: boolean;
  priority: 'high' | 'medium' | 'low';
  whereToObtain: string;
  whereToObtainUz: string;
  whereToObtainRu: string;
}

type CountryCode = 'US' | 'GB' | 'CA' | 'AU' | 'DE' | 'ES' | 'JP' | 'AE';
type VisaType = 'student' | 'tourist';

const FALLBACK_CHECKLISTS: Record<CountryCode, Record<VisaType, FallbackChecklistItem[]>> = {
  US: {
    student: [
      {
        document: 'passport',
        name: 'Valid Passport',
        nameUz: 'Yaroqli Pasport',
        nameRu: 'Действительный Паспорт',
        category: 'required',
        description:
          'Uzbek biometric passport valid at least 6 months after your planned return date.',
        descriptionUz:
          "Rejalashtirilgan qaytish sanasidan keyin kamida 6 oy muddati qolgan O'zbekiston biometrik pasporti.",
        descriptionRu:
          'Биометрический паспорт Узбекистана, действительный не менее 6 месяцев после запланированной даты возвращения.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Apply at your local migration service or internal affairs office in Uzbekistan.',
        whereToObtainUz:
          "O'zbekistondagi mahalliy migratsiya xizmatiga yoki ichki ishlar organlariga murojaat qiling.",
        whereToObtainRu:
          'Обратитесь в местную службу миграции или органы внутренних дел в Узбекистане.',
      },
      {
        document: 'passport_photo',
        name: 'Passport Photo',
        nameUz: 'Pasport Fotosi',
        nameRu: 'Фото на Паспорт',
        category: 'required',
        description: '2x2 inch photo with white background, taken within last 6 months.',
        descriptionUz: "Oq fonda 2x2 dyuymli foto, so'nggi 6 oy ichida olingan.",
        descriptionRu: 'Фото 2x2 дюйма на белом фоне, сделанное в течение последних 6 месяцев.',
        required: true,
        priority: 'high',
        whereToObtain: 'Take at photo studio in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi foto studiyada oling.",
        whereToObtainRu: 'Сделайте в фотостудии в Узбекистане.',
      },
      {
        document: 'form_i20',
        name: 'Form I-20',
        nameUz: 'I-20 Formasi',
        nameRu: 'Форма I-20',
        category: 'required',
        description:
          'Form I-20 issued by your US school. Must include SEVIS number and school information.',
        descriptionUz:
          "AQSh maktabingiz tomonidan berilgan I-20 formasi. SEVIS raqami va maktab ma'lumotlari bo'lishi kerak.",
        descriptionRu:
          'Форма I-20, выданная вашей школой в США. Должна включать номер SEVIS и информацию о школе.',
        required: true,
        priority: 'high',
        whereToObtain: 'Request from your US school or university.',
        whereToObtainUz: "AQSh maktabingiz yoki universitetingizdan so'rang.",
        whereToObtainRu: 'Запросите в вашей школе или университете в США.',
      },
      {
        document: 'sevis_fee',
        name: 'SEVIS Fee Receipt',
        nameUz: "SEVIS To'lov Kvitansiyasi",
        nameRu: 'Квитанция об Оплате SEVIS',
        category: 'required',
        description: 'Payment receipt for SEVIS I-901 fee. Must be paid before visa interview.',
        descriptionUz:
          "SEVIS I-901 to'lovi uchun to'lov kvitansiyasi. Viza suhbatidan oldin to'lanishi kerak.",
        descriptionRu:
          'Квитанция об оплате сбора SEVIS I-901. Должна быть оплачена до собеседования на визу.',
        required: true,
        priority: 'high',
        whereToObtain: 'Pay online at fmjfee.com and print receipt.',
        whereToObtainUz: "fmjfee.com saytida onlayn to'lang va kvitansiyani chop eting.",
        whereToObtainRu: 'Оплатите онлайн на fmjfee.com и распечатайте квитанцию.',
      },
      {
        document: 'ds160_confirmation',
        name: 'DS-160 Confirmation Page',
        nameUz: 'DS-160 Tasdiqlash Sahifasi',
        nameRu: 'Страница Подтверждения DS-160',
        category: 'required',
        description: 'Completed DS-160 online application form confirmation page with barcode.',
        descriptionUz:
          "To'ldirilgan DS-160 onlayn ariza formasi tasdiqlash sahifasi shtrix-kod bilan.",
        descriptionRu:
          'Страница подтверждения заполненной онлайн-формы заявления DS-160 со штрих-кодом.',
        required: true,
        priority: 'high',
        whereToObtain: 'Complete online at ceac.state.gov/genniv/',
        whereToObtainUz: "Onlayn to'ldiring: ceac.state.gov/genniv/",
        whereToObtainRu: 'Заполните онлайн на ceac.state.gov/genniv/',
      },
      {
        document: 'bank_statement',
        name: 'Bank Statement',
        nameUz: 'Bank Hisobi',
        nameRu: 'Банковская Выписка',
        category: 'required',
        description:
          'Recent bank statement from Uzbek bank showing sufficient funds for 1 year of tuition and living expenses.',
        descriptionUz:
          "1 yillik o'qish va yashash xarajatlari uchun yetarli mablag'ni ko'rsatadigan O'zbekiston bankidan so'nggi bank hisobi.",
        descriptionRu:
          'Недавняя банковская выписка из банка Узбекистана, показывающая достаточные средства на 1 год обучения и проживания.',
        required: true,
        priority: 'high',
        whereToObtain: 'Obtain from your bank branch in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi bank filialingizdan oling.",
        whereToObtainRu: 'Получите в отделении вашего банка в Узбекистане.',
      },
      {
        document: 'income_certificate',
        name: 'Income Certificate',
        nameUz: 'Daromad Sertifikati',
        nameRu: 'Справка о Доходах',
        category: 'highly_recommended',
        description:
          'Official income certificate from employer or government portal showing monthly/annual salary.',
        descriptionUz:
          "Ish beruvchi yoki davlat portalidan oylik/yillik maoshni ko'rsatadigan rasmiy daromad sertifikati.",
        descriptionRu:
          'Официальная справка о доходах от работодателя или государственного портала, показывающая месячную/годовую зарплату.',
        required: false,
        priority: 'high',
        whereToObtain:
          'Request from employer HR or obtain through official government portal in Uzbekistan.',
        whereToObtainUz:
          "Ish beruvchining HR bo'limidan so'rang yoki O'zbekistondagi rasmiy davlat portali orqali oling.",
        whereToObtainRu:
          'Запросите у HR работодателя или получите через официальный государственный портал в Узбекистане.',
      },
      {
        document: 'academic_transcripts',
        name: 'Academic Transcripts',
        nameUz: 'Akademik Transkriptlar',
        nameRu: 'Академические Транскрипты',
        category: 'highly_recommended',
        description:
          'Official transcripts from previous educational institutions with English translation if needed.',
        descriptionUz:
          "Oldingi ta'lim muassasalaridan rasmiy transkriptlar, agar kerak bo'lsa, ingliz tiliga tarjima qilingan.",
        descriptionRu:
          'Официальные транскрипты из предыдущих учебных заведений с переводом на английский язык при необходимости.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Request from your previous school or university.',
        whereToObtainUz: "Oldingi maktabingiz yoki universitetingizdan so'rang.",
        whereToObtainRu: 'Запросите в вашей предыдущей школе или университете.',
      },
      {
        document: 'tuition_payment_proof',
        name: 'Tuition Payment Proof',
        nameUz: "To'lov Kvitansiyasi",
        nameRu: 'Квитанция об Оплате Обучения',
        category: 'required',
        description: 'Proof of tuition payment or scholarship award letter.',
        descriptionUz: "O'qish to'lovi yoki stipendiya mukofot xati.",
        descriptionRu: 'Подтверждение оплаты обучения или письмо о присуждении стипендии.',
        required: true,
        priority: 'high',
        whereToObtain: 'Request from your US school or scholarship provider.',
        whereToObtainUz: "AQSh maktabingiz yoki stipendiya ta'minlovchisidan so'rang.",
        whereToObtainRu: 'Запросите в вашей школе в США или у поставщика стипендии.',
      },
      {
        document: 'education_documents',
        name: 'Education Documents',
        nameUz: "Ta'lim Hujjatlari",
        nameRu: 'Образовательные Документы',
        category: 'required',
        description:
          'Diploma, certificates, and transcripts from previous education with English translation.',
        descriptionUz:
          "Oldingi ta'limdan diplom, sertifikatlar va transkriptlar, ingliz tiliga tarjima qilingan.",
        descriptionRu:
          'Диплом, сертификаты и транскрипты из предыдущего образования с переводом на английский язык.',
        required: true,
        priority: 'high',
        whereToObtain: 'Request from your previous educational institutions in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi oldingi ta'lim muassasalaridan so'rang.",
        whereToObtainRu: 'Запросите в ваших предыдущих учебных заведениях в Узбекистане.',
      },
      {
        document: 'insurance',
        name: 'Health Insurance',
        nameUz: "Sog'liqni Sug'urta",
        nameRu: 'Медицинская Страховка',
        category: 'required',
        description: 'Health insurance coverage for your stay in the US.',
        descriptionUz: "AQShda qolish uchun sog'liqni sug'urta qoplamasi.",
        descriptionRu: 'Медицинская страховка на период вашего пребывания в США.',
        required: true,
        priority: 'high',
        whereToObtain: 'Purchase through insurance provider or your US school.',
        whereToObtainUz: "Sug'urta provayderi yoki AQSh maktabingiz orqali xarid qiling.",
        whereToObtainRu: 'Приобретите через страхового провайдера или вашу школу в США.',
      },
      {
        document: 'study_plan',
        name: 'Statement of Purpose / Study Plan',
        nameUz: "Maqsad Deklaratsiyasi / O'qish Rejasi",
        nameRu: 'Заявление о Целях / План Обучения',
        category: 'highly_recommended',
        description: 'Personal statement explaining your study goals and plans in the US.',
        descriptionUz: "AQShda o'qish maqsadlari va rejalaringizni tushuntiruvchi shaxsiy bayonot.",
        descriptionRu: 'Личное заявление, объясняющее ваши цели и планы обучения в США.',
        required: false,
        priority: 'high',
        whereToObtain: 'Write your own statement of purpose.',
        whereToObtainUz: "O'zingizning maqsad deklaratsiyangizni yozing.",
        whereToObtainRu: 'Напишите свое заявление о целях.',
      },
      {
        document: 'accommodation_proof',
        name: 'Accommodation Proof',
        nameUz: 'Turar Joy Tasdiqnomasi',
        nameRu: 'Подтверждение Проживания',
        category: 'highly_recommended',
        description: 'Proof of accommodation arrangements for your stay in the US.',
        descriptionUz: 'AQShda qolish uchun turar joy tashkilotlari tasdiqnomasi.',
        descriptionRu:
          'Подтверждение договоренностей о проживании на период вашего пребывания в США.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Request from your US school housing office or landlord.',
        whereToObtainUz: "AQSh maktabingizning turar joy idorasidan yoki uy egasidan so'rang.",
        whereToObtainRu: 'Запросите в жилищном офисе вашей школы в США или у арендодателя.',
      },
      {
        document: 'family_ties',
        name: 'Family Ties Document',
        nameUz: "Oila Bog'liqlik Hujjati",
        nameRu: 'Документ о Семейных Связях',
        category: 'highly_recommended',
        description:
          'Family certificate or documents showing family members remaining in Uzbekistan.',
        descriptionUz:
          "O'zbekistonda qolgan oila a'zolarini ko'rsatadigan oila sertifikati yoki hujjatlar.",
        descriptionRu:
          'Семейный сертификат или документы, показывающие членов семьи, остающихся в Узбекистане.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Obtain from civil registry office (ZAGS) in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi fuqarolik holati idorasidan (ZAGS) oling.",
        whereToObtainRu:
          'Получите в отделе записи актов гражданского состояния (ЗАГС) в Узбекистане.',
      },
      {
        document: 'previous_travel',
        name: 'Previous Travel History',
        nameUz: 'Oldingi Sayohat Tarixi',
        nameRu: 'История Предыдущих Поездок',
        category: 'optional',
        description: 'Copies of previous visas and entry/exit stamps showing travel history.',
        descriptionUz:
          "Oldingi vizalar va kirish/chiqish muhrlarining nusxalari sayohat tarixini ko'rsatadi.",
        descriptionRu:
          'Копии предыдущих виз и штампов въезда/выезда, показывающие историю поездок.',
        required: false,
        priority: 'low',
        whereToObtain: 'Copy from your passport pages.',
        whereToObtainUz: 'Pasportingiz sahifalaridan nusxa oling.',
        whereToObtainRu: 'Скопируйте со страниц вашего паспорта.',
      },
      {
        document: 'recommendation_letters',
        name: 'Recommendation Letters',
        nameUz: 'Tavsiya Xatlari',
        nameRu: 'Рекомендательные Письма',
        category: 'optional',
        description:
          'Letters of recommendation from teachers, employers, or mentors (optional but helpful).',
        descriptionUz:
          "O'qituvchilar, ish beruvchilar yoki maslahatchilardan tavsiya xatlari (ixtiyoriy, lekin foydali).",
        descriptionRu:
          'Рекомендательные письма от учителей, работодателей или наставников (необязательно, но полезно).',
        required: false,
        priority: 'low',
        whereToObtain: 'Request from your teachers, employers, or mentors in Uzbekistan.',
        whereToObtainUz:
          "O'zbekistondagi o'qituvchilar, ish beruvchilar yoki maslahatchilardan so'rang.",
        whereToObtainRu: 'Запросите у ваших учителей, работодателей или наставников в Узбекистане.',
      },
      {
        document: 'property_document',
        name: 'Property Ownership Document',
        nameUz: 'Mulk Hujjati',
        nameRu: 'Документ о Праве Собственности',
        category: 'optional',
        description: 'Property ownership document (kadastr) showing ties to Uzbekistan.',
        descriptionUz: "O'zbekistonga bog'liqlikni ko'rsatadigan mulk hujjati (kadastr).",
        descriptionRu:
          'Документ о праве собственности (кадастр), показывающий связи с Узбекистаном.',
        required: false,
        priority: 'low',
        whereToObtain: 'Obtain from cadastral office or property registry in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi kadastr idorasidan yoki mulk reestridan oling.",
        whereToObtainRu:
          'Получите в кадастровом управлении или реестре недвижимости в Узбекистане.',
      },
    ],
    tourist: [
      {
        document: 'passport',
        name: 'Valid Passport',
        nameUz: 'Yaroqli Pasport',
        nameRu: 'Действительный Паспорт',
        category: 'required',
        description:
          'Uzbek biometric passport valid at least 6 months after your planned return date.',
        descriptionUz:
          "Rejalashtirilgan qaytish sanasidan keyin kamida 6 oy muddati qolgan O'zbekiston biometrik pasporti.",
        descriptionRu:
          'Биометрический паспорт Узбекистана, действительный не менее 6 месяцев после запланированной даты возвращения.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Apply at your local migration service or internal affairs office in Uzbekistan.',
        whereToObtainUz:
          "O'zbekistondagi mahalliy migratsiya xizmatiga yoki ichki ishlar organlariga murojaat qiling.",
        whereToObtainRu:
          'Обратитесь в местную службу миграции или органы внутренних дел в Узбекистане.',
      },
      {
        document: 'passport_photo',
        name: 'Passport Photo',
        nameUz: 'Pasport Fotosi',
        nameRu: 'Фото на Паспорт',
        category: 'required',
        description: '2x2 inch photo with white background.',
        descriptionUz: 'Oq fonda 2x2 dyuymli foto.',
        descriptionRu: 'Фото 2x2 дюйма на белом фоне.',
        required: true,
        priority: 'high',
        whereToObtain: 'Take at photo studio in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi foto studiyada oling.",
        whereToObtainRu: 'Сделайте в фотостудии в Узбекистане.',
      },
      {
        document: 'ds160_confirmation',
        name: 'DS-160 Confirmation Page',
        nameUz: 'DS-160 Tasdiqlash Sahifasi',
        nameRu: 'Страница Подтверждения DS-160',
        category: 'required',
        description: 'Completed DS-160 online application form confirmation page.',
        descriptionUz: "To'ldirilgan DS-160 onlayn ariza formasi tasdiqlash sahifasi.",
        descriptionRu: 'Страница подтверждения заполненной онлайн-формы заявления DS-160.',
        required: true,
        priority: 'high',
        whereToObtain: 'Complete online at ceac.state.gov/genniv/',
        whereToObtainUz: "Onlayn to'ldiring: ceac.state.gov/genniv/",
        whereToObtainRu: 'Заполните онлайн на ceac.state.gov/genniv/',
      },
      {
        document: 'bank_statement',
        name: 'Bank Statement',
        nameUz: 'Bank Hisobi',
        nameRu: 'Банковская Выписка',
        category: 'required',
        description: 'Recent bank statement from Uzbek bank showing sufficient funds for trip.',
        descriptionUz:
          "Sayohat uchun yetarli mablag'ni ko'rsatadigan O'zbekiston bankidan so'nggi bank hisobi.",
        descriptionRu:
          'Недавняя банковская выписка из банка Узбекистана, показывающая достаточные средства на поездку.',
        required: true,
        priority: 'high',
        whereToObtain: 'Obtain from your bank branch in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi bank filialingizdan oling.",
        whereToObtainRu: 'Получите в отделении вашего банка в Узбекистане.',
      },
      {
        document: 'hotel_booking',
        name: 'Hotel Booking Confirmation',
        nameUz: 'Mehmonxona Bron Qilish Tasdiqnomasi',
        nameRu: 'Подтверждение Бронирования Отеля',
        category: 'required',
        description: 'Confirmed hotel booking or accommodation reservation for entire stay.',
        descriptionUz:
          'Butun qolish muddati uchun tasdiqlangan mehmonxona broni yoki turar joy rezervatsiyasi.',
        descriptionRu:
          'Подтвержденное бронирование отеля или размещения на весь период пребывания.',
        required: true,
        priority: 'high',
        whereToObtain: 'Book through hotel website or booking platform.',
        whereToObtainUz: 'Mehmonxona veb-sayti yoki bron qilish platformasi orqali bron qiling.',
        whereToObtainRu: 'Забронируйте через сайт отеля или платформу бронирования.',
      },
      {
        document: 'employment_letter',
        name: 'Employment Letter',
        nameUz: 'Ish Joyi Xati',
        nameRu: 'Справка с Места Работы',
        category: 'highly_recommended',
        description:
          'Letter from employer confirming employment, position, salary, and approved leave.',
        descriptionUz:
          "Ish beruvchidan ish joyi, lavozim, maosh va tasdiqlangan ta'tilni tasdiqlovchi xat.",
        descriptionRu:
          'Письмо от работодателя, подтверждающее место работы, должность, зарплату и утвержденный отпуск.',
        required: false,
        priority: 'high',
        whereToObtain: 'Request from employer HR department in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi ish beruvchining HR bo'limidan so'rang.",
        whereToObtainRu: 'Запросите в отделе кадров работодателя в Узбекистане.',
      },
      {
        document: 'travel_itinerary',
        name: 'Travel Itinerary',
        nameUz: 'Sayohat Rejasi',
        nameRu: 'Маршрут Поездки',
        category: 'highly_recommended',
        description: 'Detailed travel itinerary showing planned activities and destinations.',
        descriptionUz:
          "Rejalashtirilgan faoliyat va yo'nalishlarni ko'rsatadigan batafsil sayohat rejasi.",
        descriptionRu:
          'Подробный маршрут поездки, показывающий запланированные мероприятия и направления.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Create your own itinerary or use travel planning tools.',
        whereToObtainUz:
          "O'zingiz reja tuzing yoki sayohat rejalashtirish vositalaridan foydalaning.",
        whereToObtainRu: 'Создайте свой маршрут или используйте инструменты планирования поездок.',
      },
      {
        document: 'income_certificate',
        name: 'Income Certificate',
        nameUz: 'Daromad Sertifikati',
        nameRu: 'Справка о Доходах',
        category: 'highly_recommended',
        description:
          'Official income certificate from employer or government portal showing monthly/annual salary.',
        descriptionUz:
          "Ish beruvchi yoki davlat portalidan oylik/yillik maoshni ko'rsatadigan rasmiy daromad sertifikati.",
        descriptionRu:
          'Официальная справка о доходах от работодателя или государственного портала, показывающая месячную/годовую зарплату.',
        required: false,
        priority: 'high',
        whereToObtain:
          'Request from employer HR or obtain through official government portal in Uzbekistan.',
        whereToObtainUz:
          "Ish beruvchining HR bo'limidan so'rang yoki O'zbekistondagi rasmiy davlat portali orqali oling.",
        whereToObtainRu:
          'Запросите у HR работодателя или получите через официальный государственный портал в Узбекистане.',
      },
      {
        document: 'travel_itinerary',
        name: 'Travel Itinerary',
        nameUz: 'Sayohat Rejasi',
        nameRu: 'Маршрут Поездки',
        category: 'highly_recommended',
        description:
          'Detailed travel itinerary showing planned activities and destinations in the US.',
        descriptionUz:
          "AQShda rejalashtirilgan faoliyat va yo'nalishlarni ko'rsatadigan batafsil sayohat rejasi.",
        descriptionRu:
          'Подробный маршрут поездки, показывающий запланированные мероприятия и направления в США.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Create your own itinerary or use travel planning tools.',
        whereToObtainUz:
          "O'zingiz reja tuzing yoki sayohat rejalashtirish vositalaridan foydalaning.",
        whereToObtainRu: 'Создайте свой маршрут или используйте инструменты планирования поездок.',
      },
      {
        document: 'return_ticket',
        name: 'Return Flight Ticket',
        nameUz: 'Qaytish Chiptasi',
        nameRu: 'Обратный Билет',
        category: 'highly_recommended',
        description: 'Confirmed return flight ticket showing intent to return to Uzbekistan.',
        descriptionUz:
          "O'zbekistonga qaytish niyatini ko'rsatadigan tasdiqlangan qaytish chiptasi.",
        descriptionRu:
          'Подтвержденный обратный билет, показывающий намерение вернуться в Узбекистан.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Book through airline or travel agency.',
        whereToObtainUz: 'Aviakompaniya yoki sayohat agentligi orqali bron qiling.',
        whereToObtainRu: 'Забронируйте через авиакомпанию или туристическое агентство.',
      },
      {
        document: 'family_ties',
        name: 'Family Ties Document',
        nameUz: "Oila Bog'liqlik Hujjati",
        nameRu: 'Документ о Семейных Связях',
        category: 'optional',
        description: 'Family certificate showing family members remaining in Uzbekistan.',
        descriptionUz: "O'zbekistonda qolgan oila a'zolarini ko'rsatadigan oila sertifikati.",
        descriptionRu: 'Семейный сертификат, показывающий членов семьи, остающихся в Узбекистане.',
        required: false,
        priority: 'low',
        whereToObtain: 'Obtain from civil registry office (ZAGS) in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi fuqarolik holati idorasidan (ZAGS) oling.",
        whereToObtainRu:
          'Получите в отделе записи актов гражданского состояния (ЗАГС) в Узбекистане.',
      },
      {
        document: 'previous_travel',
        name: 'Previous Travel History',
        nameUz: 'Oldingi Sayohat Tarixi',
        nameRu: 'История Предыдущих Поездок',
        category: 'optional',
        description: 'Copies of previous visas and entry/exit stamps showing travel history.',
        descriptionUz:
          "Oldingi vizalar va kirish/chiqish muhrlarining nusxalari sayohat tarixini ko'rsatadi.",
        descriptionRu:
          'Копии предыдущих виз и штампов въезда/выезда, показывающие историю поездок.',
        required: false,
        priority: 'low',
        whereToObtain: 'Copy from your passport pages.',
        whereToObtainUz: 'Pasportingiz sahifalaridan nusxa oling.',
        whereToObtainRu: 'Скопируйте со страниц вашего паспорта.',
      },
      {
        document: 'property_document',
        name: 'Property Ownership Document',
        nameUz: 'Mulk Hujjati',
        nameRu: 'Документ о Праве Собственности',
        category: 'optional',
        description: 'Property ownership document showing ties to Uzbekistan.',
        descriptionUz: "O'zbekistonga bog'liqlikni ko'rsatadigan mulk hujjati.",
        descriptionRu: 'Документ о праве собственности, показывающий связи с Узбекистаном.',
        required: false,
        priority: 'low',
        whereToObtain: 'Obtain from cadastral office in Uzbekistan if you own property.',
        whereToObtainUz: "Agar mulkingiz bo'lsa, O'zbekistondagi kadastr idorasidan oling.",
        whereToObtainRu:
          'Получите в кадастровом управлении в Узбекистане, если у вас есть недвижимость.',
      },
    ],
  },
  GB: {
    student: [
      {
        document: 'passport',
        name: 'Valid Passport',
        nameUz: 'Yaroqli Pasport',
        nameRu: 'Действительный Паспорт',
        category: 'required',
        description:
          'Uzbek biometric passport valid at least 6 months after your planned return date.',
        descriptionUz:
          "Rejalashtirilgan qaytish sanasidan keyin kamida 6 oy muddati qolgan O'zbekiston biometrik pasporti.",
        descriptionRu:
          'Биометрический паспорт Узбекистана, действительный не менее 6 месяцев после запланированной даты возвращения.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Apply at your local migration service or internal affairs office in Uzbekistan.',
        whereToObtainUz:
          "O'zbekistondagi mahalliy migratsiya xizmatiga yoki ichki ishlar organlariga murojaat qiling.",
        whereToObtainRu:
          'Обратитесь в местную службу миграции или органы внутренних дел в Узбекистане.',
      },
      {
        document: 'cas',
        name: 'CAS (Confirmation of Acceptance for Studies)',
        nameUz: "CAS (Ta'lim Uchun Qabul Tasdiqnomasi)",
        nameRu: 'CAS (Подтверждение Принятия на Обучение)',
        category: 'required',
        description:
          'CAS number issued by your UK educational institution. Required for student visa application.',
        descriptionUz:
          "Buyuk Britaniya ta'lim muassasangiz tomonidan berilgan CAS raqami. Talaba vizasi uchun talab qilinadi.",
        descriptionRu:
          'Номер CAS, выданный вашим учебным заведением Великобритании. Требуется для заявления на студенческую визу.',
        required: true,
        priority: 'high',
        whereToObtain: 'Request from your UK school or university.',
        whereToObtainUz: "Buyuk Britaniya maktabingiz yoki universitetingizdan so'rang.",
        whereToObtainRu: 'Запросите в вашей школе или университете в Великобритании.',
      },
      {
        document: 'bank_statement',
        name: 'Bank Statement (28 Days Rule)',
        nameUz: 'Bank Hisobi (28 Kun Qoidasi)',
        nameRu: 'Банковская Выписка (Правило 28 Дней)',
        category: 'required',
        description:
          'Bank statement from Uzbek bank showing funds held for at least 28 consecutive days. Must cover tuition + living costs.',
        descriptionUz:
          "Kamida 28 kun ketma-ket saqlangan mablag'larni ko'rsatadigan O'zbekiston bankidan bank hisobi. O'qish va yashash xarajatlarini qoplashi kerak.",
        descriptionRu:
          'Банковская выписка из банка Узбекистана, показывающая средства, хранящиеся не менее 28 дней подряд. Должна покрывать обучение и расходы на проживание.',
        required: true,
        priority: 'high',
        whereToObtain: 'Obtain from your bank branch in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi bank filialingizdan oling.",
        whereToObtainRu: 'Получите в отделении вашего банка в Узбекистане.',
      },
      {
        document: 'passport_photo',
        name: 'Passport Photo',
        nameUz: 'Pasport Fotosi',
        nameRu: 'Фото на Паспорт',
        category: 'required',
        description: '2x2 inch photo with white background, taken within last 6 months.',
        descriptionUz: "Oq fonda 2x2 dyuymli foto, so'nggi 6 oy ichida olingan.",
        descriptionRu: 'Фото 2x2 дюйма на белом фоне, сделанное в течение последних 6 месяцев.',
        required: true,
        priority: 'high',
        whereToObtain: 'Take at photo studio in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi foto studiyada oling.",
        whereToObtainRu: 'Сделайте в фотостудии в Узбекистане.',
      },
      {
        document: 'visa_application_form',
        name: 'UK Visa Application Form',
        nameUz: 'Buyuk Britaniya Viza Ariza Formasi',
        nameRu: 'Форма Заявления на Визу в Великобританию',
        category: 'required',
        description: 'Completed online visa application form (Student visa application).',
        descriptionUz: "To'ldirilgan onlayn viza ariza formasi (Talaba vizasi arizasi).",
        descriptionRu:
          'Заполненная онлайн-форма заявления на визу (Заявление на студенческую визу).',
        required: true,
        priority: 'high',
        whereToObtain: 'Complete online at gov.uk/apply-uk-visa',
        whereToObtainUz: "Onlayn to'ldiring: gov.uk/apply-uk-visa",
        whereToObtainRu: 'Заполните онлайн на gov.uk/apply-uk-visa',
      },
      {
        document: 'tuition_payment_proof',
        name: 'Tuition Payment Proof',
        nameUz: "To'lov Kvitansiyasi",
        nameRu: 'Квитанция об Оплате Обучения',
        category: 'required',
        description: 'Proof of tuition payment or scholarship award letter.',
        descriptionUz: "O'qish to'lovi yoki stipendiya mukofot xati.",
        descriptionRu: 'Подтверждение оплаты обучения или письмо о присуждении стипендии.',
        required: true,
        priority: 'high',
        whereToObtain: 'Request from your UK school or scholarship provider.',
        whereToObtainUz: "Buyuk Britaniya maktabingiz yoki stipendiya ta'minlovchisidan so'rang.",
        whereToObtainRu: 'Запросите в вашей школе в Великобритании или у поставщика стипендии.',
      },
      {
        document: 'education_documents',
        name: 'Education Documents',
        nameUz: "Ta'lim Hujjatlari",
        nameRu: 'Образовательные Документы',
        category: 'required',
        description:
          'Diploma, certificates, and transcripts from previous education with English translation.',
        descriptionUz:
          "Oldingi ta'limdan diplom, sertifikatlar va transkriptlar, ingliz tiliga tarjima qilingan.",
        descriptionRu:
          'Диплом, сертификаты и транскрипты из предыдущего образования с переводом на английский язык.',
        required: true,
        priority: 'high',
        whereToObtain: 'Request from your previous educational institutions in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi oldingi ta'lim muassasalaridan so'rang.",
        whereToObtainRu: 'Запросите в ваших предыдущих учебных заведениях в Узбекистане.',
      },
      {
        document: 'income_certificate',
        name: 'Income Certificate',
        nameUz: 'Daromad Sertifikati',
        nameRu: 'Справка о Доходах',
        category: 'highly_recommended',
        description:
          'Official income certificate from employer or government portal showing monthly/annual salary.',
        descriptionUz:
          "Ish beruvchi yoki davlat portalidan oylik/yillik maoshni ko'rsatadigan rasmiy daromad sertifikati.",
        descriptionRu:
          'Официальная справка о доходах от работодателя или государственного портала, показывающая месячную/годовую зарплату.',
        required: false,
        priority: 'high',
        whereToObtain:
          'Request from employer HR or obtain through official government portal in Uzbekistan.',
        whereToObtainUz:
          "Ish beruvchining HR bo'limidan so'rang yoki O'zbekistondagi rasmiy davlat portali orqali oling.",
        whereToObtainRu:
          'Запросите у HR работодателя или получите через официальный государственный портал в Узбекистане.',
      },
      {
        document: 'accommodation_proof',
        name: 'Accommodation Proof',
        nameUz: 'Turar Joy Tasdiqnomasi',
        nameRu: 'Подтверждение Проживания',
        category: 'highly_recommended',
        description: 'Proof of accommodation arrangements for your stay in the UK.',
        descriptionUz: 'Buyuk Britaniyada qolish uchun turar joy tashkilotlari tasdiqnomasi.',
        descriptionRu:
          'Подтверждение договоренностей о проживании на период вашего пребывания в Великобритании.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Request from your UK school housing office or landlord.',
        whereToObtainUz:
          "Buyuk Britaniya maktabingizning turar joy idorasidan yoki uy egasidan so'rang.",
        whereToObtainRu:
          'Запросите в жилищном офисе вашей школы в Великобритании или у арендодателя.',
      },
      {
        document: 'study_plan',
        name: 'Statement of Purpose / Study Plan',
        nameUz: "Maqsad Deklaratsiyasi / O'qish Rejasi",
        nameRu: 'Заявление о Целях / План Обучения',
        category: 'highly_recommended',
        description: 'Personal statement explaining your study goals and plans in the UK.',
        descriptionUz:
          "Buyuk Britaniyada o'qish maqsadlari va rejalaringizni tushuntiruvchi shaxsiy bayonot.",
        descriptionRu: 'Личное заявление, объясняющее ваши цели и планы обучения в Великобритании.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Write your own statement of purpose.',
        whereToObtainUz: "O'zingizning maqsad deklaratsiyangizni yozing.",
        whereToObtainRu: 'Напишите свое заявление о целях.',
      },
      {
        document: 'family_ties',
        name: 'Family Ties Document',
        nameUz: "Oila Bog'liqlik Hujjati",
        nameRu: 'Документ о Семейных Связях',
        category: 'optional',
        description: 'Family certificate showing family members remaining in Uzbekistan.',
        descriptionUz: "O'zbekistonda qolgan oila a'zolarini ko'rsatadigan oila sertifikati.",
        descriptionRu: 'Семейный сертификат, показывающий членов семьи, остающихся в Узбекистане.',
        required: false,
        priority: 'low',
        whereToObtain: 'Obtain from civil registry office (ZAGS) in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi fuqarolik holati idorasidan (ZAGS) oling.",
        whereToObtainRu:
          'Получите в отделе записи актов гражданского состояния (ЗАГС) в Узбекистане.',
      },
      {
        document: 'property_document',
        name: 'Property Ownership Document',
        nameUz: 'Mulk Hujjati',
        nameRu: 'Документ о Праве Собственности',
        category: 'optional',
        description: 'Property ownership document (kadastr) showing ties to Uzbekistan.',
        descriptionUz: "O'zbekistonga bog'liqlikni ko'rsatadigan mulk hujjati (kadastr).",
        descriptionRu:
          'Документ о праве собственности (кадастр), показывающий связи с Узбекистаном.',
        required: false,
        priority: 'low',
        whereToObtain: 'Obtain from cadastral office or property registry in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi kadastr idorasidan yoki mulk reestridan oling.",
        whereToObtainRu:
          'Получите в кадастровом управлении или реестре недвижимости в Узбекистане.',
      },
    ],
    tourist: [
      {
        document: 'passport',
        name: 'Valid Passport',
        nameUz: 'Yaroqli Pasport',
        nameRu: 'Действительный Паспорт',
        category: 'required',
        description:
          'Uzbek biometric passport valid at least 6 months after your planned return date.',
        descriptionUz:
          "Rejalashtirilgan qaytish sanasidan keyin kamida 6 oy muddati qolgan O'zbekiston biometrik pasporti.",
        descriptionRu:
          'Биометрический паспорт Узбекистана, действительный не менее 6 месяцев после запланированной даты возвращения.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Apply at your local migration service or internal affairs office in Uzbekistan.',
        whereToObtainUz:
          "O'zbekistondagi mahalliy migratsiya xizmatiga yoki ichki ishlar organlariga murojaat qiling.",
        whereToObtainRu:
          'Обратитесь в местную службу миграции или органы внутренних дел в Узбекистане.',
      },
      {
        document: 'passport_photo',
        name: 'Passport Photo',
        nameUz: 'Pasport Fotosi',
        nameRu: 'Фото на Паспорт',
        category: 'required',
        description: '2x2 inch photo with white background.',
        descriptionUz: 'Oq fonda 2x2 dyuymli foto.',
        descriptionRu: 'Фото 2x2 дюйма на белом фоне.',
        required: true,
        priority: 'high',
        whereToObtain: 'Take at photo studio in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi foto studiyada oling.",
        whereToObtainRu: 'Сделайте в фотостудии в Узбекистане.',
      },
      {
        document: 'visa_application_form',
        name: 'UK Visa Application Form',
        nameUz: 'Buyuk Britaniya Viza Ariza Formasi',
        nameRu: 'Форма Заявления на Визу в Великобританию',
        category: 'required',
        description: 'Completed online visa application form for UK tourist visa.',
        descriptionUz:
          "Buyuk Britaniya turist vizasi uchun to'ldirilgan onlayn viza ariza formasi.",
        descriptionRu: 'Заполненная онлайн-форма заявления на туристическую визу в Великобританию.',
        required: true,
        priority: 'high',
        whereToObtain: 'Complete online at gov.uk/apply-uk-visa',
        whereToObtainUz: "Onlayn to'ldiring: gov.uk/apply-uk-visa",
        whereToObtainRu: 'Заполните онлайн на gov.uk/apply-uk-visa',
      },
      {
        document: 'bank_statement',
        name: 'Bank Statement (28 Days Rule)',
        nameUz: 'Bank Hisobi (28 Kun Qoidasi)',
        nameRu: 'Банковская Выписка (Правило 28 Дней)',
        category: 'required',
        description:
          'Bank statement from Uzbek bank showing funds held for at least 28 consecutive days. Must cover trip expenses.',
        descriptionUz:
          "Kamida 28 kun ketma-ket saqlangan mablag'larni ko'rsatadigan O'zbekiston bankidan bank hisobi. Sayohat xarajatlarini qoplashi kerak.",
        descriptionRu:
          'Банковская выписка из банка Узбекистана, показывающая средства, хранящиеся не менее 28 дней подряд. Должна покрывать расходы на поездку.',
        required: true,
        priority: 'high',
        whereToObtain: 'Obtain from your bank branch in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi bank filialingizdan oling.",
        whereToObtainRu: 'Получите в отделении вашего банка в Узбекистане.',
      },
      {
        document: 'hotel_booking',
        name: 'Hotel Booking Confirmation',
        nameUz: 'Mehmonxona Bron Qilish Tasdiqnomasi',
        nameRu: 'Подтверждение Бронирования Отеля',
        category: 'required',
        description: 'Confirmed hotel booking or accommodation reservation for entire stay in UK.',
        descriptionUz:
          'Buyuk Britaniyada butun qolish muddati uchun tasdiqlangan mehmonxona broni yoki turar joy rezervatsiyasi.',
        descriptionRu:
          'Подтвержденное бронирование отеля или размещения на весь период пребывания в Великобритании.',
        required: true,
        priority: 'high',
        whereToObtain: 'Book through hotel website or booking platform.',
        whereToObtainUz: 'Mehmonxona veb-sayti yoki bron qilish platformasi orqali bron qiling.',
        whereToObtainRu: 'Забронируйте через сайт отеля или платформу бронирования.',
      },
      {
        document: 'employment_letter',
        name: 'Employment Letter',
        nameUz: 'Ish Joyi Xati',
        nameRu: 'Справка с Места Работы',
        category: 'highly_recommended',
        description:
          'Letter from employer confirming employment, position, salary, and approved leave.',
        descriptionUz:
          "Ish beruvchidan ish joyi, lavozim, maosh va tasdiqlangan ta'tilni tasdiqlovchi xat.",
        descriptionRu:
          'Письмо от работодателя, подтверждающее место работы, должность, зарплату и утвержденный отпуск.',
        required: false,
        priority: 'high',
        whereToObtain: 'Request from employer HR department in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi ish beruvchining HR bo'limidan so'rang.",
        whereToObtainRu: 'Запросите в отделе кадров работодателя в Узбекистане.',
      },
      {
        document: 'income_certificate',
        name: 'Income Certificate',
        nameUz: 'Daromad Sertifikati',
        nameRu: 'Справка о Доходах',
        category: 'highly_recommended',
        description:
          'Official income certificate from employer or government portal showing monthly/annual salary.',
        descriptionUz:
          "Ish beruvchi yoki davlat portalidan oylik/yillik maoshni ko'rsatadigan rasmiy daromad sertifikati.",
        descriptionRu:
          'Официальная справка о доходах от работодателя или государственного портала, показывающая месячную/годовую зарплату.',
        required: false,
        priority: 'high',
        whereToObtain:
          'Request from employer HR or obtain through official government portal in Uzbekistan.',
        whereToObtainUz:
          "Ish beruvchining HR bo'limidan so'rang yoki O'zbekistondagi rasmiy davlat portali orqali oling.",
        whereToObtainRu:
          'Запросите у HR работодателя или получите через официальный государственный портал в Узбекистане.',
      },
      {
        document: 'travel_itinerary',
        name: 'Travel Itinerary',
        nameUz: 'Sayohat Rejasi',
        nameRu: 'Маршрут Поездки',
        category: 'highly_recommended',
        description: 'Detailed travel itinerary showing planned activities and destinations in UK.',
        descriptionUz:
          "Buyuk Britaniyada rejalashtirilgan faoliyat va yo'nalishlarni ko'rsatadigan batafsil sayohat rejasi.",
        descriptionRu:
          'Подробный маршрут поездки, показывающий запланированные мероприятия и направления в Великобритании.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Create your own itinerary or use travel planning tools.',
        whereToObtainUz:
          "O'zingiz reja tuzing yoki sayohat rejalashtirish vositalaridan foydalaning.",
        whereToObtainRu: 'Создайте свой маршрут или используйте инструменты планирования поездок.',
      },
      {
        document: 'return_ticket',
        name: 'Return Flight Ticket',
        nameUz: 'Qaytish Chiptasi',
        nameRu: 'Обратный Билет',
        category: 'highly_recommended',
        description: 'Confirmed return flight ticket showing intent to return to Uzbekistan.',
        descriptionUz:
          "O'zbekistonga qaytish niyatini ko'rsatadigan tasdiqlangan qaytish chiptasi.",
        descriptionRu:
          'Подтвержденный обратный билет, показывающий намерение вернуться в Узбекистан.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Book through airline or travel agency.',
        whereToObtainUz: 'Aviakompaniya yoki sayohat agentligi orqali bron qiling.',
        whereToObtainRu: 'Забронируйте через авиакомпанию или туристическое агентство.',
      },
      {
        document: 'family_ties',
        name: 'Family Ties Document',
        nameUz: "Oila Bog'liqlik Hujjati",
        nameRu: 'Документ о Семейных Связях',
        category: 'optional',
        description: 'Family certificate showing family members remaining in Uzbekistan.',
        descriptionUz: "O'zbekistonda qolgan oila a'zolarini ko'rsatadigan oila sertifikati.",
        descriptionRu: 'Семейный сертификат, показывающий членов семьи, остающихся в Узбекистане.',
        required: false,
        priority: 'low',
        whereToObtain: 'Obtain from civil registry office (ZAGS) in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi fuqarolik holati idorasidan (ZAGS) oling.",
        whereToObtainRu:
          'Получите в отделе записи актов гражданского состояния (ЗАГС) в Узбекистане.',
      },
      {
        document: 'previous_travel',
        name: 'Previous Travel History',
        nameUz: 'Oldingi Sayohat Tarixi',
        nameRu: 'История Предыдущих Поездок',
        category: 'optional',
        description: 'Copies of previous visas and entry/exit stamps showing travel history.',
        descriptionUz:
          "Oldingi vizalar va kirish/chiqish muhrlarining nusxalari sayohat tarixini ko'rsatadi.",
        descriptionRu:
          'Копии предыдущих виз и штампов въезда/выезда, показывающие историю поездок.',
        required: false,
        priority: 'low',
        whereToObtain: 'Copy from your passport pages.',
        whereToObtainUz: 'Pasportingiz sahifalaridan nusxa oling.',
        whereToObtainRu: 'Скопируйте со страниц вашего паспорта.',
      },
      {
        document: 'property_document',
        name: 'Property Ownership Document',
        nameUz: 'Mulk Hujjati',
        nameRu: 'Документ о Праве Собственности',
        category: 'optional',
        description: 'Property ownership document showing ties to Uzbekistan.',
        descriptionUz: "O'zbekistonga bog'liqlikni ko'rsatadigan mulk hujjati.",
        descriptionRu: 'Документ о праве собственности, показывающий связи с Узбекистаном.',
        required: false,
        priority: 'low',
        whereToObtain: 'Obtain from cadastral office in Uzbekistan if you own property.',
        whereToObtainUz: "Agar mulkingiz bo'lsa, O'zbekistondagi kadastr idorasidan oling.",
        whereToObtainRu:
          'Получите в кадастровом управлении в Узбекистане, если у вас есть недвижимость.',
      },
    ],
  },
  CA: {
    student: [
      {
        document: 'passport',
        name: 'Valid Passport',
        nameUz: 'Yaroqli Pasport',
        nameRu: 'Действительный Паспорт',
        category: 'required',
        description:
          'Uzbek biometric passport valid at least 6 months after your planned return date.',
        descriptionUz:
          "Rejalashtirilgan qaytish sanasidan keyin kamida 6 oy muddati qolgan O'zbekiston biometrik pasporti.",
        descriptionRu:
          'Биометрический паспорт Узбекистана, действительный не менее 6 месяцев после запланированной даты возвращения.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Apply at your local migration service or internal affairs office in Uzbekistan.',
        whereToObtainUz:
          "O'zbekistondagi mahalliy migratsiya xizmatiga yoki ichki ishlar organlariga murojaat qiling.",
        whereToObtainRu:
          'Обратитесь в местную службу миграции или органы внутренних дел в Узбекистане.',
      },
      {
        document: 'passport_photo',
        name: 'Passport Photo',
        nameUz: 'Pasport Fotosi',
        nameRu: 'Фото на Паспорт',
        category: 'required',
        description: '2x2 inch photo with white background, taken within last 6 months.',
        descriptionUz: "Oq fonda 2x2 dyuymli foto, so'nggi 6 oy ichida olingan.",
        descriptionRu: 'Фото 2x2 дюйма на белом фоне, сделанное в течение последних 6 месяцев.',
        required: true,
        priority: 'high',
        whereToObtain: 'Take at photo studio in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi foto studiyada oling.",
        whereToObtainRu: 'Сделайте в фотостудии в Узбекистане.',
      },
      {
        document: 'loa',
        name: 'Letter of Acceptance (LOA) from DLI',
        nameUz: 'DLI dan Qabul Xati (LOA)',
        nameRu: 'Письмо о Зачислении (LOA) от DLI',
        category: 'required',
        description: 'Letter of Acceptance from a Designated Learning Institution (DLI) in Canada.',
        descriptionUz: "Kanadadagi Belgilangan Ta'lim Muassasasi (DLI) dan qabul xati.",
        descriptionRu: 'Письмо о зачислении от назначенного учебного заведения (DLI) в Канаде.',
        required: true,
        priority: 'high',
        whereToObtain: 'Request from your Canadian school or university.',
        whereToObtainUz: "Kanadadagi maktabingiz yoki universitetingizdan so'rang.",
        whereToObtainRu: 'Запросите в вашей школе или университете в Канаде.',
      },
      {
        document: 'visa_application_form',
        name: 'Canada Study Permit Application',
        nameUz: "Kanada O'qish Ruxsati Arizasi",
        nameRu: 'Заявление на Разрешение на Учебу в Канаде',
        category: 'required',
        description: 'Completed study permit application form (IMM 1294) and required documents.',
        descriptionUz:
          "To'ldirilgan o'qish ruxsati ariza formasi (IMM 1294) va talab qilinadigan hujjatlar.",
        descriptionRu:
          'Заполненная форма заявления на разрешение на учебу (IMM 1294) и необходимые документы.',
        required: true,
        priority: 'high',
        whereToObtain: 'Complete online at canada.ca/study-permit',
        whereToObtainUz: "Onlayn to'ldiring: canada.ca/study-permit",
        whereToObtainRu: 'Заполните онлайн на canada.ca/study-permit',
      },
      {
        document: 'gic_proof',
        name: 'GIC (Guaranteed Investment Certificate) Proof',
        nameUz: 'GIC (Kafolatli Investitsiya Sertifikati) Tasdiqnomasi',
        nameRu: 'Подтверждение GIC (Гарантированный Инвестиционный Сертификат)',
        category: 'required',
        description:
          'Proof of GIC purchase (minimum CAD $10,000) from a participating Canadian financial institution.',
        descriptionUz:
          'Qatnashuvchi Kanada moliya muassasasidan GIC xaridi tasdiqnomasi (kamida 10,000 CAD).',
        descriptionRu:
          'Подтверждение покупки GIC (минимум 10,000 CAD) от участвующего канадского финансового учреждения.',
        required: true,
        priority: 'high',
        whereToObtain: 'Purchase GIC from participating Canadian bank (e.g., Scotiabank, CIBC).',
        whereToObtainUz:
          'Qatnashuvchi Kanada bankidan GIC xarid qiling (masalan, Scotiabank, CIBC).',
        whereToObtainRu:
          'Приобретите GIC в участвующем канадском банке (например, Scotiabank, CIBC).',
      },
      {
        document: 'tuition_payment_proof',
        name: 'Tuition Payment Proof',
        nameUz: "To'lov Kvitansiyasi",
        nameRu: 'Квитанция об Оплате Обучения',
        category: 'required',
        description: 'Proof of tuition payment for first year of study.',
        descriptionUz: "Birinchi yil o'qish uchun to'lov kvitansiyasi.",
        descriptionRu: 'Подтверждение оплаты обучения за первый год учебы.',
        required: true,
        priority: 'high',
        whereToObtain: 'Request from your Canadian school or university.',
        whereToObtainUz: "Kanadadagi maktabingiz yoki universitetingizdan so'rang.",
        whereToObtainRu: 'Запросите в вашей школе или университете в Канаде.',
      },
      {
        document: 'bank_statement',
        name: 'Bank Statement',
        nameUz: 'Bank Hisobi',
        nameRu: 'Банковская Выписка',
        category: 'required',
        description:
          'Bank statement from Uzbek bank showing sufficient funds for tuition and living expenses (minimum 4 months).',
        descriptionUz:
          "O'qish va yashash xarajatlari uchun yetarli mablag'ni ko'rsatadigan O'zbekiston bankidan bank hisobi (kamida 4 oy).",
        descriptionRu:
          'Банковская выписка из банка Узбекистана, показывающая достаточные средства на обучение и проживание (минимум 4 месяца).',
        required: true,
        priority: 'high',
        whereToObtain: 'Obtain from your bank branch in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi bank filialingizdan oling.",
        whereToObtainRu: 'Получите в отделении вашего банка в Узбекистане.',
      },
      {
        document: 'education_documents',
        name: 'Education Documents',
        nameUz: "Ta'lim Hujjatlari",
        nameRu: 'Образовательные Документы',
        category: 'required',
        description:
          'Diploma, certificates, and transcripts from previous education with English translation.',
        descriptionUz:
          "Oldingi ta'limdan diplom, sertifikatlar va transkriptlar, ingliz tiliga tarjima qilingan.",
        descriptionRu:
          'Диплом, сертификаты и транскрипты из предыдущего образования с переводом на английский язык.',
        required: true,
        priority: 'high',
        whereToObtain: 'Request from your previous educational institutions in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi oldingi ta'lim muassasalaridan so'rang.",
        whereToObtainRu: 'Запросите в ваших предыдущих учебных заведениях в Узбекистане.',
      },
      {
        document: 'income_certificate',
        name: 'Income Certificate',
        nameUz: 'Daromad Sertifikati',
        nameRu: 'Справка о Доходах',
        category: 'highly_recommended',
        description:
          'Official income certificate from employer or government portal showing monthly/annual salary.',
        descriptionUz:
          "Ish beruvchi yoki davlat portalidan oylik/yillik maoshni ko'rsatadigan rasmiy daromad sertifikati.",
        descriptionRu:
          'Официальная справка о доходах от работодателя или государственного портала, показывающая месячную/годовую зарплату.',
        required: false,
        priority: 'high',
        whereToObtain:
          'Request from employer HR or obtain through official government portal in Uzbekistan.',
        whereToObtainUz:
          "Ish beruvchining HR bo'limidan so'rang yoki O'zbekistondagi rasmiy davlat portali orqali oling.",
        whereToObtainRu:
          'Запросите у HR работодателя или получите через официальный государственный портал в Узбекистане.',
      },
      {
        document: 'study_plan',
        name: 'Statement of Purpose / Study Plan',
        nameUz: "Maqsad Deklaratsiyasi / O'qish Rejasi",
        nameRu: 'Заявление о Целях / План Обучения',
        category: 'highly_recommended',
        description: 'Personal statement explaining your study goals and plans in Canada.',
        descriptionUz:
          "Kanadada o'qish maqsadlari va rejalaringizni tushuntiruvchi shaxsiy bayonot.",
        descriptionRu: 'Личное заявление, объясняющее ваши цели и планы обучения в Канаде.',
        required: false,
        priority: 'high',
        whereToObtain: 'Write your own statement of purpose.',
        whereToObtainUz: "O'zingizning maqsad deklaratsiyangizni yozing.",
        whereToObtainRu: 'Напишите свое заявление о целях.',
      },
      {
        document: 'accommodation_proof',
        name: 'Accommodation Proof',
        nameUz: 'Turar Joy Tasdiqnomasi',
        nameRu: 'Подтверждение Проживания',
        category: 'highly_recommended',
        description: 'Proof of accommodation arrangements for your stay in Canada.',
        descriptionUz: 'Kanadada qolish uchun turar joy tashkilotlari tasdiqnomasi.',
        descriptionRu:
          'Подтверждение договоренностей о проживании на период вашего пребывания в Канаде.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Request from your Canadian school housing office or landlord.',
        whereToObtainUz:
          "Kanadadagi maktabingizning turar joy idorasidan yoki uy egasidan so'rang.",
        whereToObtainRu: 'Запросите в жилищном офисе вашей школы в Канаде или у арендодателя.',
      },
      {
        document: 'family_ties',
        name: 'Family Ties Document',
        nameUz: "Oila Bog'liqlik Hujjati",
        nameRu: 'Документ о Семейных Связях',
        category: 'optional',
        description: 'Family certificate showing family members remaining in Uzbekistan.',
        descriptionUz: "O'zbekistonda qolgan oila a'zolarini ko'rsatadigan oila sertifikati.",
        descriptionRu: 'Семейный сертификат, показывающий членов семьи, остающихся в Узбекистане.',
        required: false,
        priority: 'low',
        whereToObtain: 'Obtain from civil registry office (ZAGS) in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi fuqarolik holati idorasidan (ZAGS) oling.",
        whereToObtainRu:
          'Получите в отделе записи актов гражданского состояния (ЗАГС) в Узбекистане.',
      },
      {
        document: 'property_document',
        name: 'Property Ownership Document',
        nameUz: 'Mulk Hujjati',
        nameRu: 'Документ о Праве Собственности',
        category: 'optional',
        description: 'Property ownership document (kadastr) showing ties to Uzbekistan.',
        descriptionUz: "O'zbekistonga bog'liqlikni ko'rsatadigan mulk hujjati (kadastr).",
        descriptionRu:
          'Документ о праве собственности (кадастр), показывающий связи с Узбекистаном.',
        required: false,
        priority: 'low',
        whereToObtain: 'Obtain from cadastral office or property registry in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi kadastr idorasidan yoki mulk reestridan oling.",
        whereToObtainRu:
          'Получите в кадастровом управлении или реестре недвижимости в Узбекистане.',
      },
    ],
    tourist: [
      {
        document: 'passport',
        name: 'Valid Passport',
        nameUz: 'Yaroqli Pasport',
        nameRu: 'Действительный Паспорт',
        category: 'required',
        description:
          'Uzbek biometric passport valid at least 6 months after your planned return date.',
        descriptionUz:
          "Rejalashtirilgan qaytish sanasidan keyin kamida 6 oy muddati qolgan O'zbekiston biometrik pasporti.",
        descriptionRu:
          'Биометрический паспорт Узбекистана, действительный не менее 6 месяцев после запланированной даты возвращения.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Apply at your local migration service or internal affairs office in Uzbekistan.',
        whereToObtainUz:
          "O'zbekistondagi mahalliy migratsiya xizmatiga yoki ichki ishlar organlariga murojaat qiling.",
        whereToObtainRu:
          'Обратитесь в местную службу миграции или органы внутренних дел в Узбекистане.',
      },
      {
        document: 'passport_photo',
        name: 'Passport Photo',
        nameUz: 'Pasport Fotosi',
        nameRu: 'Фото на Паспорт',
        category: 'required',
        description: '2x2 inch photo with white background.',
        descriptionUz: 'Oq fonda 2x2 dyuymli foto.',
        descriptionRu: 'Фото 2x2 дюйма на белом фоне.',
        required: true,
        priority: 'high',
        whereToObtain: 'Take at photo studio in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi foto studiyada oling.",
        whereToObtainRu: 'Сделайте в фотостудии в Узбекистане.',
      },
      {
        document: 'visa_application_form',
        name: 'Canada Visitor Visa Application',
        nameUz: 'Kanada Tashrif Buyuruvchi Vizasi Arizasi',
        nameRu: 'Заявление на Туристическую Визу в Канаду',
        category: 'required',
        description: 'Completed visitor visa application form (IMM 5257) and required documents.',
        descriptionUz:
          "To'ldirilgan tashrif buyuruvchi vizasi ariza formasi (IMM 5257) va talab qilinadigan hujjatlar.",
        descriptionRu:
          'Заполненная форма заявления на туристическую визу (IMM 5257) и необходимые документы.',
        required: true,
        priority: 'high',
        whereToObtain: 'Complete online at canada.ca/visit',
        whereToObtainUz: "Onlayn to'ldiring: canada.ca/visit",
        whereToObtainRu: 'Заполните онлайн на canada.ca/visit',
      },
      {
        document: 'bank_statement',
        name: 'Bank Statement',
        nameUz: 'Bank Hisobi',
        nameRu: 'Банковская Выписка',
        category: 'required',
        description:
          'Recent bank statement from Uzbek bank showing sufficient funds for trip (minimum 4 months).',
        descriptionUz:
          "Sayohat uchun yetarli mablag'ni ko'rsatadigan O'zbekiston bankidan so'nggi bank hisobi (kamida 4 oy).",
        descriptionRu:
          'Недавняя банковская выписка из банка Узбекистана, показывающая достаточные средства на поездку (минимум 4 месяца).',
        required: true,
        priority: 'high',
        whereToObtain: 'Obtain from your bank branch in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi bank filialingizdan oling.",
        whereToObtainRu: 'Получите в отделении вашего банка в Узбекистане.',
      },
      {
        document: 'hotel_booking',
        name: 'Hotel Booking Confirmation',
        nameUz: 'Mehmonxona Bron Qilish Tasdiqnomasi',
        nameRu: 'Подтверждение Бронирования Отеля',
        category: 'required',
        description:
          'Confirmed hotel booking or accommodation reservation for entire stay in Canada.',
        descriptionUz:
          'Kanadada butun qolish muddati uchun tasdiqlangan mehmonxona broni yoki turar joy rezervatsiyasi.',
        descriptionRu:
          'Подтвержденное бронирование отеля или размещения на весь период пребывания в Канаде.',
        required: true,
        priority: 'high',
        whereToObtain: 'Book through hotel website or booking platform.',
        whereToObtainUz: 'Mehmonxona veb-sayti yoki bron qilish platformasi orqali bron qiling.',
        whereToObtainRu: 'Забронируйте через сайт отеля или платформу бронирования.',
      },
      {
        document: 'employment_letter',
        name: 'Employment Letter',
        nameUz: 'Ish Joyi Xati',
        nameRu: 'Справка с Места Работы',
        category: 'highly_recommended',
        description:
          'Letter from employer confirming employment, position, salary, and approved leave.',
        descriptionUz:
          "Ish beruvchidan ish joyi, lavozim, maosh va tasdiqlangan ta'tilni tasdiqlovchi xat.",
        descriptionRu:
          'Письмо от работодателя, подтверждающее место работы, должность, зарплату и утвержденный отпуск.',
        required: false,
        priority: 'high',
        whereToObtain: 'Request from employer HR department in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi ish beruvchining HR bo'limidan so'rang.",
        whereToObtainRu: 'Запросите в отделе кадров работодателя в Узбекистане.',
      },
      {
        document: 'income_certificate',
        name: 'Income Certificate',
        nameUz: 'Daromad Sertifikati',
        nameRu: 'Справка о Доходах',
        category: 'highly_recommended',
        description:
          'Official income certificate from employer or government portal showing monthly/annual salary.',
        descriptionUz:
          "Ish beruvchi yoki davlat portalidan oylik/yillik maoshni ko'rsatadigan rasmiy daromad sertifikati.",
        descriptionRu:
          'Официальная справка о доходах от работодателя или государственного портала, показывающая месячную/годовую зарплату.',
        required: false,
        priority: 'high',
        whereToObtain:
          'Request from employer HR or obtain through official government portal in Uzbekistan.',
        whereToObtainUz:
          "Ish beruvchining HR bo'limidan so'rang yoki O'zbekistondagi rasmiy davlat portali orqali oling.",
        whereToObtainRu:
          'Запросите у HR работодателя или получите через официальный государственный портал в Узбекистане.',
      },
      {
        document: 'travel_itinerary',
        name: 'Travel Itinerary',
        nameUz: 'Sayohat Rejasi',
        nameRu: 'Маршрут Поездки',
        category: 'highly_recommended',
        description:
          'Detailed travel itinerary showing planned activities and destinations in Canada.',
        descriptionUz:
          "Kanadada rejalashtirilgan faoliyat va yo'nalishlarni ko'rsatadigan batafsil sayohat rejasi.",
        descriptionRu:
          'Подробный маршрут поездки, показывающий запланированные мероприятия и направления в Канаде.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Create your own itinerary or use travel planning tools.',
        whereToObtainUz:
          "O'zingiz reja tuzing yoki sayohat rejalashtirish vositalaridan foydalaning.",
        whereToObtainRu: 'Создайте свой маршрут или используйте инструменты планирования поездок.',
      },
      {
        document: 'return_ticket',
        name: 'Return Flight Ticket',
        nameUz: 'Qaytish Chiptasi',
        nameRu: 'Обратный Билет',
        category: 'highly_recommended',
        description: 'Confirmed return flight ticket showing intent to return to Uzbekistan.',
        descriptionUz:
          "O'zbekistonga qaytish niyatini ko'rsatadigan tasdiqlangan qaytish chiptasi.",
        descriptionRu:
          'Подтвержденный обратный билет, показывающий намерение вернуться в Узбекистан.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Book through airline or travel agency.',
        whereToObtainUz: 'Aviakompaniya yoki sayohat agentligi orqali bron qiling.',
        whereToObtainRu: 'Забронируйте через авиакомпанию или туристическое агентство.',
      },
      {
        document: 'family_ties',
        name: 'Family Ties Document',
        nameUz: "Oila Bog'liqlik Hujjati",
        nameRu: 'Документ о Семейных Связях',
        category: 'optional',
        description: 'Family certificate showing family members remaining in Uzbekistan.',
        descriptionUz: "O'zbekistonda qolgan oila a'zolarini ko'rsatadigan oila sertifikati.",
        descriptionRu: 'Семейный сертификат, показывающий членов семьи, остающихся в Узбекистане.',
        required: false,
        priority: 'low',
        whereToObtain: 'Obtain from civil registry office (ZAGS) in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi fuqarolik holati idorasidan (ZAGS) oling.",
        whereToObtainRu:
          'Получите в отделе записи актов гражданского состояния (ЗАГС) в Узбекистане.',
      },
      {
        document: 'property_document',
        name: 'Property Ownership Document',
        nameUz: 'Mulk Hujjati',
        nameRu: 'Документ о Праве Собственности',
        category: 'optional',
        description: 'Property ownership document showing ties to Uzbekistan.',
        descriptionUz: "O'zbekistonga bog'liqlikni ko'rsatadigan mulk hujjati.",
        descriptionRu: 'Документ о праве собственности, показывающий связи с Узбекистаном.',
        required: false,
        priority: 'low',
        whereToObtain: 'Obtain from cadastral office in Uzbekistan if you own property.',
        whereToObtainUz: "Agar mulkingiz bo'lsa, O'zbekistondagi kadastr idorasidan oling.",
        whereToObtainRu:
          'Получите в кадастровом управлении в Узбекистане, если у вас есть недвижимость.',
      },
    ],
  },
  AU: {
    student: [
      {
        document: 'passport',
        name: 'Valid Passport',
        nameUz: 'Yaroqli Pasport',
        nameRu: 'Действительный Паспорт',
        category: 'required',
        description:
          'Uzbek biometric passport valid at least 6 months after your planned return date from Australia.',
        descriptionUz:
          "Avstraliyadan rejalashtirilgan qaytish sanasidan keyin kamida 6 oy muddati qolgan O'zbekiston biometrik pasporti.",
        descriptionRu:
          'Биометрический паспорт Узбекистана, действительный не менее 6 месяцев после запланированной даты возвращения из Австралии.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Apply at your local migration service or internal affairs office in Uzbekistan.',
        whereToObtainUz:
          "O'zbekistondagi mahalliy migratsiya xizmatiga yoki ichki ishlar organlariga murojaat qiling.",
        whereToObtainRu:
          'Обратитесь в местную службу миграции или органы внутренних дел в Узбекистане.',
      },
      {
        document: 'passport_photo',
        name: 'Passport Photo',
        nameUz: 'Pasport Fotosi',
        nameRu: 'Фото на Паспорт',
        category: 'required',
        description: '2x2 inch photo with white background, taken within last 6 months.',
        descriptionUz: "Oq fonda 2x2 dyuymli foto, so'nggi 6 oy ichida olingan.",
        descriptionRu: 'Фото 2x2 дюйма на белом фоне, сделанное в течение последних 6 месяцев.',
        required: true,
        priority: 'high',
        whereToObtain: 'Take at photo studio in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi foto studiyada oling.",
        whereToObtainRu: 'Сделайте в фотостудии в Узбекистане.',
      },
      {
        document: 'visa_application_form',
        name: 'Australia Student Visa Application (ImmiAccount)',
        nameUz: 'Avstraliya Talaba Vizasi Arizasi (ImmiAccount)',
        nameRu: 'Заявление на Студенческую Визу в Австралию (ImmiAccount)',
        category: 'required',
        description:
          'Completed student visa application form (subclass 500) through ImmiAccount online portal.',
        descriptionUz:
          "ImmiAccount onlayn portali orqali to'ldirilgan talaba vizasi ariza formasi (subclass 500).",
        descriptionRu:
          'Заполненная форма заявления на студенческую визу (подкласс 500) через онлайн-портал ImmiAccount.',
        required: true,
        priority: 'high',
        whereToObtain: 'Complete online at immi.homeaffairs.gov.au',
        whereToObtainUz: "Onlayn to'ldiring: immi.homeaffairs.gov.au",
        whereToObtainRu: 'Заполните онлайн на immi.homeaffairs.gov.au',
      },
      {
        document: 'coe',
        name: 'Confirmation of Enrolment (CoE)',
        nameUz: 'Qabul Tasdiqnomasi (CoE)',
        nameRu: 'Подтверждение Зачисления (CoE)',
        category: 'required',
        description:
          'CoE issued by your Australian educational institution confirming your enrollment in a registered course.',
        descriptionUz:
          "Avstraliya ta'lim muassasangiz tomonidan ro'yxatdan o'tgan kursga qabul qilinganingizni tasdiqlovchi CoE.",
        descriptionRu:
          'CoE, выданное вашим учебным заведением Австралии, подтверждающее ваше зачисление на зарегистрированный курс.',
        required: true,
        priority: 'high',
        whereToObtain: 'Request from your Australian school or university.',
        whereToObtainUz: "Avstraliya maktabingiz yoki universitetingizdan so'rang.",
        whereToObtainRu: 'Запросите в вашей школе или университете в Австралии.',
      },
      {
        document: 'tuition_payment_proof',
        name: 'Tuition Payment Proof / Deposit Receipt',
        nameUz: "To'lov Kvitansiyasi / Depozit Kvitansiyasi",
        nameRu: 'Квитанция об Оплате Обучения / Депозит',
        category: 'required',
        description:
          'Proof of tuition payment or deposit receipt from your Australian institution.',
        descriptionUz: "Avstraliya muassasangizdan o'qish to'lovi yoki depozit kvitansiyasi.",
        descriptionRu:
          'Подтверждение оплаты обучения или квитанция о депозите от вашего учебного заведения Австралии.',
        required: true,
        priority: 'high',
        whereToObtain: 'Request from your Australian school or university.',
        whereToObtainUz: "Avstraliya maktabingiz yoki universitetingizdan so'rang.",
        whereToObtainRu: 'Запросите в вашей школе или университете в Австралии.',
      },
      {
        document: 'bank_statement',
        name: 'Bank Statement',
        nameUz: 'Bank Hisobi',
        nameRu: 'Банковская Выписка',
        category: 'required',
        description:
          'Bank statements from Uzbek bank showing sufficient funds for tuition and living expenses (last 3-6 months).',
        descriptionUz:
          "O'qish va yashash xarajatlari uchun yetarli mablag'ni ko'rsatadigan O'zbekiston bankidan bank hisoblari (so'nggi 3-6 oy).",
        descriptionRu:
          'Банковские выписки из банка Узбекистана, показывающие достаточные средства на обучение и проживание (последние 3-6 месяцев).',
        required: true,
        priority: 'high',
        whereToObtain: 'Obtain from your bank branch in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi bank filialingizdan oling.",
        whereToObtainRu: 'Получите в отделении вашего банка в Узбекистане.',
      },
      {
        document: 'income_certificate',
        name: 'Income Certificate / Sponsorship Letter',
        nameUz: 'Daromad Sertifikati / Homiy Xati',
        nameRu: 'Справка о Доходах / Письмо Спонсора',
        category: 'required',
        description:
          'Official income certificate from employer or government portal, or sponsorship letter from parents/sponsor in Uzbekistan showing financial support.',
        descriptionUz:
          "Ish beruvchi yoki davlat portalidan rasmiy daromad sertifikati, yoki O'zbekistondagi ota-ona/homiy tomonidan moliyaviy yordamni ko'rsatadigan homiy xati.",
        descriptionRu:
          'Официальная справка о доходах от работодателя или государственного портала, или письмо спонсора от родителей/спонсора в Узбекистане, показывающее финансовую поддержку.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Request from employer HR or obtain through official government portal in Uzbekistan. For sponsorship, request from sponsor.',
        whereToObtainUz:
          "Ish beruvchining HR bo'limidan so'rang yoki O'zbekistondagi rasmiy davlat portali orqali oling. Homiy uchun homiydan so'rang.",
        whereToObtainRu:
          'Запросите у HR работодателя или получите через официальный государственный портал в Узбекистане. Для спонсорства запросите у спонсора.',
      },
      {
        document: 'current_study_proof',
        name: 'Current Study Proof / Academic Status',
        nameUz: "Joriy O'qish Tasdiqnomasi / Akademik Holat",
        nameRu: 'Подтверждение Текущего Обучения / Академический Статус',
        category: 'required',
        description:
          'Student certificate or transcript from your current educational institution in Uzbekistan confirming your academic status.',
        descriptionUz:
          "O'zbekistondagi joriy ta'lim muassasangizdan akademik holatingizni tasdiqlovchi talaba sertifikati yoki transkript.",
        descriptionRu:
          'Сертификат студента или транскрипт из вашего текущего учебного заведения в Узбекистане, подтверждающий ваш академический статус.',
        required: true,
        priority: 'high',
        whereToObtain: 'Request from your current school or university in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi joriy maktabingiz yoki universitetingizdan so'rang.",
        whereToObtainRu: 'Запросите в вашей текущей школе или университете в Узбекистане.',
      },
      {
        document: 'travel_insurance',
        name: 'Travel Insurance / OSHC',
        nameUz: "Sayohat Sug'urtasi / OSHC",
        nameRu: 'Страховка для Поездки / OSHC',
        category: 'required',
        description:
          'Overseas Student Health Cover (OSHC) or travel insurance covering your full period of stay in Australia.',
        descriptionUz:
          "Avstraliyada qolish muddati uchun to'liq qoplamani beradigan Chet Eldagi Talaba Sog'liqni Sug'urta (OSHC) yoki sayohat sug'urtasi.",
        descriptionRu:
          'Медицинская страховка для иностранных студентов (OSHC) или туристическая страховка, покрывающая весь период вашего пребывания в Австралии.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Purchase OSHC through approved provider or travel insurance from insurance company.',
        whereToObtainUz:
          "Tasdiqlangan provayder orqali OSHC xarid qiling yoki sug'urta kompaniyasidan sayohat sug'urtasi.",
        whereToObtainRu:
          'Приобретите OSHC через утвержденного провайдера или туристическую страховку у страховой компании.',
      },
      {
        document: 'property_document',
        name: 'Property Ownership Document',
        nameUz: 'Mulk Hujjati',
        nameRu: 'Документ о Праве Собственности',
        category: 'highly_recommended',
        description:
          'Property ownership documents in Uzbekistan (house, land, apartment) showing ties to home country.',
        descriptionUz:
          "Vatanga bog'liqlikni ko'rsatadigan O'zbekistondagi mulk hujjatlari (uy, yer, kvartira).",
        descriptionRu:
          'Документы о праве собственности на недвижимость в Узбекистане (дом, земля, квартира), показывающие связи с родиной.',
        required: false,
        priority: 'high',
        whereToObtain: 'Obtain from cadastral office or property registry in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi kadastr idorasidan yoki mulk reestridan oling.",
        whereToObtainRu:
          'Получите в кадастровом управлении или реестре недвижимости в Узбекистане.',
      },
      {
        document: 'flight_booking',
        name: 'Flight Booking (Round Trip)',
        nameUz: 'Aviabilet Broni (Aylanma)',
        nameRu: 'Бронирование Авиабилета (Туда-Обратно)',
        category: 'highly_recommended',
        description:
          'Round-trip flight booking or at least onward ticket showing intent to return to Uzbekistan.',
        descriptionUz:
          "O'zbekistonga qaytish niyatini ko'rsatadigan aylanma aviabilet broni yoki kamida ketish chiptasi.",
        descriptionRu:
          'Бронирование авиабилета туда-обратно или, по крайней мере, билет на вылет, показывающий намерение вернуться в Узбекистан.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Book through airline or travel agency.',
        whereToObtainUz: 'Aviakompaniya yoki sayohat agentligi orqali bron qiling.',
        whereToObtainRu: 'Забронируйте через авиакомпанию или туристическое агентство.',
      },
      {
        document: 'accommodation_proof',
        name: 'Accommodation Proof',
        nameUz: 'Turar Joy Tasdiqnomasi',
        nameRu: 'Подтверждение Проживания',
        category: 'highly_recommended',
        description: 'Dormitory confirmation or rental agreement for accommodation in Australia.',
        descriptionUz:
          'Avstraliyada turar joy uchun yotoqxona tasdiqnomasi yoki ijaraga olish shartnomasi.',
        descriptionRu: 'Подтверждение общежития или договор аренды для проживания в Австралии.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Request from your Australian school housing office or landlord.',
        whereToObtainUz:
          "Avstraliya maktabingizning turar joy idorasidan yoki uy egasidan so'rang.",
        whereToObtainRu: 'Запросите в жилищном офисе вашей школы в Австралии или у арендодателя.',
      },
      {
        document: 'family_ties',
        name: 'Family Ties Document',
        nameUz: "Oila Bog'liqlik Hujjati",
        nameRu: 'Документ о Семейных Связях',
        category: 'highly_recommended',
        description:
          'Family certificate or family composition document showing family members remaining in Uzbekistan.',
        descriptionUz:
          "O'zbekistonda qolgan oila a'zolarini ko'rsatadigan oila sertifikati yoki oila tarkibi hujjati.",
        descriptionRu:
          'Семейный сертификат или документ о составе семьи, показывающий членов семьи, остающихся в Узбекистане.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Obtain from civil registry office (ZAGS) in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi fuqarolik holati idorasidan (ZAGS) oling.",
        whereToObtainRu:
          'Получите в отделе записи актов гражданского состояния (ЗАГС) в Узбекистане.',
      },
      {
        document: 'previous_visas',
        name: 'Previous Visas and Entry/Exit Stamps',
        nameUz: 'Oldingi Vizalar va Kirish/Chiqish Muhrlari',
        nameRu: 'Предыдущие Визы и Штампы Въезда/Выезда',
        category: 'optional',
        description:
          'Copies of previous visas (Schengen, Asia, etc.) and entry/exit stamps showing travel history.',
        descriptionUz:
          "Sayohat tarixini ko'rsatadigan oldingi vizalar (Shengen, Osiyo va boshqalar) va kirish/chiqish muhrlarining nusxalari.",
        descriptionRu:
          'Копии предыдущих виз (Шенген, Азия и т.д.) и штампов въезда/выезда, показывающие историю поездок.',
        required: false,
        priority: 'low',
        whereToObtain: 'Copy from your passport pages.',
        whereToObtainUz: 'Pasportingiz sahifalaridan nusxa oling.',
        whereToObtainRu: 'Скопируйте со страниц вашего паспорта.',
      },
      {
        document: 'language_certificate',
        name: 'IELTS / TOEFL Certificate',
        nameUz: 'IELTS / TOEFL Sertifikati',
        nameRu: 'Сертификат IELTS / TOEFL',
        category: 'optional',
        description:
          'English language proficiency certificate (IELTS, TOEFL) if required by your course.',
        descriptionUz:
          'Agar kursingiz talab qilsa, ingliz tili bilim darajasi sertifikati (IELTS, TOEFL).',
        descriptionRu:
          'Сертификат о знании английского языка (IELTS, TOEFL), если требуется вашим курсом.',
        required: false,
        priority: 'low',
        whereToObtain: 'Take IELTS or TOEFL test at authorized test center.',
        whereToObtainUz: "Ruxsat etilgan test markazida IELTS yoki TOEFL testidan o'ting.",
        whereToObtainRu: 'Сдайте тест IELTS или TOEFL в авторизованном тестовом центре.',
      },
      {
        document: 'cover_letter',
        name: 'Cover Letter / Study Plan',
        nameUz: "Xat / O'qish Rejasi",
        nameRu: 'Сопроводительное Письмо / План Обучения',
        category: 'optional',
        description: 'Cover letter explaining your study plan, goals, and ties to Uzbekistan.',
        descriptionUz:
          "O'qish rejasi, maqsadlari va O'zbekistonga bog'liqlikni tushuntiruvchi xat.",
        descriptionRu:
          'Сопроводительное письмо, объясняющее ваш план обучения, цели и связи с Узбекистаном.',
        required: false,
        priority: 'low',
        whereToObtain: 'Write your own cover letter.',
        whereToObtainUz: "O'zingizning xatingizni yozing.",
        whereToObtainRu: 'Напишите свое сопроводительное письмо.',
      },
    ],
    tourist: [
      {
        document: 'passport',
        name: 'Valid Passport',
        nameUz: 'Yaroqli Pasport',
        nameRu: 'Действительный Паспорт',
        category: 'required',
        description:
          'Uzbek biometric passport valid at least 6 months after your planned return date from Australia.',
        descriptionUz:
          "Avstraliyadan rejalashtirilgan qaytish sanasidan keyin kamida 6 oy muddati qolgan O'zbekiston biometrik pasporti.",
        descriptionRu:
          'Биометрический паспорт Узбекистана, действительный не менее 6 месяцев после запланированной даты возвращения из Австралии.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Apply at your local migration service or internal affairs office in Uzbekistan.',
        whereToObtainUz:
          "O'zbekistondagi mahalliy migratsiya xizmatiga yoki ichki ishlar organlariga murojaat qiling.",
        whereToObtainRu:
          'Обратитесь в местную службу миграции или органы внутренних дел в Узбекистане.',
      },
      {
        document: 'passport_photo',
        name: 'Passport Photo',
        nameUz: 'Pasport Fotosi',
        nameRu: 'Фото на Паспорт',
        category: 'required',
        description: '2x2 inch photo with white background.',
        descriptionUz: 'Oq fonda 2x2 dyuymli foto.',
        descriptionRu: 'Фото 2x2 дюйма на белом фоне.',
        required: true,
        priority: 'high',
        whereToObtain: 'Take at photo studio in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi foto studiyada oling.",
        whereToObtainRu: 'Сделайте в фотостудии в Узбекистане.',
      },
      {
        document: 'visa_application_form',
        name: 'Australia Visitor Visa Application (e-Visa)',
        nameUz: 'Avstraliya Tashrif Buyuruvchi Vizasi Arizasi (e-Visa)',
        nameRu: 'Заявление на Туристическую Визу в Австралию (e-Visa)',
        category: 'required',
        description:
          'Completed visitor visa application form or e-visa confirmation through ImmiAccount.',
        descriptionUz:
          "ImmiAccount orqali to'ldirilgan tashrif buyuruvchi vizasi ariza formasi yoki e-viza tasdiqnomasi.",
        descriptionRu:
          'Заполненная форма заявления на туристическую визу или подтверждение e-visa через ImmiAccount.',
        required: true,
        priority: 'high',
        whereToObtain: 'Complete online at immi.homeaffairs.gov.au',
        whereToObtainUz: "Onlayn to'ldiring: immi.homeaffairs.gov.au",
        whereToObtainRu: 'Заполните онлайн на immi.homeaffairs.gov.au',
      },
      {
        document: 'bank_statement',
        name: 'Bank Statement',
        nameUz: 'Bank Hisobi',
        nameRu: 'Банковская Выписка',
        category: 'required',
        description:
          'Bank statements from Uzbek bank showing sufficient funds for trip (last 3-6 months).',
        descriptionUz:
          "Sayohat uchun yetarli mablag'ni ko'rsatadigan O'zbekiston bankidan bank hisoblari (so'nggi 3-6 oy).",
        descriptionRu:
          'Банковские выписки из банка Узбекистана, показывающие достаточные средства на поездку (последние 3-6 месяцев).',
        required: true,
        priority: 'high',
        whereToObtain: 'Obtain from your bank branch in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi bank filialingizdan oling.",
        whereToObtainRu: 'Получите в отделении вашего банка в Узбекистане.',
      },
      {
        document: 'income_certificate',
        name: 'Income Certificate / Employment Letter',
        nameUz: 'Daromad Sertifikati / Ish Joyi Xati',
        nameRu: 'Справка о Доходах / Справка с Места Работы',
        category: 'required',
        description:
          'Official income certificate from employer or government portal, or employment letter confirming position and salary.',
        descriptionUz:
          'Ish beruvchi yoki davlat portalidan rasmiy daromad sertifikati, yoki lavozim va maoshni tasdiqlovchi ish joyi xati.',
        descriptionRu:
          'Официальная справка о доходах от работодателя или государственного портала, или справка с места работы, подтверждающая должность и зарплату.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Request from employer HR or obtain through official government portal in Uzbekistan.',
        whereToObtainUz:
          "Ish beruvchining HR bo'limidan so'rang yoki O'zbekistondagi rasmiy davlat portali orqali oling.",
        whereToObtainRu:
          'Запросите у HR работодателя или получите через официальный государственный портал в Узбекистане.',
      },
      {
        document: 'travel_itinerary',
        name: 'Travel Itinerary',
        nameUz: 'Sayohat Rejasi',
        nameRu: 'Маршрут Поездки',
        category: 'required',
        description:
          'Detailed travel itinerary showing planned activities, destinations, and approximate dates in Australia.',
        descriptionUz:
          "Avstraliyada rejalashtirilgan faoliyat, yo'nalishlar va taxminiy sanalarni ko'rsatadigan batafsil sayohat rejasi.",
        descriptionRu:
          'Подробный маршрут поездки, показывающий запланированные мероприятия, направления и приблизительные даты в Австралии.',
        required: true,
        priority: 'high',
        whereToObtain: 'Create your own itinerary or use travel planning tools.',
        whereToObtainUz:
          "O'zingiz reja tuzing yoki sayohat rejalashtirish vositalaridan foydalaning.",
        whereToObtainRu: 'Создайте свой маршрут или используйте инструменты планирования поездок.',
      },
      {
        document: 'accommodation_proof',
        name: 'Accommodation Proof',
        nameUz: 'Turar Joy Tasdiqnomasi',
        nameRu: 'Подтверждение Проживания',
        category: 'required',
        description:
          'Hotel booking confirmation or invitation letter with accommodation details for your stay in Australia.',
        descriptionUz:
          'Avstraliyada qolish uchun mehmonxona broni tasdiqnomasi yoki turar joy tafsilotlari bilan taklif xati.',
        descriptionRu:
          'Подтверждение бронирования отеля или пригласительное письмо с деталями размещения для вашего пребывания в Австралии.',
        required: true,
        priority: 'high',
        whereToObtain: 'Book through hotel website or request invitation from host in Australia.',
        whereToObtainUz:
          "Mehmonxona veb-sayti orqali bron qiling yoki Avstraliyadagi mezboningizdan taklif so'rang.",
        whereToObtainRu:
          'Забронируйте через сайт отеля или запросите приглашение у принимающего лица в Австралии.',
      },
      {
        document: 'return_ticket',
        name: 'Return Flight Ticket',
        nameUz: 'Qaytish Chiptasi',
        nameRu: 'Обратный Билет',
        category: 'highly_recommended',
        description: 'Round-trip flight booking showing intent to return to Uzbekistan.',
        descriptionUz: "O'zbekistonga qaytish niyatini ko'rsatadigan aylanma aviabilet broni.",
        descriptionRu:
          'Бронирование авиабилета туда-обратно, показывающее намерение вернуться в Узбекистан.',
        required: false,
        priority: 'high',
        whereToObtain: 'Book through airline or travel agency.',
        whereToObtainUz: 'Aviakompaniya yoki sayohat agentligi orqali bron qiling.',
        whereToObtainRu: 'Забронируйте через авиакомпанию или туристическое агентство.',
      },
      {
        document: 'property_document',
        name: 'Property Ownership Document',
        nameUz: 'Mulk Hujjati',
        nameRu: 'Документ о Праве Собственности',
        category: 'highly_recommended',
        description: 'Property ownership documents in Uzbekistan showing ties to home country.',
        descriptionUz: "Vatanga bog'liqlikni ko'rsatadigan O'zbekistondagi mulk hujjatlari.",
        descriptionRu:
          'Документы о праве собственности на недвижимость в Узбекистане, показывающие связи с родиной.',
        required: false,
        priority: 'high',
        whereToObtain: 'Obtain from cadastral office or property registry in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi kadastr idorasidan yoki mulk reestridan oling.",
        whereToObtainRu:
          'Получите в кадастровом управлении или реестре недвижимости в Узбекистане.',
      },
      {
        document: 'family_ties',
        name: 'Family Ties Document',
        nameUz: "Oila Bog'liqlik Hujjati",
        nameRu: 'Документ о Семейных Связях',
        category: 'highly_recommended',
        description:
          'Family certificate, marriage certificate, or birth certificates showing family members in Uzbekistan.',
        descriptionUz:
          "O'zbekistondagi oila a'zolarini ko'rsatadigan oila sertifikati, nikoh sertifikati yoki tug'ilganlik sertifikatlari.",
        descriptionRu:
          'Семейный сертификат, свидетельство о браке или свидетельства о рождении, показывающие членов семьи в Узбекистане.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Obtain from civil registry office (ZAGS) in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi fuqarolik holati idorasidan (ZAGS) oling.",
        whereToObtainRu:
          'Получите в отделе записи актов гражданского состояния (ЗАГС) в Узбекистане.',
      },
      {
        document: 'travel_insurance',
        name: 'Travel Insurance',
        nameUz: "Sayohat Sug'urtasi",
        nameRu: 'Туристическая Страховка',
        category: 'highly_recommended',
        description:
          'Travel insurance covering your entire trip to Australia including medical coverage.',
        descriptionUz:
          "Avstraliyaga sayohat uchun tibbiy qoplamani o'z ichiga olgan to'liq sayohat sug'urtasi.",
        descriptionRu:
          'Туристическая страховка, покрывающая всю вашу поездку в Австралию, включая медицинское покрытие.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Purchase from insurance company or travel agency.',
        whereToObtainUz: "Sug'urta kompaniyasidan yoki sayohat agentligidan xarid qiling.",
        whereToObtainRu: 'Приобретите у страховой компании или туристического агентства.',
      },
      {
        document: 'previous_visas',
        name: 'Previous Visas and Entry/Exit Stamps',
        nameUz: 'Oldingi Vizalar va Kirish/Chiqish Muhrlari',
        nameRu: 'Предыдущие Визы и Штампы Въезда/Выезда',
        category: 'optional',
        description: 'Copies of previous visas and entry/exit stamps showing travel history.',
        descriptionUz:
          "Sayohat tarixini ko'rsatadigan oldingi vizalar va kirish/chiqish muhrlarining nusxalari.",
        descriptionRu:
          'Копии предыдущих виз и штампов въезда/выезда, показывающие историю поездок.',
        required: false,
        priority: 'low',
        whereToObtain: 'Copy from your passport pages.',
        whereToObtainUz: 'Pasportingiz sahifalaridan nusxa oling.',
        whereToObtainRu: 'Скопируйте со страниц вашего паспорта.',
      },
      {
        document: 'cover_letter',
        name: 'Cover Letter',
        nameUz: 'Xat',
        nameRu: 'Сопроводительное Письмо',
        category: 'optional',
        description:
          'Cover letter explaining purpose of visit, ties to Uzbekistan, and intent to return.',
        descriptionUz:
          "Tashrif maqsadi, O'zbekistonga bog'liqlik va qaytish niyatini tushuntiruvchi xat.",
        descriptionRu:
          'Сопроводительное письмо, объясняющее цель визита, связи с Узбекистаном и намерение вернуться.',
        required: false,
        priority: 'low',
        whereToObtain: 'Write your own cover letter.',
        whereToObtainUz: "O'zingizning xatingizni yozing.",
        whereToObtainRu: 'Напишите свое сопроводительное письмо.',
      },
      {
        document: 'extra_financial_proof',
        name: 'Additional Financial Proof',
        nameUz: "Qo'shimcha Moliyaviy Tasdiq",
        nameRu: 'Дополнительное Финансовое Подтверждение',
        category: 'optional',
        description:
          'Savings certificates, fixed deposits, or other financial documents showing additional funds.',
        descriptionUz:
          "Qo'shimcha mablag'larni ko'rsatadigan jamg'arma sertifikatlari, muddatli depozitlar yoki boshqa moliyaviy hujjatlar.",
        descriptionRu:
          'Сертификаты сбережений, срочные депозиты или другие финансовые документы, показывающие дополнительные средства.',
        required: false,
        priority: 'low',
        whereToObtain: 'Obtain from your bank or financial institution in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi bankingizdan yoki moliya muassasasidan oling.",
        whereToObtainRu: 'Получите в вашем банке или финансовом учреждении в Узбекистане.',
      },
    ],
  },
  DE: {
    student: [],
    tourist: [
      {
        document: 'passport',
        name: 'Valid Passport',
        nameUz: 'Yaroqli Pasport',
        nameRu: 'Действительный Паспорт',
        category: 'required',
        description:
          'Uzbek biometric passport valid at least 6 months after planned return, with at least 2 blank pages.',
        descriptionUz:
          "Rejalashtirilgan qaytishdan keyin kamida 6 oy muddati qolgan, kamida 2 ta bo'sh sahifasi bo'lgan O'zbekiston biometrik pasporti.",
        descriptionRu:
          'Биометрический паспорт Узбекистана, действительный не менее 6 месяцев после запланированного возвращения, с не менее чем 2 пустыми страницами.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Apply at your local migration service or internal affairs office in Uzbekistan.',
        whereToObtainUz:
          "O'zbekistondagi mahalliy migratsiya xizmatiga yoki ichki ishlar organlariga murojaat qiling.",
        whereToObtainRu:
          'Обратитесь в местную службу миграции или органы внутренних дел в Узбекистане.',
      },
      {
        document: 'passport_photo',
        name: 'Biometric Passport Photo',
        nameUz: 'Biometrik Pasport Fotosi',
        nameRu: 'Биометрическое Фото на Паспорт',
        category: 'required',
        description: 'Biometric photo 35x45mm with white background, taken within last 6 months.',
        descriptionUz: "Oq fonda 35x45mm biometrik foto, so'nggi 6 oy ichida olingan.",
        descriptionRu:
          'Биометрическое фото 35x45мм на белом фоне, сделанное в течение последних 6 месяцев.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Take at photo studio in Uzbekistan that provides Schengen-compliant photos.',
        whereToObtainUz:
          "Shengen talablariga javob beradigan O'zbekistondagi foto studiyada oling.",
        whereToObtainRu:
          'Сделайте в фотостудии в Узбекистане, которая предоставляет фото, соответствующие требованиям Шенгена.',
      },
      {
        document: 'visa_application_form',
        name: 'Schengen Visa Application Form',
        nameUz: 'Shengen Viza Ariza Formasi',
        nameRu: 'Форма Заявления на Шенгенскую Визу',
        category: 'required',
        description:
          'Completed Schengen visa application form for Germany (visa application center or embassy).',
        descriptionUz:
          "Germaniya uchun to'ldirilgan Shengen viza ariza formasi (viza ariza markazi yoki elchixona).",
        descriptionRu:
          'Заполненная форма заявления на шенгенскую визу для Германии (центр подачи заявлений на визу или посольство).',
        required: true,
        priority: 'high',
        whereToObtain:
          'Download from German embassy website or obtain from visa application center.',
        whereToObtainUz:
          'Germaniya elchixonasi veb-saytidan yuklab oling yoki viza ariza markazidan oling.',
        whereToObtainRu:
          'Скачайте с веб-сайта посольства Германии или получите в центре подачи заявлений на визу.',
      },
      {
        document: 'travel_insurance',
        name: 'Travel Medical Insurance (€30,000 minimum)',
        nameUz: "Sayohat Tibbiy Sug'urtasi (kamida €30,000)",
        nameRu: 'Туристическая Медицинская Страховка (минимум €30,000)',
        category: 'required',
        description:
          'Travel medical insurance with minimum €30,000 coverage valid for all Schengen countries for entire trip duration.',
        descriptionUz:
          "Butun sayohat davri uchun barcha Shengen mamlakatlarida yaroqli, kamida €30,000 qoplamali sayohat tibbiy sug'urtasi.",
        descriptionRu:
          'Туристическая медицинская страховка с минимальным покрытием €30,000, действительная для всех стран Шенгена на весь период поездки.',
        required: true,
        priority: 'high',
        whereToObtain: 'Purchase from insurance company that provides Schengen-compliant coverage.',
        whereToObtainUz:
          "Shengen talablariga javob beradigan qoplamani ta'minlaydigan sug'urta kompaniyasidan xarid qiling.",
        whereToObtainRu:
          'Приобретите у страховой компании, которая предоставляет покрытие, соответствующее требованиям Шенгена.',
      },
      {
        document: 'bank_statement',
        name: 'Bank Statement',
        nameUz: 'Bank Hisobi',
        nameRu: 'Банковская Выписка',
        category: 'required',
        description:
          'Bank statements from Uzbek bank showing sufficient funds for trip (last 3-6 months).',
        descriptionUz:
          "Sayohat uchun yetarli mablag'ni ko'rsatadigan O'zbekiston bankidan bank hisoblari (so'nggi 3-6 oy).",
        descriptionRu:
          'Банковские выписки из банка Узбекистана, показывающие достаточные средства на поездку (последние 3-6 месяцев).',
        required: true,
        priority: 'high',
        whereToObtain: 'Obtain from your bank branch in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi bank filialingizdan oling.",
        whereToObtainRu: 'Получите в отделении вашего банка в Узбекистане.',
      },
      {
        document: 'income_certificate',
        name: 'Income Certificate / Employment Letter',
        nameUz: 'Daromad Sertifikati / Ish Joyi Xati',
        nameRu: 'Справка о Доходах / Справка с Места Работы',
        category: 'required',
        description:
          'Official income certificate from employer or government portal, or employment letter confirming position, salary, and approved leave.',
        descriptionUz:
          "Ish beruvchi yoki davlat portalidan rasmiy daromad sertifikati, yoki lavozim, maosh va tasdiqlangan ta'tilni tasdiqlovchi ish joyi xati.",
        descriptionRu:
          'Официальная справка о доходах от работодателя или государственного портала, или справка с места работы, подтверждающая должность, зарплату и утвержденный отпуск.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Request from employer HR or obtain through official government portal in Uzbekistan.',
        whereToObtainUz:
          "Ish beruvchining HR bo'limidan so'rang yoki O'zbekistondagi rasmiy davlat portali orqali oling.",
        whereToObtainRu:
          'Запросите у HR работодателя или получите через официальный государственный портал в Узбекистане.',
      },
      {
        document: 'flight_booking',
        name: 'Flight Booking (Round-Trip)',
        nameUz: 'Aviabilet Broni (Aylanma)',
        nameRu: 'Бронирование Авиабилета (Туда-Обратно)',
        category: 'required',
        description: 'Round-trip flight booking showing travel dates to and from Germany.',
        descriptionUz:
          "Germaniyaga va undan qaytish sanalarini ko'rsatadigan aylanma aviabilet broni.",
        descriptionRu:
          'Бронирование авиабилета туда-обратно, показывающее даты поездки в Германию и обратно.',
        required: true,
        priority: 'high',
        whereToObtain: 'Book through airline or travel agency.',
        whereToObtainUz: 'Aviakompaniya yoki sayohat agentligi orqali bron qiling.',
        whereToObtainRu: 'Забронируйте через авиакомпанию или туристическое агентство.',
      },
      {
        document: 'accommodation_proof',
        name: 'Proof of Accommodation',
        nameUz: 'Turar Joy Tasdiqnomasi',
        nameRu: 'Подтверждение Проживания',
        category: 'required',
        description:
          'Hotel booking confirmation, invitation letter, or accommodation voucher for your stay in Germany.',
        descriptionUz:
          'Germaniyada qolish uchun mehmonxona broni tasdiqnomasi, taklif xati yoki turar joy vaucheri.',
        descriptionRu:
          'Подтверждение бронирования отеля, пригласительное письмо или ваучер на размещение для вашего пребывания в Германии.',
        required: true,
        priority: 'high',
        whereToObtain: 'Book through hotel website or request invitation from host in Germany.',
        whereToObtainUz:
          "Mehmonxona veb-sayti orqali bron qiling yoki Germaniyadagi mezboningizdan taklif so'rang.",
        whereToObtainRu:
          'Забронируйте через сайт отеля или запросите приглашение у принимающего лица в Германии.',
      },
      {
        document: 'property_document',
        name: 'Property Ownership Document',
        nameUz: 'Mulk Hujjati',
        nameRu: 'Документ о Праве Собственности',
        category: 'highly_recommended',
        description: 'Property ownership documents in Uzbekistan showing ties to home country.',
        descriptionUz: "Vatanga bog'liqlikni ko'rsatadigan O'zbekistondagi mulk hujjatlari.",
        descriptionRu:
          'Документы о праве собственности на недвижимость в Узбекистане, показывающие связи с родиной.',
        required: false,
        priority: 'high',
        whereToObtain: 'Obtain from cadastral office or property registry in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi kadastr idorasidan yoki mulk reestridan oling.",
        whereToObtainRu:
          'Получите в кадастровом управлении или реестре недвижимости в Узбекистане.',
      },
      {
        document: 'family_ties',
        name: 'Family Ties Document',
        nameUz: "Oila Bog'liqlik Hujjati",
        nameRu: 'Документ о Семейных Связях',
        category: 'highly_recommended',
        description:
          'Family certificate, marriage certificate, or birth certificates showing family members in Uzbekistan.',
        descriptionUz:
          "O'zbekistondagi oila a'zolarini ko'rsatadigan oila sertifikati, nikoh sertifikati yoki tug'ilganlik sertifikatlari.",
        descriptionRu:
          'Семейный сертификат, свидетельство о браке или свидетельства о рождении, показывающие членов семьи в Узбекистане.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Obtain from civil registry office (ZAGS) in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi fuqarolik holati idorasidan (ZAGS) oling.",
        whereToObtainRu:
          'Получите в отделе записи актов гражданского состояния (ЗАГС) в Узбекистане.',
      },
      {
        document: 'previous_schengen_visas',
        name: 'Previous Schengen / Other Visas',
        nameUz: 'Oldingi Shengen / Boshqa Vizalar',
        nameRu: 'Предыдущие Шенгенские / Другие Визы',
        category: 'highly_recommended',
        description: 'Copies of previous Schengen visas or other visas showing travel history.',
        descriptionUz:
          "Sayohat tarixini ko'rsatadigan oldingi Shengen vizalari yoki boshqa vizalarning nusxalari.",
        descriptionRu:
          'Копии предыдущих шенгенских виз или других виз, показывающие историю поездок.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Copy from your passport pages.',
        whereToObtainUz: 'Pasportingiz sahifalaridan nusxa oling.',
        whereToObtainRu: 'Скопируйте со страниц вашего паспорта.',
      },
      {
        document: 'travel_itinerary',
        name: 'Detailed Travel Itinerary',
        nameUz: 'Batafsil Sayohat Rejasi',
        nameRu: 'Подробный Маршрут Поездки',
        category: 'highly_recommended',
        description:
          'Day-by-day travel itinerary showing planned activities and destinations in Germany.',
        descriptionUz:
          "Germaniyada rejalashtirilgan faoliyat va yo'nalishlarni ko'rsatadigan kunlik sayohat rejasi.",
        descriptionRu:
          'Дневной маршрут поездки, показывающий запланированные мероприятия и направления в Германии.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Create your own detailed itinerary or use travel planning tools.',
        whereToObtainUz:
          "O'zingizning batafsil rejangizni yarating yoki sayohat rejalashtirish vositalaridan foydalaning.",
        whereToObtainRu:
          'Создайте свой подробный маршрут или используйте инструменты планирования поездок.',
      },
      {
        document: 'cover_letter',
        name: 'Cover Letter',
        nameUz: 'Xat',
        nameRu: 'Сопроводительное Письмо',
        category: 'optional',
        description:
          'Cover letter explaining purpose of trip, ties to Uzbekistan, and intent to return.',
        descriptionUz:
          "Sayohat maqsadi, O'zbekistonga bog'liqlik va qaytish niyatini tushuntiruvchi xat.",
        descriptionRu:
          'Сопроводительное письмо, объясняющее цель поездки, связи с Узбекистаном и намерение вернуться.',
        required: false,
        priority: 'low',
        whereToObtain: 'Write your own cover letter.',
        whereToObtainUz: "O'zingizning xatingizni yozing.",
        whereToObtainRu: 'Напишите свое сопроводительное письмо.',
      },
      {
        document: 'additional_sponsor_docs',
        name: 'Additional Sponsor Documents',
        nameUz: "Qo'shimcha Homiy Hujjatlari",
        nameRu: 'Дополнительные Документы Спонсора',
        category: 'optional',
        description:
          'If someone else is paying for your trip, include their financial documents and sponsorship letter.',
        descriptionUz:
          "Agar kimdir sizning sayohatingiz uchun to'layotgan bo'lsa, ularning moliyaviy hujjatlari va homiy xatini qo'shing.",
        descriptionRu:
          'Если кто-то другой оплачивает вашу поездку, приложите их финансовые документы и письмо спонсора.',
        required: false,
        priority: 'low',
        whereToObtain: 'Request from your sponsor in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi homiyingizdan so'rang.",
        whereToObtainRu: 'Запросите у вашего спонсора в Узбекистане.',
      },
    ],
  },
  ES: {
    student: [
      {
        document: 'passport',
        name: 'Valid Passport',
        nameUz: 'Yaroqli Pasport',
        nameRu: 'Действительный Паспорт',
        category: 'required',
        description:
          'Uzbek biometric passport valid at least 6 months after your planned return date from Spain.',
        descriptionUz:
          "Ispaniyadan rejalashtirilgan qaytish sanasidan keyin kamida 6 oy muddati qolgan O'zbekiston biometrik pasporti.",
        descriptionRu:
          'Биометрический паспорт Узбекистана, действительный не менее 6 месяцев после запланированной даты возвращения из Испании.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Apply at your local migration service or internal affairs office in Uzbekistan.',
        whereToObtainUz:
          "O'zbekistondagi mahalliy migratsiya xizmatiga yoki ichki ishlar organlariga murojaat qiling.",
        whereToObtainRu:
          'Обратитесь в местную службу миграции или органы внутренних дел в Узбекистане.',
      },
      {
        document: 'passport_photo',
        name: 'Biometric Passport Photo',
        nameUz: 'Biometrik Pasport Fotosi',
        nameRu: 'Биометрическое Фото на Паспорт',
        category: 'required',
        description: 'Biometric photo 35x45mm with white background, taken within last 6 months.',
        descriptionUz: "Oq fonda 35x45mm biometrik foto, so'nggi 6 oy ichida olingan.",
        descriptionRu:
          'Биометрическое фото 35x45мм на белом фоне, сделанное в течение последних 6 месяцев.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Take at photo studio in Uzbekistan that provides Schengen-compliant photos.',
        whereToObtainUz:
          "Shengen talablariga javob beradigan O'zbekistondagi foto studiyada oling.",
        whereToObtainRu:
          'Сделайте в фотостудии в Узбекистане, которая предоставляет фото, соответствующие требованиям Шенгена.',
      },
      {
        document: 'visa_application_form',
        name: 'Spain National Student Visa Application',
        nameUz: 'Ispaniya Milliy Talaba Vizasi Arizasi',
        nameRu: 'Заявление на Национальную Студенческую Визу в Испанию',
        category: 'required',
        description:
          'Completed national student visa application form for Spain (long-term study visa).',
        descriptionUz:
          "Ispaniya uchun to'ldirilgan milliy talaba vizasi ariza formasi (uzoq muddatli o'qish vizasi).",
        descriptionRu:
          'Заполненная форма заявления на национальную студенческую визу в Испанию (долгосрочная учебная виза).',
        required: true,
        priority: 'high',
        whereToObtain:
          'Download from Spanish embassy website or obtain from visa application center.',
        whereToObtainUz:
          'Ispaniya elchixonasi veb-saytidan yuklab oling yoki viza ariza markazidan oling.',
        whereToObtainRu:
          'Скачайте с веб-сайта посольства Испании или получите в центре подачи заявлений на визу.',
      },
      {
        document: 'letter_of_acceptance',
        name: 'Letter of Acceptance / Enrollment',
        nameUz: "Qabul Xati / Ro'yxatdan O'tish",
        nameRu: 'Письмо о Зачислении / Зачисление',
        category: 'required',
        description:
          'Letter of acceptance or enrollment confirmation from Spanish university or academy.',
        descriptionUz:
          "Ispaniya universiteti yoki akademiyasidan qabul xati yoki ro'yxatdan o'tish tasdiqnomasi.",
        descriptionRu:
          'Письмо о зачислении или подтверждение зачисления от испанского университета или академии.',
        required: true,
        priority: 'high',
        whereToObtain: 'Request from your Spanish educational institution.',
        whereToObtainUz: "Ispaniya ta'lim muassasangizdan so'rang.",
        whereToObtainRu: 'Запросите в вашем учебном заведении Испании.',
      },
      {
        document: 'tuition_payment_proof',
        name: 'Tuition Payment Proof / Deposit',
        nameUz: "To'lov Kvitansiyasi / Depozit",
        nameRu: 'Квитанция об Оплате Обучения / Депозит',
        category: 'required',
        description:
          'Proof of tuition payment or deposit receipt from your Spanish institution (if required).',
        descriptionUz:
          "Ispaniya muassasangizdan o'qish to'lovi yoki depozit kvitansiyasi (agar talab qilinsa).",
        descriptionRu:
          'Подтверждение оплаты обучения или квитанция о депозите от вашего учебного заведения Испании (если требуется).',
        required: true,
        priority: 'high',
        whereToObtain: 'Request from your Spanish school or university.',
        whereToObtainUz: "Ispaniya maktabingiz yoki universitetingizdan so'rang.",
        whereToObtainRu: 'Запросите в вашей школе или университете в Испании.',
      },
      {
        document: 'bank_statement',
        name: 'Bank Statement',
        nameUz: 'Bank Hisobi',
        nameRu: 'Банковская Выписка',
        category: 'required',
        description:
          "Bank statements from Uzbek bank showing sufficient funds meeting Spain's minimum living cost requirements (last 3-6 months).",
        descriptionUz:
          "Ispaniyaning minimal yashash xarajatlari talablariga javob beradigan yetarli mablag'ni ko'rsatadigan O'zbekiston bankidan bank hisoblari (so'nggi 3-6 oy).",
        descriptionRu:
          'Банковские выписки из банка Узбекистана, показывающие достаточные средства, соответствующие минимальным требованиям к расходам на проживание в Испании (последние 3-6 месяцев).',
        required: true,
        priority: 'high',
        whereToObtain: 'Obtain from your bank branch in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi bank filialingizdan oling.",
        whereToObtainRu: 'Получите в отделении вашего банка в Узбекистане.',
      },
      {
        document: 'sponsor_income_certificate',
        name: "Sponsor's Income Certificate + Employment Docs",
        nameUz: 'Homiyning Daromad Sertifikati + Ish Hujjatlari',
        nameRu: 'Справка о Доходах Спонсора + Трудовые Документы',
        category: 'required',
        description:
          'Income certificate and employment documents from sponsor (parents or other sponsor) in Uzbekistan showing financial support.',
        descriptionUz:
          "O'zbekistondagi homiy (ota-ona yoki boshqa homiy) tomonidan moliyaviy yordamni ko'rsatadigan daromad sertifikati va ish hujjatlari.",
        descriptionRu:
          'Справка о доходах и трудовые документы от спонсора (родителей или другого спонсора) в Узбекистане, показывающие финансовую поддержку.',
        required: true,
        priority: 'high',
        whereToObtain:
          "Request from sponsor's employer HR or obtain through official government portal in Uzbekistan.",
        whereToObtainUz:
          "Homiyning ish beruvchisining HR bo'limidan so'rang yoki O'zbekistondagi rasmiy davlat portali orqali oling.",
        whereToObtainRu:
          'Запросите у HR работодателя спонсора или получите через официальный государственный портал в Узбекистане.',
      },
      {
        document: 'medical_insurance',
        name: 'Medical Insurance (Schengen Coverage)',
        nameUz: "Tibbiy Sug'urta (Shengen Qoplamasi)",
        nameRu: 'Медицинская Страховка (Покрытие Шенгена)',
        category: 'required',
        description:
          'Medical insurance valid in Spain for full stay with Schengen-level coverage (minimum €30,000).',
        descriptionUz:
          "Butun qolish muddati uchun Ispaniyada yaroqli, Shengen darajasidagi qoplamali tibbiy sug'urta (kamida €30,000).",
        descriptionRu:
          'Медицинская страховка, действительная в Испании на весь период пребывания с покрытием уровня Шенгена (минимум €30,000).',
        required: true,
        priority: 'high',
        whereToObtain: 'Purchase from insurance company that provides Schengen-compliant coverage.',
        whereToObtainUz:
          "Shengen talablariga javob beradigan qoplamani ta'minlaydigan sug'urta kompaniyasidan xarid qiling.",
        whereToObtainRu:
          'Приобретите у страховой компании, которая предоставляет покрытие, соответствующее требованиям Шенгена.',
      },
      {
        document: 'property_document',
        name: 'Property Ownership Document',
        nameUz: 'Mulk Hujjati',
        nameRu: 'Документ о Праве Собственности',
        category: 'highly_recommended',
        description: 'Property ownership documents in Uzbekistan showing ties to home country.',
        descriptionUz: "Vatanga bog'liqlikni ko'rsatadigan O'zbekistondagi mulk hujjatlari.",
        descriptionRu:
          'Документы о праве собственности на недвижимость в Узбекистане, показывающие связи с родиной.',
        required: false,
        priority: 'high',
        whereToObtain: 'Obtain from cadastral office or property registry in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi kadastr idorasidan yoki mulk reestridan oling.",
        whereToObtainRu:
          'Получите в кадастровом управлении или реестре недвижимости в Узбекистане.',
      },
      {
        document: 'current_study_proof',
        name: 'Proof of Current Study Status',
        nameUz: "Joriy O'qish Holati Tasdiqnomasi",
        nameRu: 'Подтверждение Текущего Статуса Обучения',
        category: 'highly_recommended',
        description:
          'Student certificate or transcript from your current educational institution in Uzbekistan.',
        descriptionUz:
          "O'zbekistondagi joriy ta'lim muassasangizdan talaba sertifikati yoki transkript.",
        descriptionRu:
          'Сертификат студента или транскрипт из вашего текущего учебного заведения в Узбекистане.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Request from your current school or university in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi joriy maktabingiz yoki universitetingizdan so'rang.",
        whereToObtainRu: 'Запросите в вашей текущей школе или университете в Узбекистане.',
      },
      {
        document: 'previous_visas',
        name: 'Previous Visa Copies',
        nameUz: 'Oldingi Viza Nusxalari',
        nameRu: 'Копии Предыдущих Виз',
        category: 'highly_recommended',
        description: 'Copies of previous visas (Schengen, other countries) showing travel history.',
        descriptionUz:
          "Sayohat tarixini ko'rsatadigan oldingi vizalarning nusxalari (Shengen, boshqa mamlakatlar).",
        descriptionRu:
          'Копии предыдущих виз (Шенген, другие страны), показывающие историю поездок.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Copy from your passport pages.',
        whereToObtainUz: 'Pasportingiz sahifalaridan nusxa oling.',
        whereToObtainRu: 'Скопируйте со страниц вашего паспорта.',
      },
      {
        document: 'study_plan',
        name: 'Study Plan / Motivation Letter',
        nameUz: "O'qish Rejasi / Motivatsiya Xati",
        nameRu: 'План Обучения / Мотивационное Письмо',
        category: 'highly_recommended',
        description:
          'Detailed study plan or motivation letter explaining your study goals and future plans.',
        descriptionUz:
          "O'qish maqsadlari va kelajakdagi rejalaringizni tushuntiruvchi batafsil o'qish rejasi yoki motivatsiya xati.",
        descriptionRu:
          'Подробный план обучения или мотивационное письмо, объясняющее ваши цели обучения и будущие планы.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Write your own study plan or motivation letter.',
        whereToObtainUz: "O'zingizning o'qish rejangizni yoki motivatsiya xatingizni yozing.",
        whereToObtainRu: 'Напишите свой план обучения или мотивационное письмо.',
      },
      {
        document: 'language_certificate',
        name: 'Language Certificate (DELE, IELTS, etc.)',
        nameUz: 'Til Sertifikati (DELE, IELTS va boshqalar)',
        nameRu: 'Сертификат о Знании Языка (DELE, IELTS и т.д.)',
        category: 'optional',
        description:
          'Spanish or English language proficiency certificate if required by your course.',
        descriptionUz:
          'Agar kursingiz talab qilsa, ispan yoki ingliz tili bilim darajasi sertifikati.',
        descriptionRu:
          'Сертификат о знании испанского или английского языка, если требуется вашим курсом.',
        required: false,
        priority: 'low',
        whereToObtain: 'Take DELE, IELTS, or other language test at authorized test center.',
        whereToObtainUz:
          "Ruxsat etilgan test markazida DELE, IELTS yoki boshqa til testidan o'ting.",
        whereToObtainRu:
          'Сдайте тест DELE, IELTS или другой языковой тест в авторизованном тестовом центре.',
      },
      {
        document: 'extra_sponsor_docs',
        name: 'Extra Sponsorship Documents',
        nameUz: "Qo'shimcha Homiy Hujjatlari",
        nameRu: 'Дополнительные Документы Спонсора',
        category: 'optional',
        description:
          'Additional financial documents from sponsor if available (property docs, additional bank statements).',
        descriptionUz:
          "Agar mavjud bo'lsa, homiydan qo'shimcha moliyaviy hujjatlar (mulk hujjatlari, qo'shimcha bank hisoblari).",
        descriptionRu:
          'Дополнительные финансовые документы от спонсора, если доступны (документы о недвижимости, дополнительные банковские выписки).',
        required: false,
        priority: 'low',
        whereToObtain: 'Request from your sponsor in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi homiyingizdan so'rang.",
        whereToObtainRu: 'Запросите у вашего спонсора в Узбекистане.',
      },
      {
        document: 'cover_letter',
        name: 'Cover Letter',
        nameUz: 'Xat',
        nameRu: 'Сопроводительное Письмо',
        category: 'optional',
        description:
          'Cover letter explaining future plans, ties to Uzbekistan, and intent to return.',
        descriptionUz:
          "Kelajakdagi rejalar, O'zbekistonga bog'liqlik va qaytish niyatini tushuntiruvchi xat.",
        descriptionRu:
          'Сопроводительное письмо, объясняющее будущие планы, связи с Узбекистаном и намерение вернуться.',
        required: false,
        priority: 'low',
        whereToObtain: 'Write your own cover letter.',
        whereToObtainUz: "O'zingizning xatingizni yozing.",
        whereToObtainRu: 'Напишите свое сопроводительное письмо.',
      },
    ],
    tourist: [
      {
        document: 'passport',
        name: 'Valid Passport',
        nameUz: 'Yaroqli Pasport',
        nameRu: 'Действительный Паспорт',
        category: 'required',
        description:
          'Uzbek biometric passport valid at least 6 months after your planned return date from Spain.',
        descriptionUz:
          "Ispaniyadan rejalashtirilgan qaytish sanasidan keyin kamida 6 oy muddati qolgan O'zbekiston biometrik pasporti.",
        descriptionRu:
          'Биометрический паспорт Узбекистана, действительный не менее 6 месяцев после запланированной даты возвращения из Испании.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Apply at your local migration service or internal affairs office in Uzbekistan.',
        whereToObtainUz:
          "O'zbekistondagi mahalliy migratsiya xizmatiga yoki ichki ishlar organlariga murojaat qiling.",
        whereToObtainRu:
          'Обратитесь в местную службу миграции или органы внутренних дел в Узбекистане.',
      },
      {
        document: 'passport_photo',
        name: 'Biometric Passport Photo',
        nameUz: 'Biometrik Pasport Fotosi',
        nameRu: 'Биометрическое Фото на Паспорт',
        category: 'required',
        description: 'Biometric photo 35x45mm with white background, taken within last 6 months.',
        descriptionUz: "Oq fonda 35x45mm biometrik foto, so'nggi 6 oy ichida olingan.",
        descriptionRu:
          'Биометрическое фото 35x45мм на белом фоне, сделанное в течение последних 6 месяцев.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Take at photo studio in Uzbekistan that provides Schengen-compliant photos.',
        whereToObtainUz:
          "Shengen talablariga javob beradigan O'zbekistondagi foto studiyada oling.",
        whereToObtainRu:
          'Сделайте в фотостудии в Узбекистане, которая предоставляет фото, соответствующие требованиям Шенгена.',
      },
      {
        document: 'visa_application_form',
        name: 'Schengen Visa Application Form (Spain)',
        nameUz: 'Shengen Viza Ariza Formasi (Ispaniya)',
        nameRu: 'Форма Заявления на Шенгенскую Визу (Испания)',
        category: 'required',
        description:
          'Completed Schengen visa application form for Spain (visa application center or embassy).',
        descriptionUz:
          "Ispaniya uchun to'ldirilgan Shengen viza ariza formasi (viza ariza markazi yoki elchixona).",
        descriptionRu:
          'Заполненная форма заявления на шенгенскую визу для Испании (центр подачи заявлений на визу или посольство).',
        required: true,
        priority: 'high',
        whereToObtain:
          'Download from Spanish embassy website or obtain from visa application center.',
        whereToObtainUz:
          'Ispaniya elchixonasi veb-saytidan yuklab oling yoki viza ariza markazidan oling.',
        whereToObtainRu:
          'Скачайте с веб-сайта посольства Испании или получите в центре подачи заявлений на визу.',
      },
      {
        document: 'travel_insurance',
        name: 'Travel Medical Insurance (€30,000 minimum)',
        nameUz: "Sayohat Tibbiy Sug'urtasi (kamida €30,000)",
        nameRu: 'Туристическая Медицинская Страховка (минимум €30,000)',
        category: 'required',
        description:
          'Travel medical insurance with minimum €30,000 coverage valid for all Schengen countries for entire trip duration.',
        descriptionUz:
          "Butun sayohat davri uchun barcha Shengen mamlakatlarida yaroqli, kamida €30,000 qoplamali sayohat tibbiy sug'urtasi.",
        descriptionRu:
          'Туристическая медицинская страховка с минимальным покрытием €30,000, действительная для всех стран Шенгена на весь период поездки.',
        required: true,
        priority: 'high',
        whereToObtain: 'Purchase from insurance company that provides Schengen-compliant coverage.',
        whereToObtainUz:
          "Shengen talablariga javob beradigan qoplamani ta'minlaydigan sug'urta kompaniyasidan xarid qiling.",
        whereToObtainRu:
          'Приобретите у страховой компании, которая предоставляет покрытие, соответствующее требованиям Шенгена.',
      },
      {
        document: 'bank_statement',
        name: 'Bank Statement',
        nameUz: 'Bank Hisobi',
        nameRu: 'Банковская Выписка',
        category: 'required',
        description:
          'Bank statements from Uzbek bank showing sufficient funds for trip (last 3-6 months).',
        descriptionUz:
          "Sayohat uchun yetarli mablag'ni ko'rsatadigan O'zbekiston bankidan bank hisoblari (so'nggi 3-6 oy).",
        descriptionRu:
          'Банковские выписки из банка Узбекистана, показывающие достаточные средства на поездку (последние 3-6 месяцев).',
        required: true,
        priority: 'high',
        whereToObtain: 'Obtain from your bank branch in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi bank filialingizdan oling.",
        whereToObtainRu: 'Получите в отделении вашего банка в Узбекистане.',
      },
      {
        document: 'income_certificate',
        name: 'Income Certificate / Employment Letter',
        nameUz: 'Daromad Sertifikati / Ish Joyi Xati',
        nameRu: 'Справка о Доходах / Справка с Места Работы',
        category: 'required',
        description:
          'Official income certificate from employer or government portal, or employment letter confirming position, salary, and approved leave.',
        descriptionUz:
          "Ish beruvchi yoki davlat portalidan rasmiy daromad sertifikati, yoki lavozim, maosh va tasdiqlangan ta'tilni tasdiqlovchi ish joyi xati.",
        descriptionRu:
          'Официальная справка о доходах от работодателя или государственного портала, или справка с места работы, подтверждающая должность, зарплату и утвержденный отпуск.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Request from employer HR or obtain through official government portal in Uzbekistan.',
        whereToObtainUz:
          "Ish beruvchining HR bo'limidan so'rang yoki O'zbekistondagi rasmiy davlat portali orqali oling.",
        whereToObtainRu:
          'Запросите у HR работодателя или получите через официальный государственный портал в Узбекистане.',
      },
      {
        document: 'flight_booking',
        name: 'Flight Booking (Round-Trip)',
        nameUz: 'Aviabilet Broni (Aylanma)',
        nameRu: 'Бронирование Авиабилета (Туда-Обратно)',
        category: 'required',
        description: 'Round-trip flight booking showing travel dates to and from Spain.',
        descriptionUz:
          "Ispaniyaga va undan qaytish sanalarini ko'rsatadigan aylanma aviabilet broni.",
        descriptionRu:
          'Бронирование авиабилета туда-обратно, показывающее даты поездки в Испанию и обратно.',
        required: true,
        priority: 'high',
        whereToObtain: 'Book through airline or travel agency.',
        whereToObtainUz: 'Aviakompaniya yoki sayohat agentligi orqali bron qiling.',
        whereToObtainRu: 'Забронируйте через авиакомпанию или туристическое агентство.',
      },
      {
        document: 'accommodation_proof',
        name: 'Proof of Accommodation',
        nameUz: 'Turar Joy Tasdiqnomasi',
        nameRu: 'Подтверждение Проживания',
        category: 'required',
        description:
          'Hotel booking confirmation, invitation letter, or accommodation voucher for your stay in Spain.',
        descriptionUz:
          'Ispaniyada qolish uchun mehmonxona broni tasdiqnomasi, taklif xati yoki turar joy vaucheri.',
        descriptionRu:
          'Подтверждение бронирования отеля, пригласительное письмо или ваучер на размещение для вашего пребывания в Испании.',
        required: true,
        priority: 'high',
        whereToObtain: 'Book through hotel website or request invitation from host in Spain.',
        whereToObtainUz:
          "Mehmonxona veb-sayti orqali bron qiling yoki Ispaniyadagi mezboningizdan taklif so'rang.",
        whereToObtainRu:
          'Забронируйте через сайт отеля или запросите приглашение у принимающего лица в Испании.',
      },
      {
        document: 'property_document',
        name: 'Property Ownership Document',
        nameUz: 'Mulk Hujjati',
        nameRu: 'Документ о Праве Собственности',
        category: 'highly_recommended',
        description: 'Property ownership documents in Uzbekistan showing ties to home country.',
        descriptionUz: "Vatanga bog'liqlikni ko'rsatadigan O'zbekistondagi mulk hujjatlari.",
        descriptionRu:
          'Документы о праве собственности на недвижимость в Узбекистане, показывающие связи с родиной.',
        required: false,
        priority: 'high',
        whereToObtain: 'Obtain from cadastral office or property registry in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi kadastr idorasidan yoki mulk reestridan oling.",
        whereToObtainRu:
          'Получите в кадастровом управлении или реестре недвижимости в Узбекистане.',
      },
      {
        document: 'family_ties',
        name: 'Family Ties Document',
        nameUz: "Oila Bog'liqlik Hujjati",
        nameRu: 'Документ о Семейных Связях',
        category: 'highly_recommended',
        description:
          'Family certificate, marriage certificate, or birth certificates showing family members in Uzbekistan.',
        descriptionUz:
          "O'zbekistondagi oila a'zolarini ko'rsatadigan oila sertifikati, nikoh sertifikati yoki tug'ilganlik sertifikatlari.",
        descriptionRu:
          'Семейный сертификат, свидетельство о браке или свидетельства о рождении, показывающие членов семьи в Узбекистане.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Obtain from civil registry office (ZAGS) in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi fuqarolik holati idorasidan (ZAGS) oling.",
        whereToObtainRu:
          'Получите в отделе записи актов гражданского состояния (ЗАГС) в Узбекистане.',
      },
      {
        document: 'previous_visas',
        name: 'Previous Schengen / Other Visas',
        nameUz: 'Oldingi Shengen / Boshqa Vizalar',
        nameRu: 'Предыдущие Шенгенские / Другие Визы',
        category: 'highly_recommended',
        description: 'Copies of previous Schengen visas or other visas showing travel history.',
        descriptionUz:
          "Sayohat tarixini ko'rsatadigan oldingi Shengen vizalari yoki boshqa vizalarning nusxalari.",
        descriptionRu:
          'Копии предыдущих шенгенских виз или других виз, показывающие историю поездок.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Copy from your passport pages.',
        whereToObtainUz: 'Pasportingiz sahifalaridan nusxa oling.',
        whereToObtainRu: 'Скопируйте со страниц вашего паспорта.',
      },
      {
        document: 'travel_itinerary',
        name: 'Travel Itinerary',
        nameUz: 'Sayohat Rejasi',
        nameRu: 'Маршрут Поездки',
        category: 'highly_recommended',
        description:
          'Detailed travel itinerary showing planned activities and destinations in Spain.',
        descriptionUz:
          "Ispaniyada rejalashtirilgan faoliyat va yo'nalishlarni ko'rsatadigan batafsil sayohat rejasi.",
        descriptionRu:
          'Подробный маршрут поездки, показывающий запланированные мероприятия и направления в Испании.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Create your own itinerary or use travel planning tools.',
        whereToObtainUz:
          "O'zingiz reja tuzing yoki sayohat rejalashtirish vositalaridan foydalaning.",
        whereToObtainRu: 'Создайте свой маршрут или используйте инструменты планирования поездок.',
      },
      {
        document: 'cover_letter',
        name: 'Cover Letter',
        nameUz: 'Xat',
        nameRu: 'Сопроводительное Письмо',
        category: 'optional',
        description:
          'Cover letter explaining purpose of trip, ties to Uzbekistan, and intent to return.',
        descriptionUz:
          "Sayohat maqsadi, O'zbekistonga bog'liqlik va qaytish niyatini tushuntiruvchi xat.",
        descriptionRu:
          'Сопроводительное письмо, объясняющее цель поездки, связи с Узбекистаном и намерение вернуться.',
        required: false,
        priority: 'low',
        whereToObtain: 'Write your own cover letter.',
        whereToObtainUz: "O'zingizning xatingizni yozing.",
        whereToObtainRu: 'Напишите свое сопроводительное письмо.',
      },
      {
        document: 'additional_sponsor_docs',
        name: 'Additional Sponsor Documents',
        nameUz: "Qo'shimcha Homiy Hujjatlari",
        nameRu: 'Дополнительные Документы Спонсора',
        category: 'optional',
        description:
          'If someone else is paying for your trip, include their financial documents and sponsorship letter.',
        descriptionUz:
          "Agar kimdir sizning sayohatingiz uchun to'layotgan bo'lsa, ularning moliyaviy hujjatlari va homiy xatini qo'shing.",
        descriptionRu:
          'Если кто-то другой оплачивает вашу поездку, приложите их финансовые документы и письмо спонсора.',
        required: false,
        priority: 'low',
        whereToObtain: 'Request from your sponsor in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi homiyingizdan so'rang.",
        whereToObtainRu: 'Запросите у вашего спонсора в Узбекистане.',
      },
    ],
  },
  JP: {
    student: [],
    tourist: [
      {
        document: 'passport',
        name: 'Valid Passport',
        nameUz: 'Yaroqli Pasport',
        nameRu: 'Действительный Паспорт',
        category: 'required',
        description:
          'Uzbek biometric passport valid at least 6 months after your planned return date from Japan.',
        descriptionUz:
          "Yaponiyadan rejalashtirilgan qaytish sanasidan keyin kamida 6 oy muddati qolgan O'zbekiston biometrik pasporti.",
        descriptionRu:
          'Биометрический паспорт Узбекистана, действительный не менее 6 месяцев после запланированной даты возвращения из Японии.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Apply at your local migration service or internal affairs office in Uzbekistan.',
        whereToObtainUz:
          "O'zbekistondagi mahalliy migratsiya xizmatiga yoki ichki ishlar organlariga murojaat qiling.",
        whereToObtainRu:
          'Обратитесь в местную службу миграции или органы внутренних дел в Узбекистане.',
      },
      {
        document: 'passport_photo',
        name: 'Passport Photo',
        nameUz: 'Pasport Fotosi',
        nameRu: 'Фото на Паспорт',
        category: 'required',
        description: '2x2 inch photo with white background, taken within last 6 months.',
        descriptionUz: 'Oq fonda 2x2 dyuymli foto, oxirgi 6 oy ichida olingan.',
        descriptionRu: 'Фото 2x2 дюйма на белом фоне, сделанное в течение последних 6 месяцев.',
        required: true,
        priority: 'high',
        whereToObtain: 'Take at photo studio in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi foto studiyada oling.",
        whereToObtainRu: 'Сделайте в фотостудии в Узбекистане.',
      },
      {
        document: 'visa_application_form',
        name: 'Japan Visa Application Form',
        nameUz: 'Yaponiya Viza Ariza Formasi',
        nameRu: 'Форма Заявления на Визу в Японию',
        category: 'required',
        description: 'Completed visa application form for Japan temporary visitor visa.',
        descriptionUz:
          "Yaponiya vaqtinchalik tashrif buyuruvchi vizasi uchun to'ldirilgan ariza formasi.",
        descriptionRu: 'Заполненная форма заявления на визу временного посетителя в Японию.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Download from Japan embassy website or obtain from visa application center.',
        whereToObtainUz:
          'Yaponiya elchixonasi veb-saytidan yuklab oling yoki viza ariza markazidan oling.',
        whereToObtainRu:
          'Скачайте с веб-сайта посольства Японии или получите в центре подачи заявлений на визу.',
      },
      {
        document: 'bank_statement',
        name: 'Bank Statement',
        nameUz: 'Bank Hisoboti',
        nameRu: 'Выписка из Банка',
        category: 'required',
        description:
          'Recent bank statement (within last 3 months) showing sufficient funds for travel to Japan.',
        descriptionUz:
          "Yaponiya sayohati uchun yetarli mablag'ni ko'rsatadigan so'nggi bank hisoboti (oxirgi 3 oy ichida).",
        descriptionRu:
          'Недавняя выписка из банка (в течение последних 3 месяцев), показывающая достаточные средства для поездки в Японию.',
        required: true,
        priority: 'high',
        whereToObtain: 'Request from your bank in Uzbekistan or download from online banking.',
        whereToObtainUz:
          "O'zbekistondagi bankingizdan so'rang yoki onlayn bank xizmatidan yuklab oling.",
        whereToObtainRu: 'Запросите в вашем банке в Узбекистане или скачайте из онлайн-банкинга.',
      },
      {
        document: 'travel_itinerary',
        name: 'Travel Itinerary',
        nameUz: 'Sayohat Rejasi',
        nameRu: 'Маршрут Поездки',
        category: 'highly_recommended',
        description: 'Detailed itinerary showing planned activities and places to visit in Japan.',
        descriptionUz:
          "Yaponiyada rejalashtirilgan faoliyatlar va tashrif buyuradigan joylarni ko'rsatadigan batafsil sayohat rejasi.",
        descriptionRu:
          'Подробный маршрут, показывающий запланированные мероприятия и места для посещения в Японии.',
        required: false,
        priority: 'high',
        whereToObtain: 'Create your own itinerary or use travel planning websites.',
        whereToObtainUz:
          "O'zingizning rejangizni yarating yoki sayohat rejalashtirish veb-saytlaridan foydalaning.",
        whereToObtainRu:
          'Создайте свой маршрут или используйте веб-сайты для планирования поездок.',
      },
      {
        document: 'hotel_reservations',
        name: 'Hotel Reservations',
        nameUz: 'Mehmonxona Rezervatsiyalari',
        nameRu: 'Бронирование Отелей',
        category: 'highly_recommended',
        description: 'Confirmed hotel reservations for your stay in Japan.',
        descriptionUz: 'Yaponiyada qolish uchun tasdiqlangan mehmonxona rezervatsiyalari.',
        descriptionRu: 'Подтвержденные бронирования отелей для вашего пребывания в Японии.',
        required: false,
        priority: 'high',
        whereToObtain: 'Book through hotel websites or booking platforms.',
        whereToObtainUz:
          'Mehmonxona veb-saytlari yoki bron qilish platformalari orqali bron qiling.',
        whereToObtainRu: 'Забронируйте через веб-сайты отелей или платформы бронирования.',
      },
      {
        document: 'employment_letter',
        name: 'Employment Certificate',
        nameUz: 'Ish Beruvchi Xati',
        nameRu: 'Справка с Места Работы',
        category: 'highly_recommended',
        description: 'Letter from employer confirming employment and approved leave for travel.',
        descriptionUz:
          "Ish beruvchidan ish joyi va sayohat uchun ruxsat olingan ta'tilni tasdiqlovchi xat.",
        descriptionRu:
          'Письмо от работодателя, подтверждающее место работы и одобренный отпуск для поездки.',
        required: false,
        priority: 'medium',
        whereToObtain: "Request from your employer's HR department in Uzbekistan.",
        whereToObtainUz: "O'zbekistondagi ish beruvchingizning kadrlar bo'limidan so'rang.",
        whereToObtainRu: 'Запросите в отделе кадров вашего работодателя в Узбекистане.',
      },
      {
        document: 'income_certificate',
        name: 'Income Certificate',
        nameUz: 'Daromad Sertifikati',
        nameRu: 'Справка о Доходах',
        category: 'highly_recommended',
        description: 'Official certificate showing your income from employer or government portal.',
        descriptionUz:
          "Ish beruvchi yoki rasmiy davlat portalidan olingan daromadingizni ko'rsatadigan rasmiy sertifikat.",
        descriptionRu:
          'Официальная справка, показывающая ваш доход от работодателя или государственного портала.',
        required: false,
        priority: 'medium',
        whereToObtain:
          'Request from your employer or obtain through official e-government portal in Uzbekistan.',
        whereToObtainUz:
          "Ish beruvchingizdan so'rang yoki O'zbekistondagi rasmiy elektron hukumat portali orqali oling.",
        whereToObtainRu:
          'Запросите у вашего работодателя или получите через официальный портал электронного правительства в Узбекистане.',
      },
      {
        document: 'invitation_letter',
        name: 'Invitation Letter (if applicable)',
        nameUz: "Taklif Xati (agar mavjud bo'lsa)",
        nameRu: 'Пригласительное Письмо (если применимо)',
        category: 'optional',
        description: 'If visiting friends or family in Japan, include invitation letter from host.',
        descriptionUz:
          "Agar Yaponiyada do'stlar yoki oila a'zolarini tashrif buyurmoqchi bo'lsangiz, mezbon tomonidan taklif xatini qo'shing.",
        descriptionRu:
          'Если вы посещаете друзей или семью в Японии, приложите пригласительное письмо от принимающей стороны.',
        required: false,
        priority: 'low',
        whereToObtain: 'Request from your host in Japan.',
        whereToObtainUz: "Yaponiyadagi mezboningizdan so'rang.",
        whereToObtainRu: 'Запросите у вашего принимающего лица в Японии.',
      },
      {
        document: 'property_document',
        name: 'Property Ownership Document',
        nameUz: 'Mulk Hujjati',
        nameRu: 'Документ о Праве Собственности',
        category: 'optional',
        description:
          'Document proving property ownership in Uzbekistan (shows ties to home country).',
        descriptionUz:
          "O'zbekistondagi mulk egaligini tasdiqlovchi hujjat (vatan bilan bog'liqlikni ko'rsatadi).",
        descriptionRu:
          'Документ, подтверждающий право собственности на недвижимость в Узбекистане (показывает связи с родиной).',
        required: false,
        priority: 'low',
        whereToObtain: 'Obtain from cadastral office or property registry in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi kadastr idorasidan yoki mulk reestridan oling.",
        whereToObtainRu:
          'Получите в кадастровом управлении или реестре недвижимости в Узбекистане.',
      },
    ],
  },
  AE: {
    student: [],
    tourist: [
      {
        document: 'passport',
        name: 'Valid Passport',
        nameUz: 'Yaroqli Pasport',
        nameRu: 'Действительный Паспорт',
        category: 'required',
        description:
          'Uzbek biometric passport valid at least 6 months after your planned return date from UAE.',
        descriptionUz:
          "BAA dan rejalashtirilgan qaytish sanasidan keyin kamida 6 oy muddati qolgan O'zbekiston biometrik pasporti.",
        descriptionRu:
          'Биометрический паспорт Узбекистана, действительный не менее 6 месяцев после запланированной даты возвращения из ОАЭ.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Apply at your local migration service or internal affairs office in Uzbekistan.',
        whereToObtainUz:
          "O'zbekistondagi mahalliy migratsiya xizmatiga yoki ichki ishlar organlariga murojaat qiling.",
        whereToObtainRu:
          'Обратитесь в местную службу миграции или органы внутренних дел в Узбекистане.',
      },
      {
        document: 'passport_photo',
        name: 'Passport Photo (UAE Size)',
        nameUz: "Pasport Fotosi (BAA O'lchami)",
        nameRu: 'Фото на Паспорт (Размер ОАЭ)',
        category: 'required',
        description:
          'Passport photo according to UAE size requirements (usually 43x55mm or 45x55mm with white background).',
        descriptionUz:
          "BAA o'lcham talablariga mos pasport fotosi (odatda oq fonda 43x55mm yoki 45x55mm).",
        descriptionRu:
          'Фото на паспорт согласно требованиям к размеру ОАЭ (обычно 43x55мм или 45x55мм на белом фоне).',
        required: true,
        priority: 'high',
        whereToObtain: 'Take at photo studio in Uzbekistan that provides UAE-compliant photos.',
        whereToObtainUz: "BAA talablariga javob beradigan O'zbekistondagi foto studiyada oling.",
        whereToObtainRu:
          'Сделайте в фотостудии в Узбекистане, которая предоставляет фото, соответствующие требованиям ОАЭ.',
      },
      {
        document: 'visa_application_form',
        name: 'UAE Visa Application / e-Visa Request',
        nameUz: "BAA Viza Arizasi / e-Viza So'rovi",
        nameRu: 'Заявление на Визу ОАЭ / Запрос e-Visa',
        category: 'required',
        description:
          'Completed UAE visa application form or e-visa request (if needed for Uzbek citizens).',
        descriptionUz:
          "To'ldirilgan BAA viza ariza formasi yoki e-viza so'rovi (agar O'zbekiston fuqarolari uchun talab qilinsa).",
        descriptionRu:
          'Заполненная форма заявления на визу ОАЭ или запрос e-visa (если требуется для граждан Узбекистана).',
        required: true,
        priority: 'high',
        whereToObtain: 'Complete online at UAE visa portal or through authorized visa service.',
        whereToObtainUz:
          "BAA viza portali orqali onlayn to'ldiring yoki ruxsat etilgan viza xizmati orqali.",
        whereToObtainRu:
          'Заполните онлайн на портале виз ОАЭ или через авторизованную визовую службу.',
      },
      {
        document: 'bank_statement',
        name: 'Bank Statement',
        nameUz: 'Bank Hisobi',
        nameRu: 'Банковская Выписка',
        category: 'required',
        description:
          'Bank statements from Uzbek bank showing sufficient funds for trip (last 3-6 months).',
        descriptionUz:
          "Sayohat uchun yetarli mablag'ni ko'rsatadigan O'zbekiston bankidan bank hisoblari (so'nggi 3-6 oy).",
        descriptionRu:
          'Банковские выписки из банка Узбекистана, показывающие достаточные средства на поездку (последние 3-6 месяцев).',
        required: true,
        priority: 'high',
        whereToObtain: 'Obtain from your bank branch in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi bank filialingizdan oling.",
        whereToObtainRu: 'Получите в отделении вашего банка в Узбекистане.',
      },
      {
        document: 'income_certificate',
        name: 'Income Certificate / Employment Letter',
        nameUz: 'Daromad Sertifikati / Ish Joyi Xati',
        nameRu: 'Справка о Доходах / Справка с Места Работы',
        category: 'required',
        description:
          'Official income certificate from employer or government portal, or employment letter confirming position, salary, and approved leave.',
        descriptionUz:
          "Ish beruvchi yoki davlat portalidan rasmiy daromad sertifikati, yoki lavozim, maosh va tasdiqlangan ta'tilni tasdiqlovchi ish joyi xati.",
        descriptionRu:
          'Официальная справка о доходах от работодателя или государственного портала, или справка с места работы, подтверждающая должность, зарплату и утвержденный отпуск.',
        required: true,
        priority: 'high',
        whereToObtain:
          'Request from employer HR or obtain through official government portal in Uzbekistan.',
        whereToObtainUz:
          "Ish beruvchining HR bo'limidan so'rang yoki O'zbekistondagi rasmiy davlat portali orqali oling.",
        whereToObtainRu:
          'Запросите у HR работодателя или получите через официальный государственный портал в Узбекистане.',
      },
      {
        document: 'flight_booking',
        name: 'Flight Booking (Round-Trip)',
        nameUz: 'Aviabilet Broni (Aylanma)',
        nameRu: 'Бронирование Авиабилета (Туда-Обратно)',
        category: 'required',
        description: 'Round-trip flight booking showing travel dates to and from UAE.',
        descriptionUz: "BAA ga va undan qaytish sanalarini ko'rsatadigan aylanma aviabilet broni.",
        descriptionRu:
          'Бронирование авиабилета туда-обратно, показывающее даты поездки в ОАЭ и обратно.',
        required: true,
        priority: 'high',
        whereToObtain: 'Book through airline or travel agency.',
        whereToObtainUz: 'Aviakompaniya yoki sayohat agentligi orqali bron qiling.',
        whereToObtainRu: 'Забронируйте через авиакомпанию или туристическое агентство.',
      },
      {
        document: 'hotel_booking',
        name: 'Hotel Booking / Invitation Letter',
        nameUz: 'Mehmonxona Broni / Taklif Xati',
        nameRu: 'Бронирование Отеля / Пригласительное Письмо',
        category: 'required',
        description:
          'Hotel booking confirmation or invitation letter with accommodation details for your stay in UAE.',
        descriptionUz:
          'BAA da qolish uchun mehmonxona broni tasdiqnomasi yoki turar joy tafsilotlari bilan taklif xati.',
        descriptionRu:
          'Подтверждение бронирования отеля или пригласительное письмо с деталями размещения для вашего пребывания в ОАЭ.',
        required: true,
        priority: 'high',
        whereToObtain: 'Book through hotel website or request invitation from host in UAE.',
        whereToObtainUz:
          "Mehmonxona veb-sayti orqali bron qiling yoki BAA dagi mezboningizdan taklif so'rang.",
        whereToObtainRu:
          'Забронируйте через сайт отеля или запросите приглашение у принимающего лица в ОАЭ.',
      },
      {
        document: 'property_document',
        name: 'Property Ownership Document',
        nameUz: 'Mulk Hujjati',
        nameRu: 'Документ о Праве Собственности',
        category: 'highly_recommended',
        description: 'Property ownership documents in Uzbekistan showing ties to home country.',
        descriptionUz: "Vatanga bog'liqlikni ko'rsatadigan O'zbekistondagi mulk hujjatlari.",
        descriptionRu:
          'Документы о праве собственности на недвижимость в Узбекистане, показывающие связи с родиной.',
        required: false,
        priority: 'high',
        whereToObtain: 'Obtain from cadastral office or property registry in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi kadastr idorasidan yoki mulk reestridan oling.",
        whereToObtainRu:
          'Получите в кадастровом управлении или реестре недвижимости в Узбекистане.',
      },
      {
        document: 'family_ties',
        name: 'Family Ties Document',
        nameUz: "Oila Bog'liqlik Hujjati",
        nameRu: 'Документ о Семейных Связях',
        category: 'highly_recommended',
        description:
          'Family certificate, marriage certificate, or birth certificates showing family members in Uzbekistan.',
        descriptionUz:
          "O'zbekistondagi oila a'zolarini ko'rsatadigan oila sertifikati, nikoh sertifikati yoki tug'ilganlik sertifikatlari.",
        descriptionRu:
          'Семейный сертификат, свидетельство о браке или свидетельства о рождении, показывающие членов семьи в Узбекистане.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Obtain from civil registry office (ZAGS) in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi fuqarolik holati idorasidan (ZAGS) oling.",
        whereToObtainRu:
          'Получите в отделе записи актов гражданского состояния (ЗАГС) в Узбекистане.',
      },
      {
        document: 'travel_insurance',
        name: 'Travel Insurance',
        nameUz: "Sayohat Sug'urtasi",
        nameRu: 'Туристическая Страховка',
        category: 'highly_recommended',
        description:
          'Travel insurance covering your entire trip to UAE including medical coverage (not always mandatory but good practice).',
        descriptionUz:
          "BAA ga sayohat uchun tibbiy qoplamani o'z ichiga olgan to'liq sayohat sug'urtasi (har doim majburiy emas, lekin yaxshi amaliyot).",
        descriptionRu:
          'Туристическая страховка, покрывающая всю вашу поездку в ОАЭ, включая медицинское покрытие (не всегда обязательна, но хорошая практика).',
        required: false,
        priority: 'medium',
        whereToObtain: 'Purchase from insurance company or travel agency.',
        whereToObtainUz: "Sug'urta kompaniyasidan yoki sayohat agentligidan xarid qiling.",
        whereToObtainRu: 'Приобретите у страховой компании или туристического агентства.',
      },
      {
        document: 'previous_visas',
        name: 'Previous Visas',
        nameUz: 'Oldingi Vizalar',
        nameRu: 'Предыдущие Визы',
        category: 'highly_recommended',
        description: 'Copies of previous visas showing travel history.',
        descriptionUz: "Sayohat tarixini ko'rsatadigan oldingi vizalarning nusxalari.",
        descriptionRu: 'Копии предыдущих виз, показывающие историю поездок.',
        required: false,
        priority: 'medium',
        whereToObtain: 'Copy from your passport pages.',
        whereToObtainUz: 'Pasportingiz sahifalaridan nusxa oling.',
        whereToObtainRu: 'Скопируйте со страниц вашего паспорта.',
      },
      {
        document: 'employer_vacation_approval',
        name: "Employer's Vacation Approval Letter",
        nameUz: "Ish Beruvchining Ta'til Ruxsati Xati",
        nameRu: 'Письмо Работодателя об Одобрении Отпуска',
        category: 'optional',
        description: 'Letter from employer confirming approved vacation period for travel to UAE.',
        descriptionUz:
          "BAA ga sayohat uchun tasdiqlangan ta'til muddatini tasdiqlovchi ish beruvchidan xat.",
        descriptionRu:
          'Письмо от работодателя, подтверждающее утвержденный период отпуска для поездки в ОАЭ.',
        required: false,
        priority: 'low',
        whereToObtain: 'Request from employer HR department in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi ish beruvchining HR bo'limidan so'rang.",
        whereToObtainRu: 'Запросите в отделе кадров работодателя в Узбекистане.',
      },
      {
        document: 'cover_letter',
        name: 'Cover Letter',
        nameUz: 'Xat',
        nameRu: 'Сопроводительное Письмо',
        category: 'optional',
        description:
          'Cover letter explaining purpose of visit, ties to Uzbekistan, and intent to return.',
        descriptionUz:
          "Tashrif maqsadi, O'zbekistonga bog'liqlik va qaytish niyatini tushuntiruvchi xat.",
        descriptionRu:
          'Сопроводительное письмо, объясняющее цель визита, связи с Узбекистаном и намерение вернуться.',
        required: false,
        priority: 'low',
        whereToObtain: 'Write your own cover letter.',
        whereToObtainUz: "O'zingizning xatingizni yozing.",
        whereToObtainRu: 'Напишите свое сопроводительное письмо.',
      },
      {
        document: 'additional_sponsor_docs',
        name: 'Additional Sponsor Documents',
        nameUz: "Qo'shimcha Homiy Hujjatlari",
        nameRu: 'Дополнительные Документы Спонсора',
        category: 'optional',
        description:
          'If someone else is paying for your trip, include their financial documents and sponsorship letter.',
        descriptionUz:
          "Agar kimdir sizning sayohatingiz uchun to'layotgan bo'lsa, ularning moliyaviy hujjatlari va homiy xatini qo'shing.",
        descriptionRu:
          'Если кто-то другой оплачивает вашу поездку, приложите их финансовые документы и письмо спонсора.',
        required: false,
        priority: 'low',
        whereToObtain: 'Request from your sponsor in Uzbekistan.',
        whereToObtainUz: "O'zbekistondagi homiyingizdan so'rang.",
        whereToObtainRu: 'Запросите у вашего спонсора в Узбекистане.',
      },
    ],
  },
};

/**
 * Get fallback checklist for country and visa type
 */
export function getFallbackChecklist(
  countryCode: string,
  visaType: 'student' | 'tourist'
): FallbackChecklistItem[] {
  const code = countryCode.toUpperCase() as CountryCode;
  const checklist = FALLBACK_CHECKLISTS[code]?.[visaType];

  if (!checklist || checklist.length === 0) {
    // Return generic fallback
    return FALLBACK_CHECKLISTS.US[visaType] || [];
  }

  return checklist;
}
