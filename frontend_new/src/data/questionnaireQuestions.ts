/**
 * Questionnaire Questions
 * 10 essential questions for visa application planning
 */

import { Question } from '../types/questionnaire';

export const questionnaireQuestions: Question[] = [
  // Question 1: Purpose of travel
  {
    id: 'purpose',
    titleEn: 'What is your purpose of travel?',
    titleUz: 'Sayohat maqsadingiz nima?',
    titleRu: 'Какова цель вашей поездки?',
    descriptionEn: 'Select the main reason for your travel',
    descriptionUz: 'Sayohatingizning asosiy sababini tanlang',
    descriptionRu: 'Выберите основную причину вашей поездки',
    type: 'single',
    required: true,
    options: [
      {
        value: 'study',
        labelEn: 'Study',
        labelUz: "O'qish",
        labelRu: 'Учеба',
        icon: '📚',
      },
      {
        value: 'work',
        labelEn: 'Work',
        labelUz: 'Ish',
        labelRu: 'Работа',
        icon: '💼',
      },
      {
        value: 'tourism',
        labelEn: 'Tourism',
        labelUz: 'Turizm',
        labelRu: 'Туризм',
        icon: '✈️',
      },
      {
        value: 'business',
        labelEn: 'Business',
        labelUz: 'Biznes',
        labelRu: 'Бизнес',
        icon: '🤝',
      },
      {
        value: 'immigration',
        labelEn: 'Immigration',
        labelUz: 'Immigratsiya',
        labelRu: 'Иммиграция',
        icon: '🏠',
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

  // Question 2: Country
  {
    id: 'country',
    titleEn: 'Which country are you interested in?',
    titleUz: 'Qaysi davlatga bormoqchisiz?',
    titleRu: 'В какую страну вы хотите поехать?',
    descriptionEn: 'Select your destination country',
    descriptionUz: 'Borishni xohlagan davlatingizni tanlang',
    descriptionRu: 'Выберите страну назначения',
    type: 'dropdown',
    required: false,
    options: [
      {
        value: 'not_sure',
        labelEn: 'Not sure yet',
        labelUz: 'Hali bilmayman',
        labelRu: 'Еще не уверен',
        icon: '❓',
      },
      // Will be populated from backend countries list
    ],
  },

  // Question 3: Duration
  {
    id: 'duration',
    titleEn: 'How long do you plan to stay?',
    titleUz: 'Qancha vaqt qolmoqchisiz?',
    titleRu: 'Как долго вы планируете остаться?',
    descriptionEn: 'Estimated duration of your stay',
    descriptionUz: 'Taxminiy qolish muddati',
    descriptionRu: 'Предполагаемая продолжительность пребывания',
    type: 'single',
    required: true,
    options: [
      {
        value: 'less_than_1',
        labelEn: 'Less than 1 month',
        labelUz: '1 oydan kam',
        labelRu: 'Менее 1 месяца',
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
        value: '6_12_months',
        labelEn: '6-12 months',
        labelUz: '6-12 oy',
        labelRu: '6-12 месяцев',
        icon: '📅',
      },
      {
        value: 'more_than_1_year',
        labelEn: 'More than 1 year',
        labelUz: '1 yildan ko\'p',
        labelRu: 'Более 1 года',
        icon: '📅',
      },
    ],
  },

  // Question 4: Travel history
  {
    id: 'traveledBefore',
    titleEn: 'Have you traveled abroad before?',
    titleUz: 'Ilgari chet elga chiqqanmisiz?',
    titleRu: 'Вы раньше выезжали за границу?',
    descriptionEn: 'Previous international travel experience',
    descriptionUz: 'Ilgari xalqaro sayohat tajribangiz',
    descriptionRu: 'Предыдущий опыт международных поездок',
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

  // Question 5: Current status
  {
    id: 'currentStatus',
    titleEn: 'What is your current status?',
    titleUz: 'Hozirgi holatangiz?',
    titleRu: 'Каков ваш текущий статус?',
    descriptionEn: 'Your current employment or education status',
    descriptionUz: 'Hozirgi ish yoki ta\'lim holatingiz',
    descriptionRu: 'Ваш текущий статус занятости или образования',
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
        value: 'employee',
        labelEn: 'Employee',
        labelUz: 'Xodim',
        labelRu: 'Сотрудник',
        icon: '💼',
      },
      {
        value: 'entrepreneur',
        labelEn: 'Entrepreneur',
        labelUz: 'Tadbirkor',
        labelRu: 'Предприниматель',
        icon: '🚀',
      },
      {
        value: 'unemployed',
        labelEn: 'Unemployed',
        labelUz: 'Ishsiz',
        labelRu: 'Безработный',
        icon: '🔍',
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

  // Question 6: Invitation/Acceptance
  {
    id: 'hasInvitation',
    titleEn: 'Do you have an invitation/I-20/acceptance letter?',
    titleUz: 'Taklifnoma/I-20/qabul xatingiz bormi?',
    titleRu: 'У вас есть приглашение/I-20/письмо о зачислении?',
    descriptionEn: 'Required documents from host institution',
    descriptionUz: 'Qabul qiluvchi muassasadan kerakli hujjatlar',
    descriptionRu: 'Необходимые документы от принимающего учреждения',
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

  // Question 7: Financial situation
  {
    id: 'financialSituation',
    titleEn: 'What is your financial situation?',
    titleUz: 'Moliyaviy holatangiz?',
    titleRu: 'Какова ваша финансовая ситуация?',
    descriptionEn: 'How you will fund your travel',
    descriptionUz: 'Sayohatingizni qanday moliyalashtirmoqchisiz',
    descriptionRu: 'Как вы будете финансировать поездку',
    type: 'single',
    required: true,
    options: [
      {
        value: 'stable_income',
        labelEn: 'Stable income',
        labelUz: 'Barqaror daromad',
        labelRu: 'Стабильный доход',
        icon: '💰',
      },
      {
        value: 'sponsor',
        labelEn: 'Have sponsor',
        labelUz: 'Homiy bor',
        labelRu: 'Есть спонсор',
        icon: '🤝',
      },
      {
        value: 'savings',
        labelEn: 'Savings',
        labelUz: "Jamg'arma",
        labelRu: 'Накопления',
        icon: '🏦',
      },
      {
        value: 'preparing',
        labelEn: 'Preparing',
        labelUz: 'Tayyorlanmoqda',
        labelRu: 'Готовлюсь',
        icon: '📊',
      },
    ],
  },

  // Question 8: Marital status
  {
    id: 'maritalStatus',
    titleEn: 'What is your marital status?',
    titleUz: 'Oilaviy holatangiz?',
    titleRu: 'Ваше семейное положение?',
    descriptionEn: 'Your current marital status',
    descriptionUz: 'Hozirgi oilaviy holatingiz',
    descriptionRu: 'Ваше текущее семейное положение',
    type: 'single',
    required: true,
    options: [
      {
        value: 'single',
        labelEn: 'Single',
        labelUz: 'Turmush qurmagan',
        labelRu: 'Холост/Не замужем',
        icon: '👤',
      },
      {
        value: 'married',
        labelEn: 'Married',
        labelUz: 'Turmush qurgan',
        labelRu: 'Женат/Замужем',
        icon: '💑',
      },
      {
        value: 'divorced',
        labelEn: 'Divorced',
        labelUz: 'Ajrashgan',
        labelRu: 'Разведен(а)',
        icon: '📋',
      },
    ],
  },

  // Question 9: Children
  {
    id: 'hasChildren',
    titleEn: 'Do you have children?',
    titleUz: 'Farzandlaringiz bormi?',
    titleRu: 'У вас есть дети?',
    descriptionEn: 'Number of dependent children',
    descriptionUz: 'Qaramog\'idagi farzandlar soni',
    descriptionRu: 'Количество детей на иждивении',
    type: 'single',
    required: true,
    options: [
      {
        value: 'no',
        labelEn: 'No',
        labelUz: "Yo'q",
        labelRu: 'Нет',
        icon: '❌',
      },
      {
        value: 'one',
        labelEn: 'Yes, 1 child',
        labelUz: 'Ha, 1 ta',
        labelRu: 'Да, 1 ребенок',
        icon: '👶',
      },
      {
        value: 'two_plus',
        labelEn: 'Yes, 2+ children',
        labelUz: 'Ha, 2+',
        labelRu: 'Да, 2+ детей',
        icon: '👶👶',
      },
    ],
  },

  // Question 10: English proficiency
  {
    id: 'englishLevel',
    titleEn: 'What is your English proficiency level?',
    titleUz: 'Ingliz tili darajangiz?',
    titleRu: 'Каков ваш уровень английского языка?',
    descriptionEn: 'Your English language skills',
    descriptionUz: 'Ingliz tili bilim darajangiz',
    descriptionRu: 'Ваш уровень владения английским',
    type: 'single',
    required: true,
    options: [
      {
        value: 'beginner',
        labelEn: 'Beginner',
        labelUz: "Boshlang'ich",
        labelRu: 'Начальный',
        icon: '🌱',
      },
      {
        value: 'intermediate',
        labelEn: 'Intermediate',
        labelUz: "O'rta",
        labelRu: 'Средний',
        icon: '📚',
      },
      {
        value: 'advanced',
        labelEn: 'Advanced',
        labelUz: "Ilg'or",
        labelRu: 'Продвинутый',
        icon: '🎓',
      },
      {
        value: 'native',
        labelEn: 'Native',
        labelUz: 'Ona tili',
        labelRu: 'Родной',
        icon: '🌟',
      },
    ],
  },
];


