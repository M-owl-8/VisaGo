/**
 * Emergency Fallback Checklists
 * Categorized fallback sets for each country/visa type combination
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
    ],
  },
  CA: {
    student: [
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
    ],
    tourist: [],
  },
  AU: {
    student: [],
    tourist: [],
  },
  DE: {
    student: [],
    tourist: [],
  },
  ES: {
    student: [],
    tourist: [],
  },
  JP: {
    student: [],
    tourist: [],
  },
  AE: {
    student: [],
    tourist: [],
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
