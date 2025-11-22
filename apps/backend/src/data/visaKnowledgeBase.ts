export type VisaType = 'tourist' | 'student';

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

/**
 * Get visa knowledge base content for a given country and visa type
 * @param country - Country name (e.g., "Spain")
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

  if (normalizedCountry !== 'spain') return '';

  // Only support tourist and student for now
  if (normalizedVisaType !== 'tourist' && normalizedVisaType !== 'student') {
    return '';
  }

  const entries = SPAIN_VISA_RULES.filter(
    (entry) => entry.country.toLowerCase() === 'spain' && entry.visaType === normalizedVisaType
  );

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
  parts.push(`COUNTRY: Spain`);
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
