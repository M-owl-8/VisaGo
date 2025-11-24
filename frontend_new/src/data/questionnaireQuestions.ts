/**
 * Questionnaire Questions v2 - Clean, GPT-friendly structure
 * Supports: Tourist & Student visas for 10 countries
 * Languages: Uzbek, Russian, English
 *
 * Designed to give GPT-4o-mini everything needed for document checklist generation
 */

import {Question} from '../types/questionnaire';

export const questionnaireQuestions: Question[] = [
  // ============================================================================
  // GROUP A: Destination & Basic
  // ============================================================================

  // A1: Country
  {
    id: 'country',
    titleEn: 'Which country do you want to go to?',
    titleUz: 'Qaysi davlatga bormoqchisiz?',
    titleRu: 'В какую страну вы хотите поехать?',
    descriptionEn: 'Select your destination country (required)',
    descriptionUz: 'Borishni xohlagan davlatingizni tanlang (majburiy)',
    descriptionRu: 'Выберите страну назначения (обязательно)',
    type: 'dropdown',
    required: true,
    options: [
      // Will be populated from backend /api/countries list
    ],
  },

  // A2: Purpose
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

  // A3: Duration
  {
    id: 'duration',
    titleEn: 'How long do you plan to stay?',
    titleUz: 'Qancha vaqt yashashni rejalashtirmoqchisiz?',
    titleRu: 'Как долго вы планируете оставаться?',
    descriptionEn: 'Select the duration of your stay',
    descriptionUz: 'Yashash muddatini tanlang',
    descriptionRu: 'Выберите продолжительность вашего пребывания',
    type: 'single',
    required: true,
    options: [
      {
        value: 'less_than_15_days',
        labelEn: 'Less than 15 days',
        labelUz: '15 kundan kam',
        labelRu: 'Менее 15 дней',
        icon: '📅',
      },
      {
        value: '15_30_days',
        labelEn: '15-30 days',
        labelUz: '15-30 kun',
        labelRu: '15-30 дней',
        icon: '📅',
      },
      {
        value: '1_3_months',
        labelEn: '1-3 months',
        labelUz: '1-3 oy',
        labelRu: '1-3 месяца',
        icon: '📅',
      },
      {
        value: '3_6_months',
        labelEn: '3-6 months',
        labelUz: '3-6 oy',
        labelRu: '3-6 месяцев',
        icon: '📅',
      },
      {
        value: 'more_than_6_months',
        labelEn: 'More than 6 months',
        labelUz: "6 oydan ko'p",
        labelRu: 'Более 6 месяцев',
        icon: '📅',
      },
    ],
  },

  // A4: Planned Travel Dates
  {
    id: 'plannedTravelDates',
    titleEn: 'When do you plan to travel?',
    titleUz: 'Qachon sayohat qilmoqchisiz?',
    titleRu: 'Когда вы планируете поехать?',
    descriptionEn: 'Enter your planned departure and return dates (optional)',
    descriptionUz:
      'Rejalashtirilgan ketish va qaytish sanalarini kiriting (ixtiyoriy)',
    descriptionRu:
      'Введите запланированные даты выезда и возвращения (необязательно)',
    type: 'text',
    required: false,
    options: [],
  },

  // A5: Current Residence Country
  {
    id: 'currentResidenceCountry',
    titleEn: 'Where do you live now?',
    titleUz: 'Hozir qayerda yashayapsiz?',
    titleRu: 'Где вы сейчас живете?',
    descriptionEn: 'Select your current country of residence',
    descriptionUz: 'Hozirgi yashash davlatingizni tanlang',
    descriptionRu: 'Выберите страну вашего текущего проживания',
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

  // ============================================================================
  // GROUP B: Personal / Family / Ties
  // ============================================================================

  // B1: Marital Status
  {
    id: 'maritalStatus',
    titleEn: 'What is your marital status?',
    titleUz: 'Oilaviy holatingiz qanday?',
    titleRu: 'Какое у вас семейное положение?',
    descriptionEn: 'Select your current marital status',
    descriptionUz: 'Hozirgi oilaviy holatingizni tanlang',
    descriptionRu: 'Выберите ваше текущее семейное положение',
    type: 'single',
    required: true,
    options: [
      {
        value: 'single',
        labelEn: 'Single',
        labelUz: 'Bekor',
        labelRu: 'Холост/Не замужем',
        icon: '👤',
      },
      {
        value: 'married',
        labelEn: 'Married',
        labelUz: 'Oilali',
        labelRu: 'Женат/Замужем',
        icon: '💑',
      },
      {
        value: 'divorced',
        labelEn: 'Divorced',
        labelUz: 'Ajrashgan',
        labelRu: 'Разведен/Разведена',
        icon: '💔',
      },
      {
        value: 'widowed',
        labelEn: 'Widowed',
        labelUz: 'Beva',
        labelRu: 'Вдовец/Вдова',
        icon: '🕯️',
      },
    ],
  },

  // B2: Has Children
  {
    id: 'hasChildren',
    titleEn: 'Do you have children?',
    titleUz: 'Farzandlaringiz bormi?',
    titleRu: 'У вас есть дети?',
    descriptionEn: 'Select if you have children',
    descriptionUz: "Farzandlaringiz bor yoki yo'qligini tanlang",
    descriptionRu: 'Выберите, есть ли у вас дети',
    type: 'single',
    required: true,
    options: [
      {
        value: 'none',
        labelEn: 'No children',
        labelUz: "Farzand yo'q",
        labelRu: 'Нет детей',
        icon: '❌',
      },
      {
        value: 'one',
        labelEn: 'One child',
        labelUz: 'Bitta farzand',
        labelRu: 'Один ребенок',
        icon: '👶',
      },
      {
        value: 'two_or_more',
        labelEn: 'Two or more children',
        labelUz: "Ikki yoki undan ko'p farzand",
        labelRu: 'Двое или более детей',
        icon: '👨‍👩‍👧‍👦',
      },
    ],
  },

  // B3: Family in Uzbekistan
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

  // B4: Property Documents
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

  // ============================================================================
  // GROUP C: Education / Work Status
  // ============================================================================

  // C1: Current Status
  {
    id: 'currentStatus',
    titleEn: 'What is your current status?',
    titleUz: 'Hozirgi holatingiz qanday?',
    titleRu: 'Каков ваш текущий статус?',
    descriptionEn: 'Select your current employment or education status',
    descriptionUz: "Hozirgi ish yoki ta'lim holatingizni tanlang",
    descriptionRu: 'Выберите ваш текущий статус занятости или образования',
    type: 'single',
    required: true,
    options: [
      {
        value: 'student',
        labelEn: 'Student',
        labelUz: 'Talaba',
        labelRu: 'Студент',
        icon: '🎓',
      },
      {
        value: 'employed',
        labelEn: 'Employed',
        labelUz: 'Ishlaydi',
        labelRu: 'Работает',
        icon: '💼',
      },
      {
        value: 'self_employed',
        labelEn: 'Self-employed / Business owner',
        labelUz: 'Tadbirkor',
        labelRu: 'Самозанятый / Владелец бизнеса',
        icon: '🏢',
      },
      {
        value: 'unemployed',
        labelEn: 'Unemployed',
        labelUz: 'Ishsiz',
        labelRu: 'Безработный',
        icon: '📋',
      },
    ],
  },

  // C2: Employer Details (conditional: if currentStatus is employed or self_employed)
  {
    id: 'employerDetails',
    titleEn: 'What is your employer or company name?',
    titleUz: 'Ish beruvchi yoki kompaniya nomi nima?',
    titleRu: 'Как называется ваш работодатель или компания?',
    descriptionEn: 'Enter your company or employer name',
    descriptionUz: 'Kompaniya yoki ish beruvchi nomini kiriting',
    descriptionRu: 'Введите название вашей компании или работодателя',
    type: 'text',
    required: false,
    options: [],
  },

  // C3: Monthly Salary (conditional: if currentStatus is employed or self_employed)
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

  // C4: University Acceptance (conditional: if purpose = study)
  {
    id: 'hasUniversityAcceptance',
    titleEn: 'Do you have a university acceptance letter?',
    titleUz: 'Universitet qabul xatingiz bormi?',
    titleRu: 'У вас есть письмо о зачислении в университет?',
    descriptionEn: 'I-20, COE, CAS, or similar acceptance document',
    descriptionUz: "I-20, COE, CAS yoki shunga o'xshash qabul hujjati",
    descriptionRu: 'I-20, COE, CAS или аналогичный документ о зачислении',
    type: 'boolean',
    required: false, // Will be enforced conditionally in UI
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

  // C5: Program Type (conditional: if purpose = study)
  {
    id: 'programType',
    titleEn: 'What type of program are you applying for?',
    titleUz: 'Qanday dasturga ariza bermoqchisiz?',
    titleRu: 'На какую программу вы подаете заявку?',
    descriptionEn: 'Select the type of educational program',
    descriptionUz: "Ta'lim dasturi turini tanlang",
    descriptionRu: 'Выберите тип образовательной программы',
    type: 'single',
    required: false,
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

  // C6: Diploma Available (conditional: if purpose = study)
  {
    id: 'diplomaAvailable',
    titleEn: 'Do you have your diploma available?',
    titleUz: 'Diplomingiz bormi?',
    titleRu: 'У вас есть диплом?',
    descriptionEn: 'Select if you have your educational diploma/certificate',
    descriptionUz: "Ta'lim diplom/sertifikatingiz bormi, tanlang",
    descriptionRu: 'Выберите, есть ли у вас диплом/сертификат об образовании',
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

  // C7: Transcript Available (conditional: if purpose = study)
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
  // GROUP D: Finances & Sponsor
  // ============================================================================

  // D1: Trip Funding
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
      {
        value: 'scholarship',
        labelEn: 'Scholarship',
        labelUz: 'Stipendiya',
        labelRu: 'Стипендия',
        icon: '🎓',
      },
      {
        value: 'mix',
        labelEn: 'Mix (self + sponsor/scholarship)',
        labelUz: "Aralash (o'zim + homiy/stipendiya)",
        labelRu: 'Смешанное (сам + спонсор/стипендия)',
        icon: '💰',
      },
    ],
  },

  // D2: Monthly Financial Capacity
  {
    id: 'monthlyFinancialCapacity',
    titleEn:
      'On average, how much money (in USD) can you show as your own funds?',
    titleUz:
      "O'rtacha, o'zingizning mablag'ingiz sifatida qancha pul (USD) ko'rsata olasiz?",
    titleRu:
      'В среднем, сколько денег (в USD) вы можете показать как собственные средства?',
    descriptionEn: 'Enter approximate amount in USD',
    descriptionUz: 'Taxminiy miqdorni USD da kiriting',
    descriptionRu: 'Введите примерную сумму в USD',
    type: 'text',
    required: false,
    options: [],
  },

  // D3: Sponsor Relationship (conditional: if tripFunding includes sponsor)
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
    required: false,
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

  // D4: Sponsor Employment (conditional: if tripFunding includes sponsor)
  {
    id: 'sponsorEmployment',
    titleEn: "What is your sponsor's employment status?",
    titleUz: 'Homiyingizning ish holati qanday?',
    titleRu: 'Каков статус занятости вашего спонсора?',
    descriptionEn: "Select your sponsor's current employment situation",
    descriptionUz: 'Homiyingizning hozirgi ish holatini tanlang',
    descriptionRu: 'Выберите текущую ситуацию с занятостью вашего спонсора',
    type: 'single',
    required: false,
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

  // D5: Sponsor Annual Income (conditional: if tripFunding includes sponsor)
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
    required: false,
    options: [],
  },

  // D6: Tuition Structure (conditional: if purpose = study)
  {
    id: 'tuitionStructure',
    titleEn: 'How is your tuition being paid?',
    titleUz: "Ta'lim to'lovi qanday amalga oshirilmoqda?",
    titleRu: 'Как оплачивается ваше обучение?',
    descriptionEn: 'Select how your tuition fees are structured',
    descriptionUz: "Ta'lim to'lovi qanday tuzilganini tanlang",
    descriptionRu: 'Выберите, как структурирована оплата обучения',
    type: 'single',
    required: false,
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

  // D7: Living Expenses Payer (conditional: if purpose = study)
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
    required: false,
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

  // ============================================================================
  // GROUP E: Travel History & Refusals
  // ============================================================================

  // E1: Traveled Before
  {
    id: 'traveledBefore',
    titleEn: 'Have you travelled abroad before?',
    titleUz: 'Ilgari chet elga borganmisiz?',
    titleRu: 'Вы раньше ездили за границу?',
    descriptionEn: 'Select if you have traveled to other countries before',
    descriptionUz: 'Ilgari boshqa davlatlarga borganmisiz, tanlang',
    descriptionRu: 'Выберите, ездили ли вы раньше в другие страны',
    type: 'boolean',
    required: true,
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

  // E2: Visited Countries (conditional: if traveledBefore = true)
  {
    id: 'visitedCountries',
    titleEn: 'Which countries have you visited?',
    titleUz: 'Qaysi davlatlarga borgansiz?',
    titleRu: 'Какие страны вы посещали?',
    descriptionEn: 'List countries you have visited (optional)',
    descriptionUz: "Borgan davlatlaringizni ro'yxatlang (ixtiyoriy)",
    descriptionRu: 'Перечислите страны, которые вы посещали (необязательно)',
    type: 'text',
    required: false,
    options: [],
  },

  // E3: Visa Refusals
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

  // E4: Visa Refusal Details (conditional: if hasVisaRefusals = true)
  {
    id: 'visaRefusalDetails',
    titleEn: 'Please provide details about your visa refusal(s)',
    titleUz: "Viza rad etilgan holatlar haqida ma'lumot bering",
    titleRu: 'Пожалуйста, предоставьте подробности об отказе в визе',
    descriptionEn: 'Which country, when, and reason if known (optional)',
    descriptionUz: "Qaysi davlat, qachon va sabab (agar ma'lum bo'lsa)",
    descriptionRu:
      'Какая страна, когда и причина, если известна (необязательно)',
    type: 'text',
    required: false,
    options: [],
  },

  // ============================================================================
  // GROUP F: English Level & Existing Documents
  // ============================================================================

  // F1: English Level
  {
    id: 'englishLevel',
    titleEn: 'What is your English proficiency level?',
    titleUz: 'Ingliz tilini bilish darajangiz qanday?',
    titleRu: 'Какой у вас уровень владения английским языком?',
    descriptionEn: 'Select your English language proficiency level',
    descriptionUz: 'Ingliz tilini bilish darajangizni tanlang',
    descriptionRu: 'Выберите ваш уровень владения английским языком',
    type: 'single',
    required: true,
    options: [
      {
        value: 'basic',
        labelEn: 'Basic',
        labelUz: "Boshlang'ich",
        labelRu: 'Базовый',
        icon: '📚',
      },
      {
        value: 'pre_intermediate',
        labelEn: 'Pre-intermediate',
        labelUz: "O'rtacha boshlang'ich",
        labelRu: 'Ниже среднего',
        icon: '📚',
      },
      {
        value: 'intermediate',
        labelEn: 'Intermediate',
        labelUz: "O'rtacha",
        labelRu: 'Средний',
        icon: '📚',
      },
      {
        value: 'upper_intermediate',
        labelEn: 'Upper-intermediate',
        labelUz: "O'rtacha yuqori",
        labelRu: 'Выше среднего',
        icon: '📚',
      },
      {
        value: 'advanced',
        labelEn: 'Advanced',
        labelUz: 'Yuqori',
        labelRu: 'Продвинутый',
        icon: '📚',
      },
    ],
  },

  // F2: Bank Statements
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

  // F3: Travel Insurance
  {
    id: 'hasInsurance',
    titleEn: 'Do you have travel insurance?',
    titleUz: "Sayohat sug'urtangiz bormi?",
    titleRu: 'У вас есть туристическая страховка?',
    descriptionEn: 'Travel insurance coverage for your trip',
    descriptionUz: "Sayohatingiz uchun sayohat sug'urtasi",
    descriptionRu: 'Страховое покрытие для вашей поездки',
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
];
