/**
 * Questionnaire Questions - NEW Multi-Country, Multi-Visa Structure
 * Supports: Tourist & Student visas for 10 countries
 * Languages: Uzbek, Russian, English
 */

import {Question} from '../types/questionnaire';

export const questionnaireQuestions: Question[] = [
  // ============================================================================
  // GROUP A: Applicant Identity
  // ============================================================================

  // A1: Full Name
  {
    id: 'fullName',
    titleEn: 'What is your full name?',
    titleUz: "To'liq ismingiz nima?",
    titleRu: 'Как ваше полное имя?',
    descriptionEn: 'Enter your first and last name as shown on your passport',
    descriptionUz: "Pasportingizda ko'rsatilgan ism va familiyangizni kiriting",
    descriptionRu: 'Введите ваше имя и фамилию, как указано в паспорте',
    type: 'text',
    required: true,
    options: [],
  },

  // A2: Date of Birth
  {
    id: 'dateOfBirth',
    titleEn: 'What is your date of birth?',
    titleUz: "Tug'ilgan sanangiz qachon?",
    titleRu: 'Когда вы родились?',
    descriptionEn: 'Enter your date of birth (DD/MM/YYYY)',
    descriptionUz: "Tug'ilgan sanangizni kiriting (KK/OO/YYYY)",
    descriptionRu: 'Введите дату рождения (ДД/ММ/ГГГГ)',
    type: 'text',
    required: true,
    options: [],
  },

  // A3: Nationality
  {
    id: 'nationality',
    titleEn: 'What is your nationality?',
    titleUz: 'Fuqaroligingiz qaysi davlat?',
    titleRu: 'Какое у вас гражданство?',
    descriptionEn: 'Select your country of citizenship',
    descriptionUz: 'Fuqarolik davlatingizni tanlang',
    descriptionRu: 'Выберите страну вашего гражданства',
    type: 'dropdown',
    required: true,
    options: [
      {
        value: 'UZ',
        labelEn: 'Uzbekistan',
        labelUz: "O'zbekiston",
        labelRu: 'Узбекистан',
        icon: '🇺🇿',
      },
      // Will be populated from backend countries list
    ],
  },

  // A4: Passport Status
  {
    id: 'passportStatus',
    titleEn: 'What is your passport status?',
    titleUz: 'Pasport holatingiz qanday?',
    titleRu: 'Какой статус вашего паспорта?',
    descriptionEn: 'Select the current status of your passport',
    descriptionUz: 'Pasportingizning hozirgi holatini tanlang',
    descriptionRu: 'Выберите текущий статус вашего паспорта',
    type: 'single',
    required: true,
    options: [
      {
        value: 'valid',
        labelEn: 'Valid passport',
        labelUz: 'Yaroqli pasport',
        labelRu: 'Действительный паспорт',
        icon: '✅',
      },
      {
        value: 'expired',
        labelEn: 'Expired passport',
        labelUz: "Muddati o'tgan pasport",
        labelRu: 'Просроченный паспорт',
        icon: '⚠️',
      },
      {
        value: 'no_passport',
        labelEn: 'No passport',
        labelUz: "Pasport yo'q",
        labelRu: 'Нет паспорта',
        icon: '❌',
      },
    ],
  },

  // ============================================================================
  // GROUP B: Visa Type / Purpose
  // ============================================================================

  // B1: Visa Type (Purpose) - CRITICAL: This determines tourist vs student
  {
    id: 'purpose',
    titleEn: 'What type of visa do you need?',
    titleUz: 'Qanday turdagi viza kerak?',
    titleRu: 'Какой тип визы вам нужен?',
    descriptionEn: 'Select whether you need a tourist or student visa',
    descriptionUz: 'Turistik yoki talaba vizasini tanlang',
    descriptionRu: 'Выберите, нужна ли вам туристическая или студенческая виза',
    type: 'single',
    required: true,
    options: [
      {
        value: 'tourism',
        labelEn: 'Tourist / Visitor Visa',
        labelUz: 'Turistik / Tashrifchi vizasi',
        labelRu: 'Туристическая / Гостевая виза',
        icon: '✈️',
      },
      {
        value: 'study',
        labelEn: 'Student / Study Visa',
        labelUz: "Talaba / O'qish vizasi",
        labelRu: 'Студенческая / Учебная виза',
        icon: '🎓',
      },
    ],
  },

  // B2: Purpose of Travel (Tourist) - Conditional, shown only if purpose is tourism
  {
    id: 'travelPurpose',
    titleEn: 'What is the purpose of your travel?',
    titleUz: 'Sayohat maqsadingiz nima?',
    titleRu: 'Какова цель вашей поездки?',
    descriptionEn: 'Select the main reason for your tourist trip',
    descriptionUz: 'Turistik sayohatingizning asosiy sababini tanlang',
    descriptionRu: 'Выберите основную причину вашей туристической поездки',
    type: 'single',
    required: false, // Only shown for tourist visa
    options: [
      {
        value: 'tourism',
        labelEn: 'Tourism / Sightseeing',
        labelUz: 'Turizm / Sayyohlik',
        labelRu: 'Туризм / Осмотр достопримечательностей',
        icon: '🏛️',
      },
      {
        value: 'visiting_friends',
        labelEn: 'Visiting friends',
        labelUz: "Do'stlarni ko'rish",
        labelRu: 'Посещение друзей',
        icon: '👥',
      },
      {
        value: 'visiting_relatives',
        labelEn: 'Visiting relatives',
        labelUz: "Qarindoshlarni ko'rish",
        labelRu: 'Посещение родственников',
        icon: '👨‍👩‍👧‍👦',
      },
      {
        value: 'business_meeting',
        labelEn: 'Business meeting',
        labelUz: 'Biznes uchrashuvi',
        labelRu: 'Деловая встреча',
        icon: '💼',
      },
    ],
  },

  // B2: Planned Travel Dates
  {
    id: 'plannedTravelDates',
    titleEn: 'When do you plan to travel?',
    titleUz: 'Qachon sayohat qilmoqchisiz?',
    titleRu: 'Когда вы планируете поехать?',
    descriptionEn: 'Enter your planned departure and return dates',
    descriptionUz: 'Rejalashtirilgan ketish va qaytish sanalarini kiriting',
    descriptionRu: 'Введите запланированные даты выезда и возвращения',
    type: 'text',
    required: false,
    options: [],
  },

  // B3: Who is funding the trip
  {
    id: 'tripFunding',
    titleEn: 'Who is funding your trip?',
    titleUz: 'Sayohatingizni kim moliyalashtirmoqda?',
    titleRu: 'Кто финансирует вашу поездку?',
    descriptionEn: 'Select who will pay for your travel expenses',
    descriptionUz: "Sayohat xarajatlarini kim to'layotganini tanlang",
    descriptionRu: 'Выберите, кто будет оплачивать ваши расходы на поездку',
    type: 'single',
    required: true,
    options: [
      {
        value: 'self',
        labelEn: 'Myself',
        labelUz: "O'zim",
        labelRu: 'Сам(а)',
        icon: '👤',
      },
      {
        value: 'sponsor',
        labelEn: 'Sponsor (family/friend)',
        labelUz: "Homiy (oila/do'st)",
        labelRu: 'Спонсор (семья/друг)',
        icon: '🤝',
      },
      {
        value: 'company',
        labelEn: 'Company / Employer',
        labelUz: 'Kompaniya / Ish beruvchi',
        labelRu: 'Компания / Работодатель',
        icon: '🏢',
      },
    ],
  },

  // B4: Financial capacity per month
  {
    id: 'monthlyFinancialCapacity',
    titleEn: 'What is your monthly financial capacity?',
    titleUz: 'Oylik moliyaviy imkoniyatingiz qancha?',
    titleRu: 'Какова ваша ежемесячная финансовая возможность?',
    descriptionEn: 'Approximate amount you can spend per month (in USD)',
    descriptionUz:
      "Oylik sarflay olishingiz mumkin bo'lgan taxminiy miqdor (USD)",
    descriptionRu:
      'Примерная сумма, которую вы можете потратить в месяц (в USD)',
    type: 'text',
    required: false,
    options: [],
  },

  // B5: University Acceptance (Student only)
  {
    id: 'hasUniversityAcceptance',
    titleEn: 'Do you have a university acceptance letter?',
    titleUz: 'Universitet qabul xatingiz bormi?',
    titleRu: 'У вас есть письмо о зачислении в университет?',
    descriptionEn: 'I-20, COE, CAS, or similar acceptance document',
    descriptionUz: "I-20, COE, CAS yoki shunga o'xshash qabul hujjati",
    descriptionRu: 'I-20, COE, CAS или аналогичный документ о зачислении',
    type: 'boolean',
    required: false, // Only shown for student visa
    options: [
      {
        value: 'true',
        labelEn: 'Yes',
        labelUz: 'Ha',
        labelRu: 'Да',
        icon: '✅',
      },
      {
        value: 'false',
        labelEn: 'No',
        labelUz: "Yo'q",
        labelRu: 'Нет',
        icon: '❌',
      },
    ],
  },

  // B6: Program Type (Student only)
  {
    id: 'programType',
    titleEn: 'What type of program are you applying for?',
    titleUz: 'Qanday dasturga ariza bermoqchisiz?',
    titleRu: 'На какую программу вы подаете заявку?',
    descriptionEn: 'Select the type of educational program',
    descriptionUz: "Ta'lim dasturi turini tanlang",
    descriptionRu: 'Выберите тип образовательной программы',
    type: 'single',
    required: false, // Only shown for student visa
    options: [
      {
        value: 'bachelor',
        labelEn: "Bachelor's degree",
        labelUz: 'Bakalavr',
        labelRu: 'Бакалавриат',
        icon: '🎓',
      },
      {
        value: 'master',
        labelEn: "Master's degree",
        labelUz: 'Magistratura',
        labelRu: 'Магистратура',
        icon: '🎓',
      },
      {
        value: 'phd',
        labelEn: 'PhD / Doctorate',
        labelUz: 'Doktorantura',
        labelRu: 'Докторантура',
        icon: '🎓',
      },
      {
        value: 'exchange',
        labelEn: 'Exchange / Mobility program',
        labelUz: 'Almashinuv / Mobil dastur',
        labelRu: 'Обмен / Программа мобильности',
        icon: '🔄',
      },
      {
        value: 'language',
        labelEn: 'Language course',
        labelUz: 'Til kursi',
        labelRu: 'Языковые курсы',
        icon: '📚',
      },
    ],
  },

  // B7: Tuition Structure (Student only)
  {
    id: 'tuitionStructure',
    titleEn: 'How is your tuition being paid?',
    titleUz: "Ta'lim to'lovi qanday amalga oshirilmoqda?",
    titleRu: 'Как оплачивается ваше обучение?',
    descriptionEn: 'Select how your tuition fees are structured',
    descriptionUz: "Ta'lim to'lovi qanday tuzilganini tanlang",
    descriptionRu: 'Выберите, как структурирована оплата обучения',
    type: 'single',
    required: false, // Only shown for student visa
    options: [
      {
        value: 'fully_paid',
        labelEn: 'Fully paid by me/sponsor',
        labelUz: "To'liq o'zim/homiy tomonidan to'langan",
        labelRu: 'Полностью оплачено мной/спонсором',
        icon: '💰',
      },
      {
        value: 'scholarship',
        labelEn: 'Full scholarship',
        labelUz: "To'liq stipendiya",
        labelRu: 'Полная стипендия',
        icon: '🎓',
      },
      {
        value: 'partial_scholarship',
        labelEn: 'Partial scholarship',
        labelUz: 'Qisman stipendiya',
        labelRu: 'Частичная стипендия',
        icon: '💵',
      },
    ],
  },

  // B8: Who is paying living expenses (Student only)
  {
    id: 'livingExpensesPayer',
    titleEn: 'Who is paying your living expenses?',
    titleUz: "Yashash xarajatlarini kim to'layapti?",
    titleRu: 'Кто оплачивает ваши расходы на проживание?',
    descriptionEn:
      'Select who will cover accommodation, food, and daily expenses',
    descriptionUz:
      'Yashash joyi, ovqat va kundalik xarajatlarni kim qoplayotganini tanlang',
    descriptionRu:
      'Выберите, кто будет покрывать расходы на жилье, еду и повседневные нужды',
    type: 'single',
    required: false, // Only shown for student visa
    options: [
      {
        value: 'self',
        labelEn: 'Myself',
        labelUz: "O'zim",
        labelRu: 'Сам(а)',
        icon: '👤',
      },
      {
        value: 'parents',
        labelEn: 'Parents',
        labelUz: 'Ota-ona',
        labelRu: 'Родители',
        icon: '👨‍👩‍👧‍👦',
      },
      {
        value: 'sponsor',
        labelEn: 'Other sponsor',
        labelUz: 'Boshqa homiy',
        labelRu: 'Другой спонсор',
        icon: '🤝',
      },
      {
        value: 'scholarship',
        labelEn: 'Scholarship covers it',
        labelUz: 'Stipendiya qoplaydi',
        labelRu: 'Стипендия покрывает',
        icon: '🎓',
      },
    ],
  },

  // B9: Accommodation Status (Student only)
  {
    id: 'accommodationStatus',
    titleEn: 'Do you have accommodation reserved?',
    titleUz: 'Yashash joyi bron qilinganmi?',
    titleRu: 'У вас забронировано жилье?',
    descriptionEn: 'Select your accommodation status',
    descriptionUz: 'Yashash joyi holatini tanlang',
    descriptionRu: 'Выберите статус вашего жилья',
    type: 'single',
    required: false, // Only shown for student visa
    options: [
      {
        value: 'reserved',
        labelEn: 'Yes, already reserved',
        labelUz: 'Ha, allaqachon bron qilingan',
        labelRu: 'Да, уже забронировано',
        icon: '✅',
      },
      {
        value: 'university_housing',
        labelEn: 'University housing',
        labelUz: 'Universitet yotoqxonasi',
        labelRu: 'Общежитие университета',
        icon: '🏠',
      },
      {
        value: 'not_reserved',
        labelEn: 'Not reserved yet',
        labelUz: 'Hali bron qilinmagan',
        labelRu: 'Еще не забронировано',
        icon: '❌',
      },
    ],
  },

  // ============================================================================
  // GROUP C: Employment/Education
  // ============================================================================

  // C1: Employment Status (Tourist)
  {
    id: 'isEmployed',
    titleEn: 'Are you currently employed?',
    titleUz: 'Hozir ishlayapsizmi?',
    titleRu: 'Вы сейчас работаете?',
    descriptionEn: 'Select your current employment status',
    descriptionUz: 'Hozirgi ish holatingizni tanlang',
    descriptionRu: 'Выберите ваш текущий статус занятости',
    type: 'boolean',
    required: false, // Conditional based on visa type
    options: [
      {
        value: 'true',
        labelEn: 'Yes',
        labelUz: 'Ha',
        labelRu: 'Да',
        icon: '✅',
      },
      {
        value: 'false',
        labelEn: 'No',
        labelUz: "Yo'q",
        labelRu: 'Нет',
        icon: '❌',
      },
    ],
  },

  // C2: Employer Details (Tourist, if employed)
  {
    id: 'employerDetails',
    titleEn: 'What is your employer name?',
    titleUz: 'Ish beruvchi nomi nima?',
    titleRu: 'Как называется ваш работодатель?',
    descriptionEn: 'Enter your company or employer name',
    descriptionUz: 'Kompaniya yoki ish beruvchi nomini kiriting',
    descriptionRu: 'Введите название вашей компании или работодателя',
    type: 'text',
    required: false,
    options: [],
  },

  // C3: Monthly Salary (Tourist, if employed)
  {
    id: 'monthlySalary',
    titleEn: 'What is your monthly salary?',
    titleUz: 'Oylik maoshingiz qancha?',
    titleRu: 'Какова ваша месячная зарплата?',
    descriptionEn: 'Enter your monthly salary in USD (approximate)',
    descriptionUz: 'Oylik maoshingizni USD da kiriting (taxminiy)',
    descriptionRu: 'Введите вашу месячную зарплату в USD (примерно)',
    type: 'text',
    required: false,
    options: [],
  },

  // C4: Currently Studying (Student)
  {
    id: 'isCurrentlyStudying',
    titleEn: 'Are you currently studying?',
    titleUz: "Hozir o'qiysizmi?",
    titleRu: 'Вы сейчас учитесь?',
    descriptionEn:
      'Select if you are currently enrolled in an educational program',
    descriptionUz: "Hozir ta'lim dasturiga qabul qilinganmisiz, tanlang",
    descriptionRu:
      'Выберите, зачислены ли вы в настоящее время в образовательную программу',
    type: 'boolean',
    required: false, // Only shown for student visa
    options: [
      {
        value: 'true',
        labelEn: 'Yes',
        labelUz: 'Ha',
        labelRu: 'Да',
        icon: '✅',
      },
      {
        value: 'false',
        labelEn: 'No',
        labelUz: "Yo'q",
        labelRu: 'Нет',
        icon: '❌',
      },
    ],
  },

  // C5: Graduated Already (Student)
  {
    id: 'hasGraduated',
    titleEn: 'Have you already graduated?',
    titleUz: 'Allaqachon bitirganmisiz?',
    titleRu: 'Вы уже закончили обучение?',
    descriptionEn: 'Select if you have completed your previous education',
    descriptionUz: "Oldingi ta'limingizni tugatganmisiz, tanlang",
    descriptionRu: 'Выберите, завершили ли вы предыдущее образование',
    type: 'boolean',
    required: false, // Only shown for student visa
    options: [
      {
        value: 'true',
        labelEn: 'Yes',
        labelUz: 'Ha',
        labelRu: 'Да',
        icon: '✅',
      },
      {
        value: 'false',
        labelEn: 'No',
        labelUz: "Yo'q",
        labelRu: 'Нет',
        icon: '❌',
      },
    ],
  },

  // C6: Diploma Available (Student)
  {
    id: 'diplomaAvailable',
    titleEn: 'Do you have your diploma available?',
    titleUz: 'Diplomingiz bormi?',
    titleRu: 'У вас есть диплом?',
    descriptionEn: 'Select if you have your educational diploma/certificate',
    descriptionUz: "Ta'lim diplom/sertifikatingiz bormi, tanlang",
    descriptionRu: 'Выберите, есть ли у вас диплом/сертификат об образовании',
    type: 'boolean',
    required: false, // Only shown for student visa
    options: [
      {
        value: 'true',
        labelEn: 'Yes',
        labelUz: 'Ha',
        labelRu: 'Да',
        icon: '✅',
      },
      {
        value: 'false',
        labelEn: 'No',
        labelUz: "Yo'q",
        labelRu: 'Нет',
        icon: '❌',
      },
    ],
  },

  // C7: Transcript Available (Student)
  {
    id: 'transcriptAvailable',
    titleEn: 'Do you have your academic transcript available?',
    titleUz: 'Akademik transkriptingiz bormi?',
    titleRu: 'У вас есть академическая справка?',
    descriptionEn: 'Select if you have your academic transcript/grade sheet',
    descriptionUz: "Akademik transkript/baholar varag'angiz bormi, tanlang",
    descriptionRu:
      'Выберите, есть ли у вас академическая справка/ведомость оценок',
    type: 'boolean',
    required: false, // Only shown for student visa
    options: [
      {
        value: 'true',
        labelEn: 'Yes',
        labelUz: 'Ha',
        labelRu: 'Да',
        icon: '✅',
      },
      {
        value: 'false',
        labelEn: 'No',
        labelUz: "Yo'q",
        labelRu: 'Нет',
        icon: '❌',
      },
    ],
  },

  // ============================================================================
  // GROUP D: Travel History
  // ============================================================================

  // D1: Visited Countries Before
  {
    id: 'visitedCountries',
    titleEn: 'Have you visited any countries before?',
    titleUz: 'Ilgari boshqa davlatlarga borganmisiz?',
    titleRu: 'Вы раньше посещали другие страны?',
    descriptionEn: 'List countries you have visited (if any)',
    descriptionUz: "Borgan davlatlaringizni ro'yxatlang (agar bor bo'lsa)",
    descriptionRu: 'Перечислите страны, которые вы посещали (если есть)',
    type: 'text',
    required: false,
    options: [],
  },

  // D2: Visa Refusals
  {
    id: 'hasVisaRefusals',
    titleEn: 'Have you had any visa refusals?',
    titleUz: "Viza rad etilgan holatlar bo'lganmi?",
    titleRu: 'У вас были отказы в визе?',
    descriptionEn: 'Select if you have ever been refused a visa',
    descriptionUz: "Sizga viza rad etilgan bo'lsa, tanlang",
    descriptionRu: 'Выберите, если вам когда-либо отказывали в визе',
    type: 'boolean',
    required: true,
    options: [
      {
        value: 'true',
        labelEn: 'Yes',
        labelUz: 'Ha',
        labelRu: 'Да',
        icon: '⚠️',
      },
      {
        value: 'false',
        labelEn: 'No',
        labelUz: "Yo'q",
        labelRu: 'Нет',
        icon: '✅',
      },
    ],
  },

  // ============================================================================
  // GROUP E: Supporting Documents
  // ============================================================================

  // E1: Property Documents
  {
    id: 'hasPropertyDocuments',
    titleEn: 'Do you have property documents in Uzbekistan?',
    titleUz: "O'zbekistonda mulk hujjatlaringiz bormi?",
    titleRu: 'У вас есть документы на недвижимость в Узбекистане?',
    descriptionEn:
      'Property ownership documents that show ties to home country',
    descriptionUz: "Vatanga bog'liqlikni ko'rsatadigan mulk egaligi hujjatlari",
    descriptionRu:
      'Документы о праве собственности, показывающие связи с родиной',
    type: 'boolean',
    required: false,
    options: [
      {
        value: 'true',
        labelEn: 'Yes',
        labelUz: 'Ha',
        labelRu: 'Да',
        icon: '✅',
      },
      {
        value: 'false',
        labelEn: 'No',
        labelUz: "Yo'q",
        labelRu: 'Нет',
        icon: '❌',
      },
    ],
  },

  // E2: Bank Statements
  {
    id: 'hasBankStatements',
    titleEn: 'Do you have bank statements?',
    titleUz: "Bank hisob varag'laringiz bormi?",
    titleRu: 'У вас есть банковские выписки?',
    descriptionEn: 'Recent bank statements showing financial capacity',
    descriptionUz:
      "Moliyaviy imkoniyatni ko'rsatadigan so'nggi bank hisob varag'lari",
    descriptionRu:
      'Недавние банковские выписки, показывающие финансовые возможности',
    type: 'boolean',
    required: false,
    options: [
      {
        value: 'true',
        labelEn: 'Yes',
        labelUz: 'Ha',
        labelRu: 'Да',
        icon: '✅',
      },
      {
        value: 'false',
        labelEn: 'No',
        labelUz: "Yo'q",
        labelRu: 'Нет',
        icon: '❌',
      },
    ],
  },

  // E3: Family Ties in Uzbekistan
  {
    id: 'hasFamilyTiesUzbekistan',
    titleEn: 'Do you have close family in Uzbekistan?',
    titleUz: "O'zbekistonda yaqin oilangiz bormi?",
    titleRu: 'У вас есть близкая семья в Узбекистане?',
    descriptionEn: 'Parents, spouse, or children living in Uzbekistan',
    descriptionUz:
      "O'zbekistonda yashayotgan ota-ona, turmush o'rtog'i yoki farzandlar",
    descriptionRu: 'Родители, супруг(а) или дети, проживающие в Узбекистане',
    type: 'boolean',
    required: false,
    options: [
      {
        value: 'true',
        labelEn: 'Yes',
        labelUz: 'Ha',
        labelRu: 'Да',
        icon: '✅',
      },
      {
        value: 'false',
        labelEn: 'No',
        labelUz: "Yo'q",
        labelRu: 'Нет',
        icon: '❌',
      },
    ],
  },

  // ============================================================================
  // GROUP F: Sponsor (if applicable)
  // ============================================================================

  // F1: Sponsor Relationship
  {
    id: 'sponsorRelationship',
    titleEn: 'What is your relationship with the sponsor?',
    titleUz: 'Homiy bilan munosabatingiz qanday?',
    titleRu: 'Какие у вас отношения со спонсором?',
    descriptionEn: 'Select your relationship with the person funding your trip',
    descriptionUz:
      'Sayohatingizni moliyalashtiruvchi shaxs bilan munosabatingizni tanlang',
    descriptionRu:
      'Выберите ваши отношения с лицом, финансирующим вашу поездку',
    type: 'single',
    required: false, // Only shown if tripFunding is 'sponsor'
    options: [
      {
        value: 'parent',
        labelEn: 'Parent',
        labelUz: 'Ota-ona',
        labelRu: 'Родитель',
        icon: '👨‍👩‍👧‍👦',
      },
      {
        value: 'sibling',
        labelEn: 'Sibling',
        labelUz: 'Aka-uka / Opa-singa',
        labelRu: 'Брат / Сестра',
        icon: '👫',
      },
      {
        value: 'relative',
        labelEn: 'Other relative',
        labelUz: 'Boshqa qarindosh',
        labelRu: 'Другой родственник',
        icon: '👨‍👩‍👧‍👦',
      },
      {
        value: 'friend',
        labelEn: 'Friend',
        labelUz: "Do'st",
        labelRu: 'Друг',
        icon: '👥',
      },
      {
        value: 'other',
        labelEn: 'Other',
        labelUz: 'Boshqa',
        labelRu: 'Другое',
        icon: '🤝',
      },
    ],
  },

  // F2: Sponsor Employment
  {
    id: 'sponsorEmployment',
    titleEn: "What is your sponsor's employment status?",
    titleUz: 'Homiyingizning ish holati qanday?',
    titleRu: 'Каков статус занятости вашего спонсора?',
    descriptionEn: "Select your sponsor's current employment situation",
    descriptionUz: 'Homiyingizning hozirgi ish holatini tanlang',
    descriptionRu: 'Выберите текущую ситуацию с занятостью вашего спонсора',
    type: 'single',
    required: false, // Only shown if tripFunding is 'sponsor'
    options: [
      {
        value: 'employed',
        labelEn: 'Employed',
        labelUz: 'Ishlaydi',
        labelRu: 'Работает',
        icon: '💼',
      },
      {
        value: 'business_owner',
        labelEn: 'Business owner',
        labelUz: 'Tadbirkor',
        labelRu: 'Владелец бизнеса',
        icon: '🏢',
      },
      {
        value: 'retired',
        labelEn: 'Retired',
        labelUz: 'Nafaqada',
        labelRu: 'На пенсии',
        icon: '👴',
      },
      {
        value: 'other',
        labelEn: 'Other',
        labelUz: 'Boshqa',
        labelRu: 'Другое',
        icon: '📋',
      },
    ],
  },

  // F3: Sponsor Annual Income
  {
    id: 'sponsorAnnualIncome',
    titleEn: "What is your sponsor's annual income?",
    titleUz: 'Homiyingizning yillik daromadi qancha?',
    titleRu: 'Какой годовой доход вашего спонсора?',
    descriptionEn: "Enter sponsor's annual income in USD (approximate)",
    descriptionUz:
      'Homiyingizning yillik daromadini USD da kiriting (taxminiy)',
    descriptionRu: 'Введите годовой доход спонсора в USD (примерно)',
    type: 'text',
    required: false, // Only shown if tripFunding is 'sponsor'
    options: [],
  },

  // ============================================================================
  // GROUP C: Destination Country Selection
  // ============================================================================
  {
    id: 'country',
    titleEn: 'Which country are you interested in?',
    titleUz: 'Qaysi davlatga bormoqchisiz?',
    titleRu: 'В какую страну вы хотите поехать?',
    descriptionEn: 'Select your destination country (required)',
    descriptionUz: 'Borishni xohlagan davlatingizni tanlang (majburiy)',
    descriptionRu: 'Выберите страну назначения (обязательно)',
    type: 'dropdown',
    required: true, // CRITICAL: Country is required for application creation
    options: [
      // Will be populated from backend /api/countries list
      // Must include at least: USA, Canada, Australia, UK, New Zealand, Japan, South Korea, Spain, Germany, Poland
    ],
  },
];
