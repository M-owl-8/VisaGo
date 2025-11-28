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
