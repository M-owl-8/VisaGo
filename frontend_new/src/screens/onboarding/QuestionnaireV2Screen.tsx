/**
 * Questionnaire V2 Screen - 11-Step Multiple Choice Questionnaire
 * Implements QuestionnaireV2 structure with branching logic
 * Replaces the old 32-question questionnaire system
 * Matches web app: 11 steps including visa-specific modules (Step 10)
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTranslation} from 'react-i18next';
import {useAuthStore} from '../../store/auth';
import {useVisaStore} from '../../store/visa';
import {apiClient} from '../../services/api';
import {
  QuestionnaireV2,
  TargetCountry,
  VisaType,
} from '../../types/questionnaire-v2';
import {mapQuestionnaireV2ToLegacy} from '../../utils/questionnaireV2ToLegacyMapper';

const TOTAL_STEPS = 11;

// Fallback list shown only if backend country list is empty
const FALLBACK_COUNTRIES: Array<{
  code: TargetCountry;
  name: string;
  flag: string;
}> = [
  {code: 'US', name: 'United States', flag: '🇺🇸'},
  {code: 'GB', name: 'United Kingdom', flag: '🇬🇧'},
  {code: 'ES', name: 'Spain', flag: '🇪🇸'},
  {code: 'DE', name: 'Germany', flag: '🇩🇪'},
  {code: 'JP', name: 'Japan', flag: '🇯🇵'},
  {code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪'},
  {code: 'CA', name: 'Canada', flag: '🇨🇦'},
  {code: 'AU', name: 'Australia', flag: '🇦🇺'},
];

export default function QuestionnaireV2Screen({navigation}: any) {
  const {t, i18n} = useTranslation();
  const language = i18n.language || 'en';
  const {user, updateProfile} = useAuthStore();
  const {countries, filteredCountries, fetchCountries, isLoadingCountries} =
    useVisaStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<QuestionnaireV2>>({
    version: '2.0',
  });

  // Load countries on mount
  useEffect(() => {
    fetchCountries();
  }, []);

  // Auto-derive isMinor from ageRange
  useEffect(() => {
    if (formData.personal?.ageRange) {
      const isMinor = formData.personal.ageRange === 'under_18';
      setFormData(prev => ({
        ...prev,
        status: {
          ...prev.status,
          isMinor,
        } as QuestionnaireV2['status'],
      }));
    }
  }, [formData.personal?.ageRange]);

  // Auto-set duration for student visas
  useEffect(() => {
    const visaTypeLower = (formData.visaType || '').toLowerCase();
    if (visaTypeLower.includes('student')) {
      setFormData(prev => ({
        ...prev,
        travel: {
          ...prev.travel,
          durationCategory: 'more_than_90_days',
        } as QuestionnaireV2['travel'],
      }));
    }
  }, [formData.visaType]);

  // Update invitation defaults based on visaType
  useEffect(() => {
    const visaTypeLower = (formData.visaType || '').toLowerCase();
    if (
      visaTypeLower.includes('tourist') &&
      !formData.invitation?.hasInvitation
    ) {
      setFormData(prev => ({
        ...prev,
        invitation: {
          ...prev.invitation,
          touristInvitationType: 'no_invitation',
        } as QuestionnaireV2['invitation'],
      }));
    }
  }, [formData.visaType, formData.invitation?.hasInvitation]);

  const updateFormData = <K extends keyof QuestionnaireV2>(
    section: K,
    data: Partial<QuestionnaireV2[K]>,
  ) => {
    setFormData(prev => {
      const currentSection = prev[section];
      // Type guard to ensure we have an object to spread
      if (
        currentSection &&
        typeof currentSection === 'object' &&
        !Array.isArray(currentSection)
      ) {
        const merged = Object.assign({}, currentSection, data);
        return {
          ...prev,
          [section]: merged as QuestionnaireV2[K],
        };
      }
      // If section doesn't exist or isn't an object, create new with data
      return {
        ...prev,
        [section]: data as QuestionnaireV2[K],
      };
    });
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
        const visaTypeLower = (formData.visaType || '').toLowerCase();
        return !!(
          formData.travel?.plannedWhen !== undefined &&
          formData.travel?.isExactDatesKnown !== undefined &&
          (visaTypeLower.includes('student') ||
            formData.travel?.durationCategory !== undefined ||
            formData.travel?.tripDurationDays !== undefined)
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
        const visaTypeLowerInv = (formData.visaType || '').toLowerCase();
        if (visaTypeLowerInv.includes('student')) {
          return !!formData.invitation?.studentInvitationType;
        }
        if (visaTypeLowerInv.includes('tourist')) {
          return !!formData.invitation?.touristInvitationType;
        }
        // For other visa types, invitation is optional
        return true;
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
      case 10: // Visa-specific modules (all optional)
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) {
      Alert.alert(t('common.error'), t('questionnaireV2.pleaseAnswerAll'));
      return;
    }
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Build complete QuestionnaireV2 object
      const questionnaireV2: QuestionnaireV2 = {
        version: '2.0',
        targetCountry: formData.targetCountry!,
        visaType: formData.visaType!,
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

      // Send to backend - backend expects QuestionnaireV2 directly in bio field
      const bio = JSON.stringify(questionnaireV2);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      await updateProfile({
        bio,
        questionnaireCompleted: true,
      });

      // Generate AI application
      // Map V2 format to legacy format for backend route validation
      // Backend route requires 'purpose' and 'country' fields, but V2 has 'visaType' and 'targetCountry'
      try {
        // Convert V2 to legacy format that backend route expects
        const legacyQuestionnaireData =
          mapQuestionnaireV2ToLegacy(questionnaireV2);

        // Include the full V2 object so backend service can use it
        const questionnaireDataForBackend = {
          ...legacyQuestionnaireData,
          // Include full V2 structure for backend service processing
          ...questionnaireV2,
        };

        const response = await (apiClient as any).api.post(
          '/applications/ai-generate',
          {
            questionnaireData: questionnaireDataForBackend,
          },
        );

        const responseData = response.data;

        // DEBUG: Log full response to help diagnose issues
        console.log('[QuestionnaireV2] AI generation response:', {
          success: responseData?.success,
          hasData: !!responseData?.data,
          dataKeys: responseData?.data ? Object.keys(responseData.data) : [],
          applicationId: responseData?.data?.application?.id,
          fullResponse: JSON.stringify(responseData, null, 2),
        });

        // Check for success and valid application ID
        if (responseData?.success) {
          const applicationId = responseData?.data?.application?.id;

          if (applicationId) {
            // Success: Navigate to application detail
            navigation.navigate('ApplicationDetail', {
              applicationId: applicationId,
            });
          } else {
            // Success but missing application ID - show error
            console.error(
              '[QuestionnaireV2] Success response but missing application ID:',
              responseData,
            );
            Alert.alert(
              t('common.error') || 'Error',
              t('questionnaire.applicationCreatedButMissingId') ||
                "Application was created but we couldn't retrieve its ID. Please check your applications list.",
              [
                {
                  text: t('common.ok'),
                  onPress: () =>
                    navigation.navigate('MainTabs', {screen: 'Applications'}),
                },
              ],
            );
          }
        } else {
          // Not successful - show error message
          const errorMessage =
            responseData?.error?.message ||
            t('questionnaire.failedToCreateApplication') ||
            'Failed to create application';

          console.error('[QuestionnaireV2] Application creation failed:', {
            success: responseData?.success,
            error: responseData?.error,
          });

          Alert.alert(t('common.error') || 'Error', errorMessage, [
            {
              text: t('common.ok'),
              onPress: () =>
                navigation.navigate('MainTabs', {screen: 'Applications'}),
            },
          ]);
        }
      } catch (error: any) {
        console.error('AI generation failed:', error);

        // FIXED: Handle 409 Conflict as validation error with user-friendly message
        if (error.response?.status === 409) {
          const conflictMessage =
            error.response?.data?.error?.message ||
            'You already have an active application for this country. Please complete or delete it before creating a new one.';
          Alert.alert(
            t('common.error') || 'Application Conflict',
            conflictMessage,
            [
              {
                text: t('common.ok'),
                onPress: () =>
                  navigation.navigate('MainTabs', {screen: 'Applications'}),
              },
            ],
          );
          return;
        }

        // Other errors
        const errorMessage =
          error.response?.data?.error?.message ||
          error.message ||
          'Failed to generate application';
        Alert.alert(t('common.error'), errorMessage, [
          {
            text: t('common.ok'),
            onPress: () =>
              navigation.navigate('MainTabs', {screen: 'Applications'}),
          },
        ]);
      }
    } catch (error: any) {
      console.error('Questionnaire submission error:', error);
      Alert.alert(
        t('common.error'),
        error.message || 'Failed to submit questionnaire. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderStep0_CountryAndVisaType();
      case 1:
        return renderStep1_Personal();
      case 2:
        return renderStep2_StatusAndEducation();
      case 3:
        return renderStep3_TravelProfile();
      case 4:
        return renderStep4_Financial();
      case 5:
        return renderStep5_Invitation();
      case 6:
        return renderStep6_StayAndTickets();
      case 7:
        return renderStep7_TravelHistory();
      case 8:
        return renderStep8_TiesAndDocuments();
      case 9:
        return renderStep9_SpecialConditions();
      case 10:
        return renderStep10_VisaSpecifics();
      default:
        return null;
    }
  };

  // Step 0: Country & Visa Type
  const renderStep0_CountryAndVisaType = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('questionnaireV2.step0.title')}</Text>
      <Text style={styles.stepDescription}>
        {t('questionnaireV2.step0.description')}
      </Text>

      <Text style={styles.fieldLabel}>
        {t('questionnaireV2.step0.country')}
      </Text>
      <View style={styles.optionsGrid}>
        {(filteredCountries.length > 0 ? filteredCountries : countries).length >
        0
          ? (filteredCountries.length > 0 ? filteredCountries : countries).map(
              country => (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.optionCard,
                    formData.targetCountry === country.code &&
                      styles.optionCardSelected,
                  ]}
                  onPress={() => updateFormData('targetCountry', country.code)}>
                  <Text style={styles.optionEmoji}>
                    {country.flagEmoji || '🌍'}
                  </Text>
                  <Text style={styles.optionText}>{country.name}</Text>
                </TouchableOpacity>
              ),
            )
          : FALLBACK_COUNTRIES.map(country => (
              <TouchableOpacity
                key={country.code}
                style={[
                  styles.optionCard,
                  formData.targetCountry === country.code &&
                    styles.optionCardSelected,
                ]}
                onPress={() => updateFormData('targetCountry', country.code)}>
                <Text style={styles.optionEmoji}>{country.flag}</Text>
                <Text style={styles.optionText}>{country.name}</Text>
              </TouchableOpacity>
            ))}
      </View>

      <Text style={[styles.fieldLabel, {marginTop: 24}]}>
        {t('questionnaireV2.step0.visaType')}
      </Text>
      <View style={styles.optionsGrid}>
        <TouchableOpacity
          style={[
            styles.optionCard,
            (formData.visaType === 'Tourist Visa' || formData.visaType === 'tourist') &&
              styles.optionCardSelected,
          ]}
          onPress={() => updateFormData('visaType', 'Tourist Visa')}>
          <Icon name="airplane" size={24} color="#4A9EFF" />
          <Text style={styles.optionText}>
            {t('questionnaireV2.step0.tourist', 'Tourist Visa')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.optionCard,
            (formData.visaType === 'Student Visa' || formData.visaType === 'student') &&
              styles.optionCardSelected,
          ]}
          onPress={() => updateFormData('visaType', 'Student Visa')}>
          <Icon name="school" size={24} color="#4A9EFF" />
          <Text style={styles.optionText}>
            {t('questionnaireV2.step0.student', 'Student Visa')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.optionCard,
            formData.visaType === 'Work Visa' && styles.optionCardSelected,
          ]}
          onPress={() => updateFormData('visaType', 'Work Visa')}>
          <Icon name="briefcase" size={24} color="#4A9EFF" />
          <Text style={styles.optionText}>
            {t('questionnaireV2.step0.work', 'Work Visa')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.optionCard,
            formData.visaType === 'Business Visa' && styles.optionCardSelected,
          ]}
          onPress={() => updateFormData('visaType', 'Business Visa')}>
          <Icon name="business" size={24} color="#4A9EFF" />
          <Text style={styles.optionText}>
            {t('questionnaireV2.step0.business', 'Business Visa')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.optionCard,
            formData.visaType === 'Family/Visitor Visa' && styles.optionCardSelected,
          ]}
          onPress={() => updateFormData('visaType', 'Family/Visitor Visa')}>
          <Icon name="people" size={24} color="#4A9EFF" />
          <Text style={styles.optionText}>
            {t('questionnaireV2.step0.family', 'Family/Visitor Visa')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.optionCard,
            formData.visaType === 'Transit Visa' && styles.optionCardSelected,
          ]}
          onPress={() => updateFormData('visaType', 'Transit Visa')}>
          <Icon name="airplane" size={24} color="#4A9EFF" />
          <Text style={styles.optionText}>
            {t('questionnaireV2.step0.transit', 'Transit Visa')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 1: Personal
  const renderStep1_Personal = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('questionnaireV2.step1.title')}</Text>
      <Text style={styles.stepDescription}>
        {t('questionnaireV2.step1.description')}
      </Text>

      <Text style={styles.fieldLabel}>
        {t('questionnaireV2.step1.ageRange')}
      </Text>
      <View style={styles.optionsRow}>
        {[
          {value: 'under_18', labelKey: 'under_18'},
          {value: '18_25', labelKey: '18_25'},
          {value: '26_35', labelKey: '26_35'},
          {value: '36_50', labelKey: '36_50'},
          {value: '51_plus', labelKey: '51_plus'},
        ].map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionButton,
              formData.personal?.ageRange === opt.value &&
                styles.optionButtonSelected,
            ]}
            onPress={() =>
              updateFormData('personal', {ageRange: opt.value as any})
            }>
            <Text
              style={[
                styles.optionButtonText,
                formData.personal?.ageRange === opt.value &&
                  styles.optionButtonTextSelected,
              ]}>
              {t(`questionnaireV2.step1.${opt.labelKey}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.fieldLabel, {marginTop: 24}]}>
        {t('questionnaireV2.step1.maritalStatus')}
      </Text>
      <View style={styles.optionsRow}>
        {[
          {value: 'single', labelKey: 'single'},
          {value: 'married', labelKey: 'married'},
          {value: 'divorced', labelKey: 'divorced'},
          {value: 'widowed', labelKey: 'widowed'},
        ].map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionButton,
              formData.personal?.maritalStatus === opt.value &&
                styles.optionButtonSelected,
            ]}
            onPress={() =>
              updateFormData('personal', {maritalStatus: opt.value as any})
            }>
            <Text
              style={[
                styles.optionButtonText,
                formData.personal?.maritalStatus === opt.value &&
                  styles.optionButtonTextSelected,
              ]}>
              {t(`questionnaireV2.step1.${opt.labelKey}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.fieldLabel, {marginTop: 24}]}>
        {t('questionnaireV2.step1.nationality')}
      </Text>
      <View style={styles.optionsRow}>
        {[
          {value: 'UZ', labelKey: 'uzbekistan'},
          {value: 'other', labelKey: 'other'},
        ].map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionCard,
              formData.personal?.nationality === opt.value &&
                styles.optionCardSelected,
            ]}
            onPress={() =>
              updateFormData('personal', {nationality: opt.value as any})
            }>
            <Text style={styles.optionText}>
              {t(`questionnaireV2.step1.${opt.labelKey}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.fieldLabel, {marginTop: 24}]}>
        {t('questionnaireV2.step1.passportStatus')}
      </Text>
      <View style={styles.optionsColumn}>
        {[
          {
            value: 'valid_6plus_months',
            labelKey: 'valid_6plus_months',
          },
          {
            value: 'valid_less_6_months',
            labelKey: 'valid_less_6_months',
          },
          {value: 'no_passport', labelKey: 'no_passport'},
        ].map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionCard,
              formData.personal?.passportStatus === opt.value &&
                styles.optionCardSelected,
            ]}
            onPress={() =>
              updateFormData('personal', {passportStatus: opt.value as any})
            }>
            <Text style={styles.optionText}>
              {t(`questionnaireV2.step1.${opt.labelKey}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Step 2: Status & Education
  const renderStep2_StatusAndEducation = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('questionnaireV2.step2.title')}</Text>
      <Text style={styles.stepDescription}>
        {t('questionnaireV2.step2.description')}
      </Text>

      <Text style={styles.fieldLabel}>
        {t('questionnaireV2.step2.currentStatus')}
      </Text>
      <View style={styles.optionsColumn}>
        {[
          {value: 'student', labelKey: 'status_student'},
          {value: 'employed', labelKey: 'status_employed'},
          {value: 'self_employed', labelKey: 'status_self_employed'},
          {value: 'unemployed', labelKey: 'status_unemployed'},
          {value: 'business_owner', labelKey: 'status_business_owner'},
          {value: 'school_child', labelKey: 'status_school_child'},
        ].map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionCard,
              formData.status?.currentStatus === opt.value &&
                styles.optionCardSelected,
            ]}
            onPress={() =>
              updateFormData('status', {currentStatus: opt.value as any})
            }>
            <Text style={styles.optionText}>
              {t(`questionnaireV2.step2.${opt.labelKey}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.fieldLabel, {marginTop: 24}]}>
        {t('questionnaireV2.step2.highestEducation')}
      </Text>
      <View style={styles.optionsColumn}>
        {[
          {value: 'school', labelKey: 'education_school'},
          {value: 'college', labelKey: 'education_college'},
          {value: 'bachelor', labelKey: 'education_bachelor'},
          {value: 'master', labelKey: 'education_master'},
          {value: 'phd', labelKey: 'education_phd'},
          {value: 'other', labelKey: 'education_other'},
        ].map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionCard,
              formData.status?.highestEducation === opt.value &&
                styles.optionCardSelected,
            ]}
            onPress={() =>
              updateFormData('status', {highestEducation: opt.value as any})
            }>
            <Text style={styles.optionText}>
              {t(`questionnaireV2.step2.${opt.labelKey}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Step 3: Travel Profile
  const renderStep3_TravelProfile = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('questionnaireV2.step3.title')}</Text>
      <Text style={styles.stepDescription}>
        {t('questionnaireV2.step3.description')}
      </Text>

      {formData.visaType === 'student' && (
        <View style={styles.infoBox}>
          <Icon name="information-circle" size={20} color="#4A9EFF" />
          <Text style={styles.infoText}>
            {t('questionnaireV2.step3.studentDurationInfo')}
          </Text>
        </View>
      )}

      {formData.visaType === 'tourist' && (
        <>
          <Text style={styles.fieldLabel}>
            {t('questionnaireV2.step3.duration')}
          </Text>
          <View style={styles.optionsColumn}>
            {[
              {value: 'up_to_30_days', labelKey: 'up_to_30_days'},
              {value: '31_90_days', labelKey: '31_90_days'},
              {value: 'more_than_90_days', labelKey: 'more_than_90_days'},
            ].map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionCard,
                  formData.travel?.durationCategory === opt.value &&
                    styles.optionCardSelected,
                ]}
                onPress={() =>
                  updateFormData('travel', {durationCategory: opt.value as any})
                }>
                <Text style={styles.optionText}>
                  {t(`questionnaireV2.step3.${opt.labelKey}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {formData.visaType === 'student' && (
        <View style={styles.readOnlyField}>
          <Text style={styles.fieldLabel}>
            {t('questionnaireV2.step3.durationReadOnly')}
          </Text>
          <Text style={styles.readOnlyText}>
            {t('questionnaireV2.step3.durationRequired')}
          </Text>
        </View>
      )}

      <Text style={[styles.fieldLabel, {marginTop: 24}]}>
        {t('questionnaireV2.step3.plannedWhen')}
      </Text>
      <View style={styles.optionsColumn}>
        {[
          {value: 'within_3_months', labelKey: 'within_3_months'},
          {value: '3_to_12_months', labelKey: '3_to_12_months'},
          {value: 'not_sure', labelKey: 'not_sure'},
        ].map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionCard,
              formData.travel?.plannedWhen === opt.value &&
                styles.optionCardSelected,
            ]}
            onPress={() =>
              updateFormData('travel', {plannedWhen: opt.value as any})
            }>
            <Text style={styles.optionText}>
              {t(`questionnaireV2.step3.${opt.labelKey}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {t('questionnaireV2.step3.exactDatesKnown')}
        </Text>
        <Switch
          value={formData.travel?.isExactDatesKnown || false}
          onValueChange={value =>
            updateFormData('travel', {isExactDatesKnown: value})
          }
        />
      </View>
    </View>
  );

  // Step 4: Financial
  const renderStep4_Financial = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('questionnaireV2.step4.title')}</Text>
      <Text style={styles.stepDescription}>
        {t('questionnaireV2.step4.description')}
      </Text>

      <Text style={styles.fieldLabel}>{t('questionnaireV2.step4.payer')}</Text>
      <View style={styles.optionsColumn}>
        {[
          {value: 'self', labelKey: 'payer_self'},
          {value: 'parents', labelKey: 'payer_parents'},
          {value: 'other_family', labelKey: 'payer_other_family'},
          {value: 'employer', labelKey: 'payer_employer'},
          {value: 'scholarship', labelKey: 'payer_scholarship'},
          {value: 'other_sponsor', labelKey: 'payer_other_sponsor'},
        ].map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionCard,
              formData.finance?.payer === opt.value &&
                styles.optionCardSelected,
            ]}
            onPress={() =>
              updateFormData('finance', {payer: opt.value as any})
            }>
            <Text style={styles.optionText}>
              {t(`questionnaireV2.step4.${opt.labelKey}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.fieldLabel, {marginTop: 24}]}>
        {t('questionnaireV2.step4.incomeRange')}
      </Text>
      <View style={styles.optionsColumn}>
        {[
          {value: 'less_500', labelKey: 'income_less_500'},
          {value: '500_1000', labelKey: 'income_500_1000'},
          {value: '1000_3000', labelKey: 'income_1000_3000'},
          {value: '3000_plus', labelKey: 'income_3000_plus'},
          {value: 'not_applicable', labelKey: 'income_not_applicable'},
        ].map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionCard,
              formData.finance?.approxMonthlyIncomeRange === opt.value &&
                styles.optionCardSelected,
            ]}
            onPress={() =>
              updateFormData('finance', {
                approxMonthlyIncomeRange: opt.value as any,
              })
            }>
            <Text style={styles.optionText}>
              {t(`questionnaireV2.step4.${opt.labelKey}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {t('questionnaireV2.step4.hasBankStatement')}
        </Text>
        <Switch
          value={formData.finance?.hasBankStatement || false}
          onValueChange={value =>
            updateFormData('finance', {hasBankStatement: value})
          }
        />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {t('questionnaireV2.step4.hasStableIncome')}
        </Text>
        <Switch
          value={formData.finance?.hasStableIncome || false}
          onValueChange={value =>
            updateFormData('finance', {hasStableIncome: value})
          }
        />
      </View>
    </View>
  );

  // Step 5: Invitation
  const renderStep5_Invitation = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('questionnaireV2.step5.title')}</Text>
      <Text style={styles.stepDescription}>
        {t('questionnaireV2.step5.description')}
      </Text>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {t('questionnaireV2.step5.hasInvitation')}
        </Text>
        <Switch
          value={formData.invitation?.hasInvitation || false}
          onValueChange={value =>
            updateFormData('invitation', {hasInvitation: value})
          }
        />
      </View>

      {formData.invitation?.hasInvitation && (
        <>
          {formData.visaType === 'student' && (
            <>
              <Text style={[styles.fieldLabel, {marginTop: 24}]}>
                {t('questionnaireV2.step5.invitationType')}
              </Text>
              <View style={styles.optionsColumn}>
                {[
                  {
                    value: 'university_acceptance',
                    labelKey: 'student_university_acceptance',
                  },
                  {
                    value: 'language_course',
                    labelKey: 'student_language_course',
                  },
                  {
                    value: 'exchange_program',
                    labelKey: 'student_exchange_program',
                  },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionCard,
                      formData.invitation?.studentInvitationType ===
                        opt.value && styles.optionCardSelected,
                    ]}
                    onPress={() =>
                      updateFormData('invitation', {
                        studentInvitationType: opt.value as any,
                      })
                    }>
                    <Text style={styles.optionText}>
                      {t(`questionnaireV2.step5.${opt.labelKey}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {formData.visaType === 'tourist' && (
            <>
              <Text style={[styles.fieldLabel, {marginTop: 24}]}>
                {t('questionnaireV2.step5.invitationType')}
              </Text>
              <View style={styles.optionsColumn}>
                {[
                  {value: 'hotel_booking', labelKey: 'tourist_hotel_booking'},
                  {
                    value: 'family_or_friends',
                    labelKey: 'tourist_family_or_friends',
                  },
                  {value: 'tour_agency', labelKey: 'tourist_tour_agency'},
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionCard,
                      formData.invitation?.touristInvitationType ===
                        opt.value && styles.optionCardSelected,
                    ]}
                    onPress={() =>
                      updateFormData('invitation', {
                        touristInvitationType: opt.value as any,
                      })
                    }>
                    <Text style={styles.optionText}>
                      {t(`questionnaireV2.step5.${opt.labelKey}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </>
      )}

      {!formData.invitation?.hasInvitation &&
        formData.visaType === 'tourist' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              {t('questionnaireV2.step5.noInvitationRequired')}
            </Text>
          </View>
        )}
    </View>
  );

  // Step 6: Stay & Tickets
  const renderStep6_StayAndTickets = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('questionnaireV2.step6.title')}</Text>
      <Text style={styles.stepDescription}>
        {t('questionnaireV2.step6.description')}
      </Text>

      <Text style={styles.fieldLabel}>
        {t('questionnaireV2.step6.accommodationType')}
      </Text>
      <View style={styles.optionsColumn}>
        {[
          {value: 'hotel', labelKey: 'accommodation_hotel'},
          {value: 'host_family', labelKey: 'accommodation_host_family'},
          {value: 'relative', labelKey: 'accommodation_relative'},
          {
            value: 'rented_apartment',
            labelKey: 'accommodation_rented_apartment',
          },
          {value: 'dormitory', labelKey: 'accommodation_dormitory'},
          {value: 'not_decided', labelKey: 'accommodation_not_decided'},
        ].map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionCard,
              formData.stay?.accommodationType === opt.value &&
                styles.optionCardSelected,
            ]}
            onPress={() =>
              updateFormData('stay', {accommodationType: opt.value as any})
            }>
            <Text style={styles.optionText}>
              {t(`questionnaireV2.step6.${opt.labelKey}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {formData.visaType === 'student'
            ? t('questionnaireV2.step6.hasRoundTripTicketStudent')
            : t('questionnaireV2.step6.hasRoundTripTicket')}
        </Text>
        <Switch
          value={formData.stay?.hasRoundTripTicket || false}
          onValueChange={value =>
            updateFormData('stay', {hasRoundTripTicket: value})
          }
        />
      </View>
    </View>
  );

  // Step 7: Travel History
  const renderStep7_TravelHistory = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('questionnaireV2.step7.title')}</Text>
      <Text style={styles.stepDescription}>
        {t('questionnaireV2.step7.description')}
      </Text>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {t('questionnaireV2.step7.hasTraveledBefore')}
        </Text>
        <Switch
          value={formData.history?.hasTraveledBefore || false}
          onValueChange={value =>
            updateFormData('history', {hasTraveledBefore: value})
          }
        />
      </View>

      {formData.history?.hasTraveledBefore && (
        <>
          <Text style={[styles.fieldLabel, {marginTop: 24}]}>
            {t('questionnaireV2.step7.regionsVisited')}
          </Text>
          <View style={styles.optionsColumn}>
            {[
              {value: 'schengen', labelKey: 'region_schengen'},
              {value: 'usa_canada', labelKey: 'region_usa_canada'},
              {value: 'uk', labelKey: 'region_uk'},
              {value: 'asia', labelKey: 'region_asia'},
              {value: 'middle_east', labelKey: 'region_middle_east'},
            ].map(opt => {
              const isSelected =
                formData.history?.regionsVisited?.includes(opt.value as any) ||
                false;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                  ]}
                  onPress={() => {
                    const current = formData.history?.regionsVisited || [];
                    const updated = isSelected
                      ? current.filter(r => r !== opt.value)
                      : [...current, opt.value as any];
                    updateFormData('history', {regionsVisited: updated});
                  }}>
                  <View style={styles.checkboxRow}>
                    <Icon
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={isSelected ? '#4A9EFF' : '#94A3B8'}
                    />
                    <Text style={styles.optionText}>
                      {t(`questionnaireV2.step7.${opt.labelKey}`)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {t('questionnaireV2.step7.hasVisaRefusals')}
        </Text>
        <Switch
          value={formData.history?.hasVisaRefusals || false}
          onValueChange={value =>
            updateFormData('history', {hasVisaRefusals: value})
          }
        />
      </View>
    </View>
  );

  // Step 8: Ties & Documents
  const renderStep8_TiesAndDocuments = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('questionnaireV2.step8.title')}</Text>
      <Text style={styles.stepDescription}>
        {t('questionnaireV2.step8.description')}
      </Text>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {t('questionnaireV2.step8.hasProperty')}
        </Text>
        <Switch
          value={formData.ties?.hasProperty || false}
          onValueChange={value => updateFormData('ties', {hasProperty: value})}
        />
      </View>

      {formData.ties?.hasProperty && (
        <>
          <Text style={[styles.fieldLabel, {marginTop: 16}]}>
            {t('questionnaireV2.step8.propertyType')}
          </Text>
          <View style={styles.optionsColumn}>
            {[
              {value: 'apartment', labelKey: 'property_apartment'},
              {value: 'house', labelKey: 'property_house'},
              {value: 'land', labelKey: 'property_land'},
              {value: 'business', labelKey: 'property_business'},
            ].map(opt => {
              const isSelected =
                formData.ties?.propertyType?.includes(opt.value as any) ||
                false;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                  ]}
                  onPress={() => {
                    const current = formData.ties?.propertyType || [];
                    const updated = isSelected
                      ? current.filter(p => p !== opt.value)
                      : [...current, opt.value as any];
                    updateFormData('ties', {propertyType: updated});
                  }}>
                  <View style={styles.checkboxRow}>
                    <Icon
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={isSelected ? '#4A9EFF' : '#94A3B8'}
                    />
                    <Text style={styles.optionText}>
                      {t(`questionnaireV2.step8.${opt.labelKey}`)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {t('questionnaireV2.step8.hasCloseFamily')}
        </Text>
        <Switch
          value={formData.ties?.hasCloseFamilyInUzbekistan || false}
          onValueChange={value =>
            updateFormData('ties', {hasCloseFamilyInUzbekistan: value})
          }
        />
      </View>

      <Text style={[styles.fieldLabel, {marginTop: 24}]}>
        {t('questionnaireV2.step8.availableDocuments')}
      </Text>
      {[
        {
          key: 'hasEmploymentOrStudyProof',
          labelKey: 'doc_employment_study',
        },
        {key: 'hasInsurance', labelKey: 'doc_insurance'},
        {key: 'hasPassport', labelKey: 'doc_passport'},
        {key: 'hasBirthCertificate', labelKey: 'doc_birth_certificate'},
        {key: 'hasPropertyDocs', labelKey: 'doc_property_docs'},
      ].map(doc => (
        <View key={doc.key} style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>
            {t(`questionnaireV2.step8.${doc.labelKey}`)} *
          </Text>
          <Switch
            value={
              (formData.documents?.[
                doc.key as keyof QuestionnaireV2['documents']
              ] as boolean) || false
            }
            onValueChange={value =>
              updateFormData('documents', {[doc.key]: value} as any)
            }
          />
        </View>
      ))}
    </View>
  );

  // Step 9: Special Conditions
  const renderStep9_SpecialConditions = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('questionnaireV2.step9.title')}</Text>
      <Text style={styles.stepDescription}>
        {t('questionnaireV2.step9.description')}
      </Text>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {t('questionnaireV2.step9.travelingWithChildren')}
        </Text>
        <Switch
          value={formData.special?.travelingWithChildren || false}
          onValueChange={value =>
            updateFormData('special', {travelingWithChildren: value})
          }
        />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {t('questionnaireV2.step9.hasMedicalReason')}
        </Text>
        <Switch
          value={formData.special?.hasMedicalReasonForTrip || false}
          onValueChange={value =>
            updateFormData('special', {hasMedicalReasonForTrip: value})
          }
        />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {t('questionnaireV2.step9.hasCriminalRecord')}
        </Text>
        <Switch
          value={formData.special?.hasCriminalRecord || false}
          onValueChange={value =>
            updateFormData('special', {hasCriminalRecord: value})
          }
        />
      </View>

      {formData.special?.hasCriminalRecord && (
        <View style={styles.warningBox}>
          <Icon name="warning" size={20} color="#EF4444" />
          <Text style={styles.warningText}>
            {t('questionnaireV2.step9.criminalRecordWarning')}
          </Text>
        </View>
      )}
    </View>
  );

  // Step 10: Visa-specific modules
  const renderStep10_VisaSpecifics = () => {
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

    const updateModuleField = <K extends keyof QuestionnaireV2>(
      module: 'studentModule' | 'workModule' | 'familyModule' | 'businessModule' | 'transitModule',
      field: string,
      value: any,
    ) => {
      setFormData(prev => {
        const currentModule = prev[module] || {};
        return {
          ...prev,
          [module]: {
            ...currentModule,
            [field]: value,
          },
        };
      });
    };

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>
          {t('questionnaireV2.step10.title', 'Visa-specific details')}
        </Text>
        <Text style={styles.stepDescription}>
          {t(
            'questionnaireV2.step10.description',
            'Answer the questions relevant to your visa type. Skip anything that does not apply.',
          )}
        </Text>

        {isStudent && (
          <View style={styles.moduleSection}>
            <Text style={styles.moduleTitle}>
              {t('questionnaireV2.step10.studentModule', 'Student Visa Details')}
            </Text>

            <Text style={styles.fieldLabel}>
              {t('questionnaireV2.step10.schoolName', 'School / university name')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.studentModule?.schoolName || ''}
              onChangeText={value => updateModuleField('studentModule', 'schoolName', value)}
              placeholder={t('questionnaireV2.step10.schoolNamePlaceholder', 'Enter school name')}
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.fieldLabel}>
              {t('questionnaireV2.step10.acceptanceStatus', 'Acceptance status')}
            </Text>
            <View style={styles.optionsRow}>
              {['accepted', 'applied', 'not_applied'].map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.optionCard,
                    formData.studentModule?.acceptanceStatus === status &&
                      styles.optionCardSelected,
                  ]}
                  onPress={() =>
                    updateModuleField('studentModule', 'acceptanceStatus', status)
                  }>
                  <Text style={styles.optionText}>
                    {t(`questionnaireV2.step10.${status}`, status)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>
              {t('questionnaireV2.step10.programStartDate', 'Program start date')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.studentModule?.programStartDate || ''}
              onChangeText={value =>
                updateModuleField('studentModule', 'programStartDate', value)
              }
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.fieldLabel}>
              {t('questionnaireV2.step10.tuitionAmount', 'Tuition amount (USD)')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={
                formData.studentModule?.tuitionAmountUSD
                  ? String(formData.studentModule.tuitionAmountUSD)
                  : ''
              }
              onChangeText={value =>
                updateModuleField(
                  'studentModule',
                  'tuitionAmountUSD',
                  value ? Number(value) : null,
                )
              }
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                {t('questionnaireV2.step10.scholarship', 'Scholarship')}
              </Text>
              <Switch
                value={formData.studentModule?.scholarship || false}
                onValueChange={value =>
                  updateModuleField('studentModule', 'scholarship', value)
                }
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                {t(
                  'questionnaireV2.step10.hasAdmissionLetter',
                  'Admission/acceptance letter available',
                )}
              </Text>
              <Switch
                value={formData.studentModule?.hasAdmissionLetter || false}
                onValueChange={value =>
                  updateModuleField('studentModule', 'hasAdmissionLetter', value)
                }
              />
            </View>
          </View>
        )}

        {isWork && (
          <View style={styles.moduleSection}>
            <Text style={styles.moduleTitle}>
              {t('questionnaireV2.step10.workModule', 'Work Visa Details')}
            </Text>

            <Text style={styles.fieldLabel}>
              {t('questionnaireV2.step10.employerName', 'Employer name')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.workModule?.employerName || ''}
              onChangeText={value => updateModuleField('workModule', 'employerName', value)}
              placeholder={t('questionnaireV2.step10.employerNamePlaceholder', 'Enter employer name')}
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.fieldLabel}>
              {t('questionnaireV2.step10.position', 'Position / role')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.workModule?.position || ''}
              onChangeText={value => updateModuleField('workModule', 'position', value)}
              placeholder={t('questionnaireV2.step10.positionPlaceholder', 'Enter position')}
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.fieldLabel}>
              {t('questionnaireV2.step10.salaryMonthly', 'Monthly salary (USD)')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={
                formData.workModule?.salaryMonthlyUSD
                  ? String(formData.workModule.salaryMonthlyUSD)
                  : ''
              }
              onChangeText={value =>
                updateModuleField(
                  'workModule',
                  'salaryMonthlyUSD',
                  value ? Number(value) : null,
                )
              }
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                {t('questionnaireV2.step10.hasWorkPermit', 'Work permit already issued')}
              </Text>
              <Switch
                value={formData.workModule?.hasWorkPermit || false}
                onValueChange={value =>
                  updateModuleField('workModule', 'hasWorkPermit', value)
                }
              />
            </View>
          </View>
        )}

        {isFamily && (
          <View style={styles.moduleSection}>
            <Text style={styles.moduleTitle}>
              {t('questionnaireV2.step10.familyModule', 'Family/Visitor Visa Details')}
            </Text>

            <Text style={styles.fieldLabel}>
              {t('questionnaireV2.step10.inviterRelationship', 'Inviter relationship')}
            </Text>
            <View style={styles.optionsGrid}>
              {['spouse', 'parent', 'sibling', 'relative', 'friend'].map(rel => (
                <TouchableOpacity
                  key={rel}
                  style={[
                    styles.optionCard,
                    formData.familyModule?.inviterRelationship === rel &&
                      styles.optionCardSelected,
                  ]}
                  onPress={() =>
                    updateModuleField('familyModule', 'inviterRelationship', rel)
                  }>
                  <Text style={styles.optionText}>
                    {t(`questionnaireV2.step10.${rel}`, rel)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                {t('questionnaireV2.step10.hasInvitationLetter', 'Invitation letter available')}
              </Text>
              <Switch
                value={formData.familyModule?.hasInvitationLetter || false}
                onValueChange={value =>
                  updateModuleField('familyModule', 'hasInvitationLetter', value)
                }
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                {t('questionnaireV2.step10.willHost', 'Inviter will host')}
              </Text>
              <Switch
                value={formData.familyModule?.willHost || false}
                onValueChange={value =>
                  updateModuleField('familyModule', 'willHost', value)
                }
              />
            </View>
          </View>
        )}

        {isBusiness && (
          <View style={styles.moduleSection}>
            <Text style={styles.moduleTitle}>
              {t('questionnaireV2.step10.businessModule', 'Business Visa Details')}
            </Text>

            <Text style={styles.fieldLabel}>
              {t('questionnaireV2.step10.companyName', 'Company / organizer')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.businessModule?.companyName || ''}
              onChangeText={value => updateModuleField('businessModule', 'companyName', value)}
              placeholder={t('questionnaireV2.step10.companyNamePlaceholder', 'Enter company name')}
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.fieldLabel}>
              {t('questionnaireV2.step10.eventType', 'Event / conference')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.businessModule?.eventType || ''}
              onChangeText={value => updateModuleField('businessModule', 'eventType', value)}
              placeholder={t('questionnaireV2.step10.eventTypePlaceholder', 'Enter event type')}
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                {t(
                  'questionnaireV2.step10.invitationFromCompany',
                  'Invitation from company available',
                )}
              </Text>
              <Switch
                value={formData.businessModule?.invitationFromCompany || false}
                onValueChange={value =>
                  updateModuleField('businessModule', 'invitationFromCompany', value)
                }
              />
            </View>
          </View>
        )}

        {isTransit && (
          <View style={styles.moduleSection}>
            <Text style={styles.moduleTitle}>
              {t('questionnaireV2.step10.transitModule', 'Transit Visa Details')}
            </Text>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                {t('questionnaireV2.step10.onwardTicket', 'Onward/return ticket booked')}
              </Text>
              <Switch
                value={formData.transitModule?.onwardTicket || false}
                onValueChange={value =>
                  updateModuleField('transitModule', 'onwardTicket', value)
                }
              />
            </View>

            <Text style={styles.fieldLabel}>
              {t('questionnaireV2.step10.layoverHours', 'Layover duration (hours)')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={
                formData.transitModule?.layoverHours
                  ? String(formData.transitModule.layoverHours)
                  : ''
              }
              onChangeText={value =>
                updateModuleField(
                  'transitModule',
                  'layoverHours',
                  value ? Number(value) : null,
                )
              }
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94A3B8"
            />
          </View>
        )}

        {!isStudent && !isWork && !isBusiness && !isFamily && !isTransit && (
          <View style={styles.infoBox}>
            <Icon name="information-circle" size={20} color="#4A9EFF" />
            <Text style={styles.infoText}>
              {t(
                'questionnaireV2.step10.noExtraQuestions',
                'No additional questions for this visa type. You can continue.',
              )}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('questionnaireV2.stepOf', {
            current: currentStep + 1,
            total: TOTAL_STEPS,
          })}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%`},
          ]}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleBack}
          disabled={loading}>
          <Text style={styles.buttonTextSecondary}>
            {t('questionnaireV2.back')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.buttonPrimary,
            !canProceed() && styles.buttonDisabled,
          ]}
          onPress={handleNext}
          disabled={loading || !canProceed()}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonTextPrimary}>
              {currentStep === TOTAL_STEPS - 1
                ? t('questionnaireV2.submit')
                : t('questionnaireV2.next')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1929',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 158, 255, 0.2)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A9EFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionsColumn: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    flex: 1,
    minHeight: 80,
  },
  optionCardSelected: {
    borderColor: '#4A9EFF',
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
  },
  optionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  optionButton: {
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    flex: 1,
    minWidth: 80,
  },
  optionButtonSelected: {
    borderColor: '#4A9EFF',
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
  },
  optionButtonTextSelected: {
    color: '#4A9EFF',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  toggleLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.3)',
  },
  infoText: {
    fontSize: 14,
    color: '#4A9EFF',
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  warningText: {
    fontSize: 14,
    color: '#EF4444',
    flex: 1,
  },
  readOnlyField: {
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 158, 255, 0.2)',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#4A9EFF',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderWidth: 2,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
    opacity: 0.6,
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  moduleSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(15, 30, 45, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A9EFF',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
});
