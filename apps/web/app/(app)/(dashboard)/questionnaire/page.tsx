'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/lib/stores/auth';
import { apiClient } from '@/lib/api/client';
import { QuestionnaireV2, TargetCountry, COUNTRY_OPTIONS } from '@/lib/types/questionnaire';
import { mapQuestionnaireV2ToLegacy } from '@/lib/utils/questionnaireMapper';
import { getErrorMessage } from '@/lib/utils/errorMessages';
import ErrorBanner from '@/components/ErrorBanner';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

const TOTAL_STEPS = 11;

export default function QuestionnairePage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isSignedIn } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [countries, setCountries] = useState<Array<{ code: string; name: string }>>([]);
  const [countriesError, setCountriesError] = useState<string | null>(null);

  // Load country suggestions from backend meta endpoint
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const res = await apiClient.getMetaCountries();
        if (res.success && Array.isArray(res.data)) {
          setCountries(res.data);
        }
      } catch (err) {
        setCountriesError('Failed to load countries');
      }
    };
    loadCountries();
  }, []);

  // Initialize v2 structure with proper types
  const [formData, setFormData] = useState<Partial<QuestionnaireV2>>({
    version: '2.0',
    contact: {},
    personal: {
      nationality: 'UZ',
      ageRange: undefined as any,
      maritalStatus: undefined as any,
      passportStatus: undefined as any,
    },
    travel: {
      isExactDatesKnown: false,
      durationCategory: undefined as any,
      plannedWhen: undefined as any,
      tripDurationDays: undefined,
    },
    status: {
      isMinor: false,
      currentStatus: undefined as any,
      highestEducation: undefined as any,
    },
    finance: {
      hasBankStatement: false,
      hasStableIncome: false,
      payer: undefined as any,
      approxMonthlyIncomeRange: undefined as any,
      sponsorRelationship: undefined,
    },
    invitation: {
      hasInvitation: false,
    },
    stay: {
      hasRoundTripTicket: false,
      accommodationType: undefined as any,
    },
    history: {
      hasTraveledBefore: false,
      regionsVisited: [],
      hasVisaRefusals: false,
      hasOverstay: undefined,
      travelHistoryLevel: undefined,
    },
    ties: {
      hasProperty: false,
      propertyType: [],
      hasCloseFamilyInUzbekistan: false,
    },
    documents: {
      hasEmploymentOrStudyProof: false,
      hasInsurance: false,
      hasPassport: false,
      hasBirthCertificate: false,
      hasPropertyDocs: false,
    },
    special: {
      travelingWithChildren: false,
      hasMedicalReasonForTrip: false,
      hasCriminalRecord: false,
    },
    studentModule: {},
    workModule: {},
    familyModule: {},
    businessModule: {},
    transitModule: {},
  });

  if (!isSignedIn) {
    router.push('/login');
    return null;
  }

  const updateField = (path: string, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current: any = newData;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newData;
    });
    setError(''); // Clear error on field change
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: // Country & Visa Type
        return !!(formData.targetCountry && formData.visaType);
      case 1: // Personal
        return !!(
          formData.personal?.ageRange &&
          formData.personal?.maritalStatus &&
          formData.personal?.nationality &&
          formData.personal?.passportStatus
        );
      case 2: // Status & Education
        return !!(formData.status?.currentStatus && formData.status?.highestEducation);
      case 3: // Travel Profile
        return !!(
          formData.travel?.plannedWhen !== undefined &&
          formData.travel?.isExactDatesKnown !== undefined &&
          (formData.visaType === 'student' || formData.travel?.durationCategory !== undefined)
        );
      case 4: // Financial
        return !!(
          formData.finance?.payer &&
          formData.finance?.approxMonthlyIncomeRange !== undefined &&
          formData.finance?.hasBankStatement !== undefined &&
          formData.finance?.hasStableIncome !== undefined
        );
      case 5: // Invitation
        if (!formData.invitation?.hasInvitation) {
          return formData.invitation?.hasInvitation === false;
        }
        if (formData.visaType === 'student') {
          return !!formData.invitation?.studentInvitationType;
        }
        return !!formData.invitation?.touristInvitationType;
      case 6: // Stay & Tickets
        return !!(
          formData.stay?.accommodationType && formData.stay?.hasRoundTripTicket !== undefined
        );
      case 7: // Travel History
        if (!formData.history?.hasTraveledBefore) {
          return formData.history?.hasTraveledBefore === false;
        }
        return (
          formData.history?.hasTraveledBefore === true &&
          formData.history?.hasVisaRefusals !== undefined
        );
      case 8: // Ties & Documents
        return !!(
          formData.ties?.hasProperty !== undefined &&
          formData.ties?.hasCloseFamilyInUzbekistan !== undefined &&
          formData.documents?.hasEmploymentOrStudyProof !== undefined &&
          formData.documents?.hasInsurance !== undefined &&
          formData.documents?.hasPassport !== undefined &&
          formData.documents?.hasBirthCertificate !== undefined &&
          formData.documents?.hasPropertyDocs !== undefined
        );
      case 9: // Special Conditions
        return !!(
          formData.special?.travelingWithChildren !== undefined &&
          formData.special?.hasMedicalReasonForTrip !== undefined &&
          formData.special?.hasCriminalRecord !== undefined
        );
      case 10: // Visa specific modules (all optional)
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) {
      setError(t('questionnaire.pleaseAnswerAll', 'Please answer all required questions'));
      return;
    }
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
      setError('');
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.visaType || !formData.targetCountry) {
        throw new Error(
          t('questionnaire.selectRequiredFields') || 'Please fill in all required fields'
        );
      }

      // Build complete QuestionnaireV2 object
      const questionnaireV2: QuestionnaireV2 = {
        version: '2.0',
        visaType: formData.visaType!,
        targetCountry: formData.targetCountry!,
        personal: formData.personal!,
        travel: formData.travel!,
        status: formData.status!,
        finance: formData.finance!,
        invitation: formData.invitation!,
        stay: formData.stay!,
        history: formData.history!,
        ties: formData.ties!,
        documents: formData.documents!,
        special: formData.special!,
      };

      // Map to legacy format for backend compatibility
      const legacyData = mapQuestionnaireV2ToLegacy(questionnaireV2);

      // Send both formats to backend (like mobile app)
      const questionnaireDataForBackend = {
        ...legacyData,
        ...questionnaireV2,
      };

      const response = await apiClient.generateApplicationWithAI(questionnaireDataForBackend);

      if (response.success && response.data?.id) {
        router.push(`/applications/${response.data.id}`);
      } else {
        const errorMsg = response.error?.message || t('errors.failedToCreateApplication');
        setError(errorMsg);
      }
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, t, i18n.language);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Country & Visa Type
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white">
                {t('questionnaire.step0Title', 'Travel Purpose & Destination')}
              </h3>
              <p className="mt-2 text-sm text-white/60">
                {t(
                  'questionnaire.step1Description',
                  'Choose your destination country and visa type'
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t('questionnaire.targetCountry')} *
              </label>
              <input
                type="text"
                value={formData.targetCountry || ''}
                onChange={(e) => updateField('targetCountry', e.target.value as TargetCountry)}
                placeholder={t('questionnaire.selectCountry', 'Enter country code or name')}
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary"
                list="country-suggestions"
              />
              <datalist id="country-suggestions">
                {(countries.length ? countries : COUNTRY_OPTIONS).map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </datalist>
              {countriesError && (
                <p className="mt-2 text-xs text-red-300">
                  {t('errors.generic', countriesError)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t('questionnaire.visaType')} *
              </label>
              <input
                type="text"
                value={formData.visaType || ''}
                onChange={(e) => updateField('visaType', e.target.value as any)}
                placeholder={t('questionnaire.selectVisaType', 'Enter visa type (e.g., Tourist, Student, Work)')}
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary"
                list="visa-type-suggestions"
              />
              <datalist id="visa-type-suggestions">
                <option value="Tourist" />
                <option value="Student" />
                <option value="Work" />
                <option value="Business" />
                <option value="Transit" />
                <option value="Family Reunion" />
              </datalist>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.contactEmail', 'Contact email (for checklist updates)')}
                </label>
                <input
                  type="email"
                value={formData.contact?.email || ''}
                onChange={(e) =>
                  updateField('contact.email', e.target.value ? e.target.value : undefined)
                }
                  placeholder={t('questionnaire.contactEmailPlaceholder', 'example@email.com')}
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.contactPhone', 'Contact phone (optional)')}
                </label>
                <input
                  type="tel"
                value={formData.contact?.phone || ''}
                onChange={(e) =>
                  updateField('contact.phone', e.target.value ? e.target.value : undefined)
                }
                  placeholder={t('questionnaire.contactPhonePlaceholder', '+998 90 123 45 67')}
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary"
                />
              </div>
            </div>
          </div>
        );

      case 1: // Personal info
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">{t('questionnaire.step2Title')}</h3>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t('questionnaire.ageRange')} *
              </label>
              <select
                value={formData.personal?.ageRange || ''}
                onChange={(e) => updateField('personal.ageRange', e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
              >
                <option value="">{t('questionnaire.selectAgeRange')}</option>
                <option value="under_18">{t('questionnaire.ageRangeUnder18')}</option>
                <option value="18_25">{t('questionnaire.ageRange18_25')}</option>
                <option value="26_35">{t('questionnaire.ageRange26_35')}</option>
                <option value="36_50">{t('questionnaire.ageRange36_50')}</option>
                <option value="51_plus">{t('questionnaire.ageRange51Plus')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t('questionnaire.maritalStatus')} *
              </label>
              <select
                value={formData.personal?.maritalStatus || ''}
                onChange={(e) => updateField('personal.maritalStatus', e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
              >
                <option value="">{t('questionnaire.selectMaritalStatus')}</option>
                <option value="single">{t('questionnaire.maritalStatusSingle')}</option>
                <option value="married">{t('questionnaire.maritalStatusMarried')}</option>
                <option value="divorced">{t('questionnaire.maritalStatusDivorced')}</option>
                <option value="widowed">{t('questionnaire.maritalStatusWidowed')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t('questionnaire.passportStatus')} *
              </label>
              <select
                value={formData.personal?.passportStatus || ''}
                onChange={(e) => updateField('personal.passportStatus', e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
              >
                <option value="">{t('questionnaire.selectOption')}</option>
                <option value="valid_6plus_months">
                  {t('questionnaire.passportStatusValid6Plus')}
                </option>
                <option value="valid_less_6_months">
                  {t('questionnaire.passportStatusValidLess6')}
                </option>
                <option value="no_passport">{t('questionnaire.passportStatusNoPassport')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t('questionnaire.nationality')}
              </label>
              <select
                value={formData.personal?.nationality || 'UZ'}
                onChange={(e) => updateField('personal.nationality', e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
              >
                <option value="UZ">{t('questionnaire.nationalityUZ')}</option>
                <option value="other">{t('questionnaire.nationalityOther')}</option>
              </select>
            </div>
          </div>
        );

      case 2: // Status & education
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">{t('questionnaire.step3Title')}</h3>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t('questionnaire.currentStatus')} *
              </label>
              <select
                value={formData.status?.currentStatus || ''}
                onChange={(e) => updateField('status.currentStatus', e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
              >
                <option value="">{t('questionnaire.selectCurrentStatus')}</option>
                <option value="student">{t('questionnaire.currentStatusStudent')}</option>
                <option value="employed">{t('questionnaire.currentStatusEmployed')}</option>
                <option value="self_employed">
                  {t('questionnaire.currentStatusSelfEmployed')}
                </option>
                <option value="unemployed">{t('questionnaire.currentStatusUnemployed')}</option>
                <option value="business_owner">
                  {t('questionnaire.currentStatusBusinessOwner')}
                </option>
                <option value="school_child">{t('questionnaire.currentStatusSchoolChild')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t('questionnaire.highestEducation')} *
              </label>
              <select
                value={formData.status?.highestEducation || ''}
                onChange={(e) => updateField('status.highestEducation', e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
              >
                <option value="">{t('questionnaire.selectEducation')}</option>
                <option value="school">{t('questionnaire.educationSchool')}</option>
                <option value="college">{t('questionnaire.educationCollege')}</option>
                <option value="bachelor">{t('questionnaire.educationBachelor')}</option>
                <option value="master">{t('questionnaire.educationMaster')}</option>
                <option value="phd">{t('questionnaire.educationPhd')}</option>
                <option value="other">{t('questionnaire.educationOther')}</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isMinor"
                checked={formData.status?.isMinor || false}
                onChange={(e) => updateField('status.isMinor', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
              <label htmlFor="isMinor" className="ml-2 block text-sm text-white/90">
                {t('questionnaire.isMinor')}
              </label>
            </div>
          </div>
        );

      case 3: // Travel Profile
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">{t('questionnaire.step3Title')}</h3>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t('questionnaire.plannedWhen')} *
              </label>
              <select
                value={formData.travel?.plannedWhen || ''}
                onChange={(e) => updateField('travel.plannedWhen', e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
              >
                <option value="">{t('questionnaire.selectOption')}</option>
                <option value="within_3_months">
                  {t('questionnaire.plannedWhenWithin3Months')}
                </option>
                <option value="3_to_12_months">{t('questionnaire.plannedWhen3To12Months')}</option>
                <option value="not_sure">{t('questionnaire.plannedWhenNotSure')}</option>
              </select>
            </div>

            {formData.visaType !== 'student' && (
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.duration')} *
                </label>
                <select
                  value={formData.travel?.durationCategory || ''}
                  onChange={(e) => updateField('travel.durationCategory', e.target.value)}
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
                >
                  <option value="">{t('questionnaire.selectDuration')}</option>
                  <option value="up_to_30_days">{t('questionnaire.durationUpTo30Days')}</option>
                  <option value="31_90_days">{t('questionnaire.duration31_90Days')}</option>
                  <option value="more_than_90_days">
                    {t('questionnaire.durationMoreThan90Days')}
                  </option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t('questionnaire.tripDurationDays', 'Planned trip length (days)')}
              </label>
              <input
                type="number"
                min={1}
                max={1095}
                value={formData.travel?.tripDurationDays || ''}
                onChange={(e) =>
                  updateField(
                    'travel.tripDurationDays',
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                placeholder={t('questionnaire.tripDurationPlaceholder', 'e.g., 14')}
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isExactDatesKnown"
                checked={formData.travel?.isExactDatesKnown || false}
                onChange={(e) => updateField('travel.isExactDatesKnown', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
              <label htmlFor="isExactDatesKnown" className="ml-2 block text-sm text-white/90">
                {t('questionnaire.isExactDatesKnown')}
              </label>
            </div>
          </div>
        );

      case 4: // Finance
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">{t('questionnaire.step4Title')}</h3>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t('questionnaire.payer')} *
              </label>
              <select
                value={formData.finance?.payer || ''}
                onChange={(e) => updateField('finance.payer', e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
              >
                <option value="">{t('questionnaire.selectPayer')}</option>
                <option value="self">{t('questionnaire.payerSelf')}</option>
                <option value="parents">{t('questionnaire.payerParents')}</option>
                <option value="other_family">{t('questionnaire.payerOtherFamily')}</option>
                <option value="employer">{t('questionnaire.payerEmployer')}</option>
                <option value="scholarship">{t('questionnaire.payerScholarship')}</option>
                <option value="other_sponsor">{t('questionnaire.payerOtherSponsor')}</option>
              </select>
            </div>

            {formData.finance?.payer && formData.finance.payer !== 'self' && (
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.sponsorRelationship', 'Sponsor relationship')}
                </label>
                <select
                  value={formData.finance?.sponsorRelationship || ''}
                  onChange={(e) =>
                    updateField(
                      'finance.sponsorRelationship',
                      e.target.value ? e.target.value : undefined
                    )
                  }
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
                >
                  <option value="">{t('questionnaire.selectOption')}</option>
                  <option value="parent">{t('questionnaire.sponsorParent', 'Parent')}</option>
                  <option value="relative">{t('questionnaire.sponsorRelative', 'Relative')}</option>
                  <option value="company">{t('questionnaire.sponsorCompany', 'Company')}</option>
                  <option value="other">{t('questionnaire.sponsorOther', 'Other')}</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t('questionnaire.approxMonthlyIncomeRange')} *
              </label>
              <select
                value={formData.finance?.approxMonthlyIncomeRange || ''}
                onChange={(e) => updateField('finance.approxMonthlyIncomeRange', e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
              >
                <option value="">{t('questionnaire.selectIncomeRange')}</option>
                <option value="less_500">{t('questionnaire.incomeLess500')}</option>
                <option value="500_1000">{t('questionnaire.income500_1000')}</option>
                <option value="1000_3000">{t('questionnaire.income1000_3000')}</option>
                <option value="3000_plus">{t('questionnaire.income3000Plus')}</option>
                <option value="not_applicable">{t('questionnaire.incomeNotApplicable')}</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="hasBankStatement"
                checked={formData.finance?.hasBankStatement || false}
                onChange={(e) => updateField('finance.hasBankStatement', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
              <label htmlFor="hasBankStatement" className="ml-2 block text-sm text-white/90">
                {t('questionnaire.hasBankStatement')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="hasStableIncome"
                checked={formData.finance?.hasStableIncome || false}
                onChange={(e) => updateField('finance.hasStableIncome', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
              <label htmlFor="hasStableIncome" className="ml-2 block text-sm text-white/90">
                {t('questionnaire.hasStableIncome')}
              </label>
            </div>
          </div>
        );

      case 5: // Invitation & accommodation
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">{t('questionnaire.step5Title')}</h3>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="hasInvitation"
                checked={formData.invitation?.hasInvitation || false}
                onChange={(e) => updateField('invitation.hasInvitation', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
              <label htmlFor="hasInvitation" className="ml-2 block text-sm text-white/90">
                {t('questionnaire.hasInvitation')}
              </label>
            </div>

            {formData.invitation?.hasInvitation && formData.visaType === 'student' && (
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.studentInvitationType')}
                </label>
                <select
                  value={formData.invitation?.studentInvitationType || ''}
                  onChange={(e) => updateField('invitation.studentInvitationType', e.target.value)}
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
                >
                  <option value="">{t('questionnaire.selectInvitationType')}</option>
                  <option value="university_acceptance">
                    {t('questionnaire.studentInvitationUniversity')}
                  </option>
                  <option value="language_course">
                    {t('questionnaire.studentInvitationLanguage')}
                  </option>
                  <option value="exchange_program">
                    {t('questionnaire.studentInvitationExchange')}
                  </option>
                </select>
              </div>
            )}

            {formData.invitation?.hasInvitation && formData.visaType === 'tourist' && (
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.touristInvitationType')}
                </label>
                <select
                  value={formData.invitation?.touristInvitationType || ''}
                  onChange={(e) => updateField('invitation.touristInvitationType', e.target.value)}
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
                >
                  <option value="">{t('questionnaire.selectInvitationType')}</option>
                  <option value="no_invitation">
                    {t('questionnaire.touristInvitationNoInvitation')}
                  </option>
                  <option value="hotel_booking">{t('questionnaire.touristInvitationHotel')}</option>
                  <option value="family_or_friends">
                    {t('questionnaire.touristInvitationFamily')}
                  </option>
                  <option value="tour_agency">
                    {t('questionnaire.touristInvitationTourAgency')}
                  </option>
                </select>
              </div>
            )}
          </div>
        );

      case 6: // Stay & Tickets
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">{t('questionnaire.step6Title')}</h3>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t('questionnaire.accommodationType')} *
              </label>
              <select
                value={formData.stay?.accommodationType || ''}
                onChange={(e) => updateField('stay.accommodationType', e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
              >
                <option value="">{t('questionnaire.selectAccommodation')}</option>
                <option value="hotel">{t('questionnaire.accommodationHotel')}</option>
                <option value="host_family">{t('questionnaire.accommodationHostFamily')}</option>
                <option value="relative">{t('questionnaire.accommodationRelative')}</option>
                <option value="rented_apartment">{t('questionnaire.accommodationRented')}</option>
                <option value="dormitory">{t('questionnaire.accommodationDormitory')}</option>
                <option value="not_decided">{t('questionnaire.accommodationNotDecided')}</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="hasRoundTripTicket"
                checked={formData.stay?.hasRoundTripTicket || false}
                onChange={(e) => updateField('stay.hasRoundTripTicket', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
              <label htmlFor="hasRoundTripTicket" className="ml-2 block text-sm text-white/90">
                {t('questionnaire.hasRoundTripTicket')}
              </label>
            </div>
          </div>
        );

      case 7: // Travel History
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">{t('questionnaire.step7Title')}</h3>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="hasTraveledBefore"
                checked={formData.history?.hasTraveledBefore || false}
                onChange={(e) => updateField('history.hasTraveledBefore', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
              <label htmlFor="hasTraveledBefore" className="ml-2 block text-sm text-white/90">
                {t('questionnaire.hasTraveledBefore')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="hasVisaRefusals"
                checked={formData.history?.hasVisaRefusals || false}
                onChange={(e) => updateField('history.hasVisaRefusals', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
              <label htmlFor="hasVisaRefusals" className="ml-2 block text-sm text-white/90">
                {t('questionnaire.hasVisaRefusals')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="hasOverstay"
                checked={formData.history?.hasOverstay || false}
                onChange={(e) => updateField('history.hasOverstay', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
              <label htmlFor="hasOverstay" className="ml-2 block text-sm text-white/90">
                {t('questionnaire.hasOverstay', 'Any overstay in past visas')}
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t('questionnaire.travelHistoryLevel', 'Travel history strength')}
              </label>
              <select
                value={formData.history?.travelHistoryLevel || ''}
                onChange={(e) =>
                  updateField(
                    'history.travelHistoryLevel',
                    e.target.value ? e.target.value : undefined
                  )
                }
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
              >
                <option value="">{t('questionnaire.selectOption')}</option>
                <option value="none">{t('questionnaire.travelHistoryNone', 'No travel')}</option>
                <option value="limited">{t('questionnaire.travelHistoryLimited', 'Limited')}</option>
                <option value="moderate">{t('questionnaire.travelHistoryModerate', 'Moderate')}</option>
                <option value="strong">{t('questionnaire.travelHistoryStrong', 'Strong')}</option>
              </select>
            </div>
          </div>
        );

      case 8: // Ties & Documents
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">{t('questionnaire.step8Title')}</h3>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="hasProperty"
                checked={formData.ties?.hasProperty || false}
                onChange={(e) => updateField('ties.hasProperty', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
              <label htmlFor="hasProperty" className="ml-2 block text-sm text-white/90">
                {t('questionnaire.hasProperty')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="hasCloseFamilyInUzbekistan"
                checked={formData.ties?.hasCloseFamilyInUzbekistan || false}
                onChange={(e) => updateField('ties.hasCloseFamilyInUzbekistan', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
              <label
                htmlFor="hasCloseFamilyInUzbekistan"
                className="ml-2 block text-sm text-white/90"
              >
                {t('questionnaire.hasCloseFamilyInUzbekistan')}
              </label>
            </div>

            <div className="space-y-2 mt-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasEmploymentOrStudyProof"
                  checked={formData.documents?.hasEmploymentOrStudyProof || false}
                  onChange={(e) =>
                    updateField('documents.hasEmploymentOrStudyProof', e.target.checked)
                  }
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <label
                  htmlFor="hasEmploymentOrStudyProof"
                  className="ml-2 block text-sm text-white/90"
                >
                  {t('questionnaire.hasEmploymentOrStudyProof')}
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasInsurance"
                  checked={formData.documents?.hasInsurance || false}
                  onChange={(e) => updateField('documents.hasInsurance', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <label htmlFor="hasInsurance" className="ml-2 block text-sm text-white/90">
                  {t('questionnaire.hasInsurance')}
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasPassport"
                  checked={formData.documents?.hasPassport || false}
                  onChange={(e) => updateField('documents.hasPassport', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <label htmlFor="hasPassport" className="ml-2 block text-sm text-white/90">
                  {t('questionnaire.hasPassport')}
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasBirthCertificate"
                  checked={formData.documents?.hasBirthCertificate || false}
                  onChange={(e) => updateField('documents.hasBirthCertificate', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <label htmlFor="hasBirthCertificate" className="ml-2 block text-sm text-white/90">
                  {t('questionnaire.hasBirthCertificate')}
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasPropertyDocs"
                  checked={formData.documents?.hasPropertyDocs || false}
                  onChange={(e) => updateField('documents.hasPropertyDocs', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <label htmlFor="hasPropertyDocs" className="ml-2 block text-sm text-white/90">
                  {t('questionnaire.hasPropertyDocs')}
                </label>
              </div>
            </div>
          </div>
        );

      case 9: // Special Conditions
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">{t('questionnaire.step9Title')}</h3>

            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="travelingWithChildren"
                  checked={formData.special?.travelingWithChildren || false}
                  onChange={(e) => updateField('special.travelingWithChildren', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <label htmlFor="travelingWithChildren" className="ml-2 block text-sm text-white/90">
                  {t('questionnaire.travelingWithChildren')}
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasMedicalReasonForTrip"
                  checked={formData.special?.hasMedicalReasonForTrip || false}
                  onChange={(e) => updateField('special.hasMedicalReasonForTrip', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <label
                  htmlFor="hasMedicalReasonForTrip"
                  className="ml-2 block text-sm text-white/90"
                >
                  {t('questionnaire.hasMedicalReasonForTrip')}
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasCriminalRecord"
                  checked={formData.special?.hasCriminalRecord || false}
                  onChange={(e) => updateField('special.hasCriminalRecord', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <label htmlFor="hasCriminalRecord" className="ml-2 block text-sm text-white/90">
                  {t('questionnaire.hasCriminalRecord')}
                </label>
              </div>
            </div>
          </div>
        );

      case 10: // Visa-specific details (modules)
        return renderVisaSpecifics();

      default:
        return null;
    }
  };

  function renderVisaSpecifics() {
    const visaTypeLower = (formData.visaType || '').toLowerCase();
    const isStudent = visaTypeLower.includes('student');
    const isWork = visaTypeLower.includes('work');
    const isBusiness =
      visaTypeLower.includes('business') || visaTypeLower.includes('conference');
    const isFamily =
      visaTypeLower.includes('family') ||
      visaTypeLower.includes('visit') ||
      visaTypeLower.includes('visitor');
    const isTransit = visaTypeLower.includes('transit');

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-white">
          {t('questionnaire.stepVisaSpecific', 'Visa-specific details')}
        </h3>
        <p className="text-sm text-white/60">
          {t(
            'questionnaire.stepVisaSpecificDescription',
            'Answer the questions relevant to your visa type. Skip anything that does not apply.'
          )}
        </p>

        {isStudent && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.schoolName', 'School / university name')}
                </label>
                <input
                  type="text"
                  value={formData.studentModule?.schoolName || ''}
                  onChange={(e) => updateField('studentModule.schoolName', e.target.value)}
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.acceptanceStatus', 'Acceptance status')}
                </label>
                <select
                  value={formData.studentModule?.acceptanceStatus || ''}
                onChange={(e) =>
                  updateField(
                    'studentModule.acceptanceStatus',
                    e.target.value ? e.target.value : undefined
                  )
                }
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
                >
                  <option value="">{t('questionnaire.selectOption')}</option>
                  <option value="accepted">{t('questionnaire.accepted', 'Accepted')}</option>
                  <option value="applied">{t('questionnaire.applied', 'Applied')}</option>
                  <option value="not_applied">{t('questionnaire.notApplied', 'Not applied')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.programStartDate', 'Program start date')}
                </label>
                <input
                  type="date"
                  value={formData.studentModule?.programStartDate || ''}
                  onChange={(e) => updateField('studentModule.programStartDate', e.target.value)}
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.tuitionAmount', 'Tuition amount (USD)')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.studentModule?.tuitionAmountUSD || ''}
                  onChange={(e) =>
                    updateField(
                      'studentModule.tuitionAmountUSD',
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.tuitionPaidStatus', 'Tuition payment status')}
                </label>
                <select
                  value={formData.studentModule?.tuitionPaidStatus || ''}
                  onChange={(e) =>
                    updateField(
                      'studentModule.tuitionPaidStatus',
                      e.target.value ? e.target.value : undefined
                    )
                  }
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
                >
                  <option value="">{t('questionnaire.selectOption')}</option>
                  <option value="paid">{t('questionnaire.paid', 'Paid')}</option>
                  <option value="partial">{t('questionnaire.partial', 'Partial')}</option>
                  <option value="unpaid">{t('questionnaire.unpaid', 'Unpaid')}</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="scholarship"
                  checked={formData.studentModule?.scholarship || false}
                  onChange={(e) => updateField('studentModule.scholarship', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <label htmlFor="scholarship" className="ml-2 block text-sm text-white/90">
                  {t('questionnaire.scholarship', 'Scholarship')}
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.studentAccommodation', 'Accommodation')}
                </label>
                <select
                  value={formData.studentModule?.accommodationType || ''}
                  onChange={(e) =>
                    updateField(
                      'studentModule.accommodationType',
                      e.target.value ? e.target.value : undefined
                    )
                  }
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
                >
                  <option value="">{t('questionnaire.selectOption')}</option>
                  <option value="dorm">{t('questionnaire.dormitory', 'Dormitory')}</option>
                  <option value="private">{t('questionnaire.privateHousing', 'Private housing')}</option>
                  <option value="host">{t('questionnaire.hostFamily', 'Host family')}</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasAdmissionLetter"
                  checked={formData.studentModule?.hasAdmissionLetter || false}
                  onChange={(e) => updateField('studentModule.hasAdmissionLetter', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <label htmlFor="hasAdmissionLetter" className="ml-2 block text-sm text-white/90">
                  {t('questionnaire.hasAdmissionLetter', 'Admission/acceptance letter available')}
                </label>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="previousEducationDocs"
                checked={formData.studentModule?.previousEducationDocs || false}
                onChange={(e) => updateField('studentModule.previousEducationDocs', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
              <label htmlFor="previousEducationDocs" className="ml-2 block text-sm text-white/90">
                {t('questionnaire.previousEducationDocs', 'Diploma/transcript ready')}
              </label>
            </div>
          </div>
        )}

        {isWork && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.employerName', 'Employer name')}
                </label>
                <input
                  type="text"
                  value={formData.workModule?.employerName || ''}
                  onChange={(e) => updateField('workModule.employerName', e.target.value)}
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.position', 'Position / role')}
                </label>
                <input
                  type="text"
                  value={formData.workModule?.position || ''}
                  onChange={(e) => updateField('workModule.position', e.target.value)}
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.contractType', 'Contract type')}
                </label>
                <select
                  value={formData.workModule?.contractType || ''}
                onChange={(e) =>
                  updateField('workModule.contractType', e.target.value ? e.target.value : undefined)
                }
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
                >
                  <option value="">{t('questionnaire.selectOption')}</option>
                  <option value="permanent">{t('questionnaire.permanent', 'Permanent')}</option>
                  <option value="contract">{t('questionnaire.contract', 'Contract')}</option>
                  <option value="probation">{t('questionnaire.probation', 'Probation')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.salaryMonthly', 'Monthly salary (USD)')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.workModule?.salaryMonthlyUSD || ''}
                  onChange={(e) =>
                    updateField(
                      'workModule.salaryMonthlyUSD',
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.sponsorshipStatus', 'Work sponsorship status')}
                </label>
                <select
                  value={formData.workModule?.sponsorshipStatus || ''}
                  onChange={(e) =>
                    updateField(
                      'workModule.sponsorshipStatus',
                      e.target.value ? e.target.value : undefined
                    )
                  }
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
                >
                  <option value="">{t('questionnaire.selectOption')}</option>
                  <option value="employer_sponsored">
                    {t('questionnaire.employerSponsored', 'Employer-sponsored')}
                  </option>
                  <option value="not_sponsored">
                    {t('questionnaire.notSponsored', 'Not sponsored')}
                  </option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasWorkPermit"
                  checked={formData.workModule?.hasWorkPermit || false}
                  onChange={(e) => updateField('workModule.hasWorkPermit', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <label htmlFor="hasWorkPermit" className="ml-2 block text-sm text-white/90">
                  {t('questionnaire.hasWorkPermit', 'Work permit already issued')}
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.yearsOfExperience', 'Years of experience')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.workModule?.yearsOfExperience || ''}
                  onChange={(e) =>
                    updateField(
                      'workModule.yearsOfExperience',
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="professionalLicenses"
                  checked={formData.workModule?.professionalLicenses || false}
                  onChange={(e) => updateField('workModule.professionalLicenses', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <label htmlFor="professionalLicenses" className="ml-2 block text-sm text-white/90">
                  {t('questionnaire.professionalLicenses', 'Professional licenses required')}
                </label>
              </div>
            </div>
          </div>
        )}

        {isFamily && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.inviterRelationship', 'Inviter relationship')}
                </label>
                <select
                  value={formData.familyModule?.inviterRelationship || ''}
                  onChange={(e) =>
                    updateField(
                      'familyModule.inviterRelationship',
                      e.target.value ? e.target.value : undefined
                    )
                  }
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
                >
                  <option value="">{t('questionnaire.selectOption')}</option>
                  <option value="spouse">{t('questionnaire.spouse', 'Spouse')}</option>
                  <option value="parent">{t('questionnaire.parent', 'Parent')}</option>
                  <option value="sibling">{t('questionnaire.sibling', 'Sibling')}</option>
                  <option value="relative">{t('questionnaire.relative', 'Relative')}</option>
                  <option value="friend">{t('questionnaire.friend', 'Friend')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.inviterResidencyStatus', 'Inviter residency status')}
                </label>
                <select
                  value={formData.familyModule?.inviterResidencyStatus || ''}
                  onChange={(e) =>
                    updateField(
                      'familyModule.inviterResidencyStatus',
                      e.target.value ? e.target.value : undefined
                    )
                  }
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
                >
                  <option value="">{t('questionnaire.selectOption')}</option>
                  <option value="citizen">{t('questionnaire.citizen', 'Citizen')}</option>
                  <option value="pr">{t('questionnaire.permanentResident', 'Permanent resident')}</option>
                  <option value="work_permit">{t('questionnaire.workPermit', 'Work permit')}</option>
                  <option value="student">{t('questionnaire.student', 'Student')}</option>
                  <option value="other">{t('questionnaire.other', 'Other')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasInvitationLetter"
                  checked={formData.familyModule?.hasInvitationLetter || false}
                  onChange={(e) => updateField('familyModule.hasInvitationLetter', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <label htmlFor="hasInvitationLetter" className="ml-2 block text-sm text-white/90">
                  {t('questionnaire.hasInvitationLetter', 'Invitation letter available')}
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="willHost"
                  checked={formData.familyModule?.willHost || false}
                  onChange={(e) => updateField('familyModule.willHost', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <label htmlFor="willHost" className="ml-2 block text-sm text-white/90">
                  {t('questionnaire.willHost', 'Inviter will host')}
                </label>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="willSponsor"
                checked={formData.familyModule?.willSponsor || false}
                onChange={(e) => updateField('familyModule.willSponsor', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
              <label htmlFor="willSponsor" className="ml-2 block text-sm text-white/90">
                {t('questionnaire.willSponsor', 'Inviter will sponsor financially')}
              </label>
            </div>
          </div>
        )}

        {isBusiness && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.companyName', 'Company / organizer')}
                </label>
                <input
                  type="text"
                  value={formData.businessModule?.companyName || ''}
                  onChange={(e) => updateField('businessModule.companyName', e.target.value)}
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  {t('questionnaire.eventType', 'Event / conference')}
                </label>
                <input
                  type="text"
                  value={formData.businessModule?.eventType || ''}
                  onChange={(e) => updateField('businessModule.eventType', e.target.value)}
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="invitationFromCompany"
                  checked={formData.businessModule?.invitationFromCompany || false}
                  onChange={(e) =>
                    updateField('businessModule.invitationFromCompany', e.target.checked)
                  }
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <label htmlFor="invitationFromCompany" className="ml-2 block text-sm text-white/90">
                  {t('questionnaire.invitationFromCompany', 'Invitation from company available')}
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="eventDatesKnown"
                  checked={formData.businessModule?.eventDatesKnown || false}
                  onChange={(e) => updateField('businessModule.eventDatesKnown', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <label htmlFor="eventDatesKnown" className="ml-2 block text-sm text-white/90">
                  {t('questionnaire.eventDatesKnown', 'Event dates confirmed')}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t('questionnaire.businessFunding', 'Trip funded by')}
              </label>
              <select
                value={formData.businessModule?.funding || ''}
                onChange={(e) =>
                  updateField('businessModule.funding', e.target.value ? e.target.value : undefined)
                }
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
              >
                <option value="">{t('questionnaire.selectOption')}</option>
                <option value="company">{t('questionnaire.company', 'Company')}</option>
                <option value="self">{t('questionnaire.self', 'Self')}</option>
              </select>
            </div>
          </div>
        )}

        {isTransit && (
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="onwardTicket"
                checked={formData.transitModule?.onwardTicket || false}
                onChange={(e) => updateField('transitModule.onwardTicket', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
              <label htmlFor="onwardTicket" className="ml-2 block text-sm text-white/90">
                {t('questionnaire.onwardTicket', 'Onward/return ticket booked')}
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t('questionnaire.layoverHours', 'Layover duration (hours)')}
              </label>
              <input
                type="number"
                min={0}
                value={formData.transitModule?.layoverHours || ''}
                onChange={(e) =>
                  updateField(
                    'transitModule.layoverHours',
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t(
                  'questionnaire.finalDestinationVisa',
                  'Visa for final destination (if required)'
                )}
              </label>
              <select
                value={formData.transitModule?.finalDestinationVisa || ''}
                onChange={(e) =>
                  updateField(
                    'transitModule.finalDestinationVisa',
                    e.target.value ? e.target.value : undefined
                  )
                }
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-[#0E1A2C] [&>option]:text-white"
              >
                <option value="">{t('questionnaire.selectOption')}</option>
                <option value="yes">{t('questionnaire.yes', 'Yes')}</option>
                <option value="no">{t('questionnaire.no', 'No')}</option>
                <option value="not_required">{t('questionnaire.notRequired', 'Not required')}</option>
              </select>
            </div>
          </div>
        )}

        {!isStudent && !isWork && !isBusiness && !isFamily && !isTransit && (
          <p className="text-sm text-white/60">
            {t(
              'questionnaire.noExtraQuestions',
              'No additional questions for this visa type. You can continue.'
            )}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          {t('questionnaire.title', 'Tell us about your trip')}
        </h1>
        <p className="mt-2 text-sm text-white/60">
          {t('questionnaire.subtitle', 'Your answers help us create a personalized checklist based on official embassy requirements. Takes about 3–5 minutes.')}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
          <p className="text-sm text-rose-100">{error}</p>
        </div>
      )}

      <div className="mb-6">
        <div className="mb-2 flex justify-between text-sm text-white/70">
          <span>
            {t('questionnaire.step', 'Step')} {currentStep + 1} {t('questionnaire.of', 'of')}{' '}
            {TOTAL_STEPS}
          </span>
          <span>{Math.round(((currentStep + 1) / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/10">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark transition-all"
            style={{ width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <div className="glass-panel rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-card">
        {renderStep()}
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/70 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('common.back')}
        </button>
        {currentStep < TOTAL_STEPS - 1 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-medium text-white shadow-card hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.next')}
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || !canProceed()}
            className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-medium text-white shadow-card hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('questionnaire.generating', 'Generating your checklist...') : t('common.submit', 'Create My Checklist')}
          </button>
        )}
      </div>

      {/* Confidence signal */}
      <div className="mt-6 text-center">
        <p className="text-xs text-white/40">
          {t('questionnaire.confidence', 'Your information is encrypted and secure. Used by travelers to 50+ countries.')}
        </p>
      </div>
    </div>
  );
}
