/**
 * Document Translations
 * Multilingual document names and descriptions
 */

export interface DocumentTranslation {
  type: string;
  nameEn: string;
  nameUz: string;
  nameRu: string;
  descriptionEn: string;
  descriptionUz: string;
  descriptionRu: string;
}

export const documentTranslations: Record<string, DocumentTranslation> = {
  passport: {
    type: 'passport',
    nameEn: 'Passport',
    nameUz: 'Pasport',
    nameRu: 'Паспорт',
    descriptionEn: 'Valid passport with at least 6 months validity beyond your intended stay',
    descriptionUz: "Qolish muddatidan kamida 6 oy amal qilish muddati bo'lgan pasport",
    descriptionRu:
      'Действительный паспорт со сроком действия не менее 6 месяцев после предполагаемого пребывания',
  },
  bank_statement: {
    type: 'bank_statement',
    nameEn: 'Bank Statement',
    nameUz: 'Bank Hisobi',
    nameRu: 'Банковская Выписка',
    descriptionEn: 'Recent bank statement (last 6 months) showing sufficient funds',
    descriptionUz: "So'nggi bank hisobi (oxirgi 6 oy) yetarli mablag'ni ko'rsatadi",
    descriptionRu:
      'Недавняя банковская выписка (последние 6 месяцев), показывающая достаточные средства',
  },
  i20_form: {
    type: 'i20_form',
    nameEn: 'I-20 Form',
    nameUz: 'I-20 Shakl',
    nameRu: 'Форма I-20',
    descriptionEn: 'Certificate of Eligibility for F-1 Student Status (issued by university)',
    descriptionUz:
      'F-1 Talaba Holati uchun Muvofiqlik Sertifikati (universitet tomonidan berilgan)',
    descriptionRu: 'Сертификат соответствия для статуса студента F-1 (выдается университетом)',
  },
  acceptance_letter: {
    type: 'acceptance_letter',
    nameEn: 'Acceptance Letter',
    nameUz: 'Qabul Xati',
    nameRu: 'Письмо о Зачислении',
    descriptionEn: 'Official acceptance letter from educational institution',
    descriptionUz: "Ta'lim muassasasidan rasmiy qabul xati",
    descriptionRu: 'Официальное письмо о зачислении от учебного заведения',
  },
  academic_records: {
    type: 'academic_records',
    nameEn: 'Academic Records',
    nameUz: 'Akademik Hujjatlar',
    nameRu: 'Академические Записи',
    descriptionEn: 'Transcripts, diplomas, and certificates of previous education',
    descriptionUz: "Transkriptlar, diplomlar va oldingi ta'lim sertifikatlari",
    descriptionRu: 'Транскрипты, дипломы и сертификаты предыдущего образования',
  },
  passport_photo: {
    type: 'passport_photo',
    nameEn: 'Passport Photo',
    nameUz: 'Pasport Fotosi',
    nameRu: 'Фото на Паспорт',
    descriptionEn: '2x2 inch photo with white background, taken within last 6 months',
    descriptionUz: '2x2 dyuymli foto, oq fon, oxirgi 6 oy ichida olingan',
    descriptionRu: 'Фото 2x2 дюйма на белом фоне, сделанное за последние 6 месяцев',
  },
  visa_application_form: {
    type: 'visa_application_form',
    nameEn: 'Visa Application Form',
    nameUz: 'Viza Ariza Shakli',
    nameRu: 'Форма Заявления на Визу',
    descriptionEn: 'Completed and signed visa application form',
    descriptionUz: "To'ldirilgan va imzolangan viza ariza shakli",
    descriptionRu: 'Заполненная и подписанная форма заявления на визу',
  },
  marriage_certificate: {
    type: 'marriage_certificate',
    nameEn: 'Marriage Certificate',
    nameUz: 'Nikoh Guvohnomasi',
    nameRu: 'Свидетельство о Браке',
    descriptionEn: 'Official marriage certificate (if married)',
    descriptionUz: "Rasmiy nikoh guvohnomasi (agar turmush qurgan bo'lsa)",
    descriptionRu: 'Официальное свидетельство о браке (если женат/замужем)',
  },
  birth_certificates: {
    type: 'birth_certificates',
    nameEn: 'Birth Certificates of Children',
    nameUz: "Farzandlarning Tug'ilganlik Guvohnomasi",
    nameRu: 'Свидетельства о Рождении Детей',
    descriptionEn: 'Birth certificates for all dependent children',
    descriptionUz: "Barcha qaramog'idagi farzandlar uchun tug'ilganlik guvohnomalari",
    descriptionRu: 'Свидетельства о рождении всех детей на иждивении',
  },
  sponsor_letter: {
    type: 'sponsor_letter',
    nameEn: 'Sponsor Letter',
    nameUz: 'Homiy Xati',
    nameRu: 'Письмо Спонсора',
    descriptionEn: 'Letter from sponsor stating financial support commitment',
    descriptionUz: 'Homiydan moliyaviy yordam majburiyatini bildiruvchi xat',
    descriptionRu: 'Письмо от спонсора о финансовой поддержке',
  },
  sponsor_financial_documents: {
    type: 'sponsor_financial_documents',
    nameEn: "Sponsor's Financial Documents",
    nameUz: 'Homiyning Moliyaviy Hujjatlari',
    nameRu: 'Финансовые Документы Спонсора',
    descriptionEn: 'Bank statements and income proof of sponsor',
    descriptionUz: 'Homiyning bank hisoblari va daromad isboti',
    descriptionRu: 'Банковские выписки и доказательство дохода спонсора',
  },
  job_offer_letter: {
    type: 'job_offer_letter',
    nameEn: 'Job Offer Letter',
    nameUz: 'Ish Taklifi Xati',
    nameRu: 'Письмо с Предложением Работы',
    descriptionEn: 'Official job offer letter from employer',
    descriptionUz: 'Ish beruvchidan rasmiy ish taklifi xati',
    descriptionRu: 'Официальное письмо с предложением работы от работодателя',
  },
  employment_contract: {
    type: 'employment_contract',
    nameEn: 'Employment Contract',
    nameUz: 'Mehnat Shartnomasi',
    nameRu: 'Трудовой Договор',
    descriptionEn: 'Signed employment contract with terms and conditions',
    descriptionUz: 'Shartlar va shartlar bilan imzolangan mehnat shartnomasi',
    descriptionRu: 'Подписанный трудовой договор с условиями',
  },
  travel_itinerary: {
    type: 'travel_itinerary',
    nameEn: 'Travel Itinerary',
    nameUz: 'Sayohat Marshrutsi',
    nameRu: 'Маршрут Путешествия',
    descriptionEn: 'Detailed travel itinerary including flights and accommodation',
    descriptionUz: 'Parvozlar va turar joy bilan batafsil sayohat marshrutsi',
    descriptionRu: 'Подробный маршрут путешествия, включая рейсы и проживание',
  },
  hotel_reservations: {
    type: 'hotel_reservations',
    nameEn: 'Hotel Reservations',
    nameUz: 'Mehmonxona Bron',
    nameRu: 'Бронирование Отеля',
    descriptionEn: 'Confirmed hotel reservations for duration of stay',
    descriptionUz: 'Qolish muddati uchun tasdiqlangan mehmonxona bron',
    descriptionRu: 'Подтвержденное бронирование отеля на период пребывания',
  },
  business_invitation: {
    type: 'business_invitation',
    nameEn: 'Business Invitation Letter',
    nameUz: 'Biznes Taklifnoma',
    nameRu: 'Деловое Приглашение',
    descriptionEn: 'Invitation letter from business partner or company',
    descriptionUz: 'Biznes hamkor yoki kompaniyadan taklifnoma',
    descriptionRu: 'Приглашение от делового партнера или компании',
  },
  proof_of_tuition_payment: {
    type: 'proof_of_tuition_payment',
    nameEn: 'Proof of Tuition Payment',
    nameUz: "O'quv To'lovi Isboti",
    nameRu: 'Подтверждение Оплаты Обучения',
    descriptionEn: 'Receipt or confirmation of tuition fee payment',
    descriptionUz: "O'quv to'lovi to'lovi kvitansiyasi yoki tasdiqlanishi",
    descriptionRu: 'Квитанция или подтверждение оплаты обучения',
  },
  police_clearance: {
    type: 'police_clearance',
    nameEn: 'Police Clearance Certificate',
    nameUz: 'Politsiya Tozaligi Sertifikati',
    nameRu: 'Справка о Несудимости',
    descriptionEn: 'Police clearance certificate from your country of residence',
    descriptionUz: 'Yashash davlatingizdan politsiya tozaligi sertifikati',
    descriptionRu: 'Справка о несудимости из страны проживания',
  },
  medical_certificate: {
    type: 'medical_certificate',
    nameEn: 'Medical Certificate',
    nameUz: 'Tibbiy Sertifikat',
    nameRu: 'Медицинская Справка',
    descriptionEn: 'Medical examination certificate from approved physician',
    descriptionUz: "Tasdiqlangan shifokordan tibbiy ko'rik sertifikati",
    descriptionRu: 'Медицинская справка от аккредитованного врача',
  },
  proof_of_residence: {
    type: 'proof_of_residence',
    nameEn: 'Proof of Residence',
    nameUz: 'Yashash Joyi Isboti',
    nameRu: 'Подтверждение Места Жительства',
    descriptionEn: 'Utility bill or rental agreement showing current address',
    descriptionUz: "Joriy manzilni ko'rsatuvchi kommunal to'lov yoki ijara shartnomasi",
    descriptionRu: 'Счет за коммунальные услуги или договор аренды с текущим адресом',
  },
  degree_certificate: {
    type: 'degree_certificate',
    nameEn: 'Degree Certificate',
    nameUz: 'Diplom Sertifikati',
    nameRu: 'Диплом',
    descriptionEn: 'University degree or diploma certificate',
    descriptionUz: 'Universitet diplomi yoki diplom sertifikati',
    descriptionRu: 'Университетский диплом или сертификат',
  },
  employment_verification: {
    type: 'employment_verification',
    nameEn: 'Employment Verification',
    nameUz: 'Ish Tasdiqlanishi',
    nameRu: 'Подтверждение Трудоустройства',
    descriptionEn: 'Letter from employer confirming your employment',
    descriptionUz: 'Ish beruvchidan ishingizni tasdiqlovchi xat',
    descriptionRu: 'Письмо от работодателя, подтверждающее вашу занятость',
  },
  company_registration: {
    type: 'company_registration',
    nameEn: 'Company Registration',
    nameUz: "Kompaniya Ro'yxatdan O'tishi",
    nameRu: 'Регистрация Компании',
    descriptionEn: 'Company registration documents and business license',
    descriptionUz: "Kompaniya ro'yxatdan o'tish hujjatlari va biznes litsenziyasi",
    descriptionRu: 'Документы регистрации компании и бизнес-лицензия',
  },
  proof_of_funds: {
    type: 'proof_of_funds',
    nameEn: 'Proof of Funds',
    nameUz: "Mablag' Isboti",
    nameRu: 'Подтверждение Средств',
    descriptionEn: 'Bank statements or financial documents proving sufficient funds for the trip',
    descriptionUz:
      "Sayohat uchun yetarli mablag'ni isbotlovchi bank hisoblari yoki moliyaviy hujjatlar",
    descriptionRu:
      'Банковские выписки или финансовые документы, подтверждающие достаточные средства для поездки',
  },
  property_documents: {
    type: 'property_documents',
    nameEn: 'Property Documents',
    nameUz: 'Mulk Hujjatlari',
    nameRu: 'Документы на Недвижимость',
    descriptionEn:
      'Documents proving property ownership in home country (deed, registration, etc.)',
    descriptionUz:
      "Vatandagi mulk egaligini isbotlovchi hujjatlar (guvohnoma, ro'yxatdan o'tish va boshqalar)",
    descriptionRu:
      'Документы, подтверждающие право собственности на недвижимость в стране проживания (свидетельство, регистрация и т.д.)',
  },
  family_ties_documents: {
    type: 'family_ties_documents',
    nameEn: 'Family Ties Documents',
    nameUz: "Oila Bog'liqlik Hujjatlari",
    nameRu: 'Документы о Семейных Связях',
    descriptionEn:
      'Documents showing family relationships and ties to home country (marriage certificate, birth certificates of children, etc.)',
    descriptionUz:
      "Oila munosabatlari va vatanga bog'liqlikni ko'rsatuvchi hujjatlar (nikoh guvohnomasi, farzandlarning tug'ilganlik guvohnomalari va boshqalar)",
    descriptionRu:
      'Документы, показывающие семейные отношения и связи со страной проживания (свидетельство о браке, свидетельства о рождении детей и т.д.)',
  },
  family_ties_proof: {
    type: 'family_ties_proof',
    nameEn: 'Family Ties Proof',
    nameUz: "Oila Bog'liqlik Isboti",
    nameRu: 'Подтверждение Семейных Связей',
    descriptionEn: 'Documents proving family ties to home country',
    descriptionUz: "Vatanga oilaviy bog'liqlikni isbotlovchi hujjatlar",
    descriptionRu: 'Документы, подтверждающие семейные связи со страной проживания',
  },
  travel_insurance: {
    type: 'travel_insurance',
    nameEn: 'Travel Insurance',
    nameUz: "Sayohat Sug'urtasi",
    nameRu: 'Страховка для Путешествия',
    descriptionEn:
      'Travel health insurance covering entire Schengen stay with minimum €30,000 coverage',
    descriptionUz:
      "Butun Shengen qolish muddatini qamrab oladigan, kamida €30,000 sug'urta qoplamasi bo'lgan sayohat sog'liqni saqlash sug'urtasi",
    descriptionRu:
      'Медицинская страховка для путешествия, покрывающая весь период пребывания в Шенгене с минимальным покрытием €30,000',
  },
  visa_fee_receipt: {
    type: 'visa_fee_receipt',
    nameEn: 'Visa Fee Receipt',
    nameUz: "Viza To'lovi Kvitansiyasi",
    nameRu: 'Квитанция об Оплате Визы',
    descriptionEn: 'Proof of payment for Schengen visa application fee (€80 for adults)',
    descriptionUz: "Shengen viza ariza to'lovi uchun to'lov isboti (kattalar uchun €80)",
    descriptionRu: 'Подтверждение оплаты сбора за заявление на шенгенскую визу (€80 для взрослых)',
  },
  accommodation_proof: {
    type: 'accommodation_proof',
    nameEn: 'Accommodation Proof',
    nameUz: 'Turar Joy Isboti',
    nameRu: 'Подтверждение Проживания',
    descriptionEn:
      'Hotel bookings, Airbnb reservations, or host accommodation confirmation for entire stay in Spain and Schengen area',
    descriptionUz:
      'Ispaniya va Shengen hududida butun qolish muddati uchun mehmonxona bronlari, Airbnb bronlari yoki mehmonxona tasdiqlanishi',
    descriptionRu:
      'Бронирование отелей, бронирование Airbnb или подтверждение размещения у принимающей стороны на весь период пребывания в Испании и Шенгенской зоне',
  },
  invitation_letter: {
    type: 'invitation_letter',
    nameEn: 'Invitation Letter',
    nameUz: 'Taklifnoma',
    nameRu: 'Пригласительное Письмо',
    descriptionEn:
      'Letter from Spanish host inviting applicant, including purpose of visit and accommodation details',
    descriptionUz:
      "Arizachi taklif qiluvchi ispaniyalik mezbon xati, tashrif maqsadi va turar joy tafsilotlarini o'z ichiga oladi",
    descriptionRu:
      'Письмо от испанского принимающего лица с приглашением заявителя, включая цель визита и детали размещения',
  },
  host_registration_document: {
    type: 'host_registration_document',
    nameEn: 'Host Registration Document',
    nameUz: "Mezbon Ro'yxatdan O'tish Hujjati",
    nameRu: 'Документ о Регистрации Принимающей Стороны',
    descriptionEn:
      'Proof of host registration/address in Spain (e.g., padrón/empadronamiento or rental contract)',
    descriptionUz:
      "Ispaniyada mezbon ro'yxatdan o'tish/manzil isboti (masalan, padrón/empadronamiento yoki ijara shartnomasi)",
    descriptionRu:
      'Подтверждение регистрации/адреса принимающей стороны в Испании (например, padrón/empadronamiento или договор аренды)',
  },
  previous_visas: {
    type: 'previous_visas',
    nameEn: 'Previous Visas',
    nameUz: 'Oldingi Vizalar',
    nameRu: 'Предыдущие Визы',
    descriptionEn: 'Copies of previous Schengen or other visas',
    descriptionUz: 'Oldingi Shengen yoki boshqa vizalarning nusxalari',
    descriptionRu: 'Копии предыдущих шенгенских или других виз',
  },
  cover_letter: {
    type: 'cover_letter',
    nameEn: 'Cover Letter',
    nameUz: 'Xat',
    nameRu: 'Сопроводительное Письмо',
    descriptionEn:
      'Personal cover letter explaining purpose of visit, itinerary, and ties to home country, addressed to the Spanish consulate/embassy',
    descriptionUz:
      "Tashrif maqsadi, marshrut va vatanga bog'liqlikni tushuntiruvchi shaxsiy xat, Ispaniya konsulxona/elchixonasiga yuborilgan",
    descriptionRu:
      'Личное сопроводительное письмо с объяснением цели визита, маршрута и связей со страной проживания, адресованное консульству/посольству Испании',
  },
  flight_booking: {
    type: 'flight_booking',
    nameEn: 'Flight Booking',
    nameUz: 'Parvoz Broni',
    nameRu: 'Бронирование Рейса',
    descriptionEn: 'Flight reservation or booking confirmation',
    descriptionUz: 'Parvoz broni yoki bron tasdiqlanishi',
    descriptionRu: 'Бронирование или подтверждение бронирования рейса',
  },
  employment_certificate: {
    type: 'employment_certificate',
    nameEn: 'Employment Certificate',
    nameUz: "Ish Joyidan Ma'lumotnoma",
    nameRu: 'Справка с Места Работы',
    descriptionEn:
      'Letter from current employer confirming employment, position, salary, and leave approval',
    descriptionUz:
      "Joriy ish beruvchidan ish, lavozim, maosh va ta'til tasdiqlanishini tasdiqlovchi xat",
    descriptionRu:
      'Письмо от текущего работодателя, подтверждающее трудоустройство, должность, зарплату и одобрение отпуска',
  },
};

/**
 * Format snake_case or kebab-case to Title Case
 */
function formatDocumentName(name: string): string {
  return name
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get document translation by type
 */
export function getDocumentTranslation(documentType: string): DocumentTranslation {
  // Normalize document type (lowercase, replace spaces with underscores)
  const normalizedType = documentType.toLowerCase().replace(/\s+/g, '_');

  // Try exact match
  if (documentTranslations[normalizedType]) {
    return documentTranslations[normalizedType];
  }

  // Try partial match
  const partialMatch = Object.keys(documentTranslations).find(
    (key) => key.includes(normalizedType) || normalizedType.includes(key)
  );

  if (partialMatch) {
    return documentTranslations[partialMatch];
  }

  // Default fallback with formatted name
  const formattedName = formatDocumentName(documentType);
  return {
    type: documentType,
    nameEn: formattedName,
    nameUz: formattedName,
    nameRu: formattedName,
    descriptionEn: 'Required document for visa application',
    descriptionUz: 'Viza arizasi uchun kerakli hujjat',
    descriptionRu: 'Необходимый документ для визовой заявки',
  };
}
