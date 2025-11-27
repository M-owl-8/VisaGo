'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/lib/stores/auth';
import { apiClient } from '@/lib/api/client';
import { QuestionnaireV2, TargetCountry, COUNTRY_OPTIONS } from '@/lib/types/questionnaire';
import { mapQuestionnaireV2ToLegacy } from '@/lib/utils/questionnaireMapper';
import { getErrorMessage } from '@/lib/utils/errorMessages';
import ErrorBanner from '@/components/ErrorBanner';

const TOTAL_STEPS = 10;

export default function QuestionnairePage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isSignedIn } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Initialize v2 structure with proper types
  const [formData, setFormData] = useState<Partial<QuestionnaireV2>>({
    version: '2.0',
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
        return !!(
          formData.status?.currentStatus && formData.status?.highestEducation
        );
      case 3: // Travel Profile
        return !!(
          formData.travel?.plannedWhen !== undefined &&
          formData.travel?.isExactDatesKnown !== undefined &&
          (formData.visaType === 'student' ||
            formData.travel?.durationCategory !== undefined)
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
          formData.stay?.accommodationType &&
          formData.stay?.hasRoundTripTicket !== undefined
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
        throw new Error(t('questionnaire.selectRequiredFields') || 'Please fill in all required fields');
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
              <h3 className="text-xl font-semibold text-white">{t('questionnaire.step0Title', 'Travel Purpose & Destination')}</h3>
              <p className="mt-2 text-sm text-white/60">{t('questionnaire.step1Description', 'Choose your destination country and visa type')}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t('questionnaire.targetCountry')} *
              </label>
              <select
                value={formData.targetCountry || ''}
                onChange={(e) => updateField('targetCountry', e.target.value as TargetCountry)}
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-midnight [&>option]:text-white"
              >
                <option value="">{t('questionnaire.selectCountry', 'Select country')}</option>
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {t('questionnaire.visaType')} *
              </label>
              <select
                value={formData.visaType || ''}
                onChange={(e) => updateField('visaType', e.target.value as 'tourist' | 'student')}
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-card-soft focus:border-primary focus:ring-primary [&>option]:bg-midnight [&>option]:text-white"
              >
                <option value="">{t('questionnaire.selectOption', 'Select option')}</option>
                <option value="tourist">{t('questionnaire.visaTypeTourist', 'Tourist')}</option>
                <option value="student">{t('questionnaire.visaTypeStudent', 'Student')}</option>
              </select>
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
                <option value="valid_6plus_months">{t('questionnaire.passportStatusValid6Plus')}</option>
                <option value="valid_less_6_months">{t('questionnaire.passportStatusValidLess6')}</option>
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
                <option value="self_employed">{t('questionnaire.currentStatusSelfEmployed')}</option>
                <option value="unemployed">{t('questionnaire.currentStatusUnemployed')}</option>
                <option value="business_owner">{t('questionnaire.currentStatusBusinessOwner')}</option>
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
                <option value="within_3_months">{t('questionnaire.plannedWhenWithin3Months')}</option>
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
                  <option value="more_than_90_days">{t('questionnaire.durationMoreThan90Days')}</option>
                </select>
              </div>
            )}

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
                  <option value="university_acceptance">{t('questionnaire.studentInvitationUniversity')}</option>
                  <option value="language_course">{t('questionnaire.studentInvitationLanguage')}</option>
                  <option value="exchange_program">{t('questionnaire.studentInvitationExchange')}</option>
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
                  <option value="no_invitation">{t('questionnaire.touristInvitationNoInvitation')}</option>
                  <option value="hotel_booking">{t('questionnaire.touristInvitationHotel')}</option>
                  <option value="family_or_friends">{t('questionnaire.touristInvitationFamily')}</option>
                  <option value="tour_agency">{t('questionnaire.touristInvitationTourAgency')}</option>
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
              <label htmlFor="hasCloseFamilyInUzbekistan" className="ml-2 block text-sm text-white/90">
                {t('questionnaire.hasCloseFamilyInUzbekistan')}
              </label>
            </div>

            <div className="space-y-2 mt-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasEmploymentOrStudyProof"
                  checked={formData.documents?.hasEmploymentOrStudyProof || false}
                  onChange={(e) => updateField('documents.hasEmploymentOrStudyProof', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <label htmlFor="hasEmploymentOrStudyProof" className="ml-2 block text-sm text-white/90">
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
                <label htmlFor="hasMedicalReasonForTrip" className="ml-2 block text-sm text-white/90">
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

      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 text-white">
      <h1 className="mb-6 text-2xl font-bold text-white">{t('questionnaire.title', 'Questionnaire')}</h1>

      {error && <ErrorBanner message={error} onClose={() => setError('')} />}

      <div className="mb-6">
        <div className="mb-2 flex justify-between text-sm text-white/70">
          <span>
            {t('questionnaire.step', 'Step')} {currentStep + 1} {t('questionnaire.of', 'of')} {TOTAL_STEPS}
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

      <div className="glass-panel rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-card">{renderStep()}</div>

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
            {loading ? t('common.loading') : t('common.submit')}
          </button>
        )}
      </div>
    </div>
  );
}
