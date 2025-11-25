/**
 * Questionnaire V2 Screen - 10-Step Multiple Choice Questionnaire
 * Implements QuestionnaireV2 structure with branching logic
 * Replaces the old 32-question questionnaire system
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

const TOTAL_STEPS = 10;

// Supported countries mapping (code from backend matches TargetCountry)
const SUPPORTED_COUNTRIES: Array<{
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
  const {countries, fetchCountries, isLoadingCountries} = useVisaStore();

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
    if (formData.visaType === 'student') {
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
    if (
      formData.visaType === 'tourist' &&
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
      Alert.alert(t('common.error'), 'Please answer all required questions');
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
      // Backend's /applications/ai-generate accepts questionnaireData directly
      // Backend will detect version: '2.0' and process QuestionnaireV2 accordingly
      try {
        // Use the API client's internal axios instance to bypass type restrictions
        // The backend endpoint accepts QuestionnaireV2 format
        const response = await (apiClient as any).api.post(
          '/applications/ai-generate',
          {
            questionnaireData: questionnaireV2,
          },
        );

        const responseData = response.data;

        if (responseData?.success && responseData?.data?.application?.id) {
          navigation.navigate('ApplicationDetail', {
            applicationId: responseData.data.application.id,
          });
        } else {
          navigation.navigate('MainTabs', {screen: 'Applications'});
        }
      } catch (error) {
        console.warn('AI generation failed, but questionnaire saved:', error);
        navigation.navigate('MainTabs', {screen: 'Applications'});
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
      default:
        return null;
    }
  };

  // Step 0: Country & Visa Type
  const renderStep0_CountryAndVisaType = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Destination</Text>
      <Text style={styles.stepDescription}>
        Choose your destination country and visa type
      </Text>

      <Text style={styles.fieldLabel}>Country *</Text>
      <View style={styles.optionsGrid}>
        {SUPPORTED_COUNTRIES.map(country => (
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

      <Text style={[styles.fieldLabel, {marginTop: 24}]}>Visa Type *</Text>
      <View style={styles.optionsRow}>
        <TouchableOpacity
          style={[
            styles.optionCard,
            formData.visaType === 'tourist' && styles.optionCardSelected,
          ]}
          onPress={() => updateFormData('visaType', 'tourist')}>
          <Icon name="airplane" size={24} color="#4A9EFF" />
          <Text style={styles.optionText}>Tourist</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.optionCard,
            formData.visaType === 'student' && styles.optionCardSelected,
          ]}
          onPress={() => updateFormData('visaType', 'student')}>
          <Icon name="school" size={24} color="#4A9EFF" />
          <Text style={styles.optionText}>Student</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 1: Personal
  const renderStep1_Personal = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Personal Information</Text>
      <Text style={styles.stepDescription}>Tell us about yourself</Text>

      <Text style={styles.fieldLabel}>Age Range *</Text>
      <View style={styles.optionsRow}>
        {[
          {value: 'under_18', label: 'Under 18'},
          {value: '18_25', label: '18-25'},
          {value: '26_35', label: '26-35'},
          {value: '36_50', label: '36-50'},
          {value: '51_plus', label: '51+'},
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
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.fieldLabel, {marginTop: 24}]}>Marital Status *</Text>
      <View style={styles.optionsRow}>
        {[
          {value: 'single', label: 'Single'},
          {value: 'married', label: 'Married'},
          {value: 'divorced', label: 'Divorced'},
          {value: 'widowed', label: 'Widowed'},
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
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.fieldLabel, {marginTop: 24}]}>Nationality *</Text>
      <View style={styles.optionsRow}>
        {[
          {value: 'UZ', label: 'Uzbekistan'},
          {value: 'other', label: 'Other'},
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
            <Text style={styles.optionText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.fieldLabel, {marginTop: 24}]}>
        Passport Status *
      </Text>
      <View style={styles.optionsColumn}>
        {[
          {
            value: 'valid_6plus_months',
            label: 'Valid (6+ months remaining)',
          },
          {
            value: 'valid_less_6_months',
            label: 'Valid (less than 6 months)',
          },
          {value: 'no_passport', label: 'No passport'},
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
            <Text style={styles.optionText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Step 2: Status & Education
  const renderStep2_StatusAndEducation = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Current Status & Education</Text>
      <Text style={styles.stepDescription}>
        Your current employment and education level
      </Text>

      <Text style={styles.fieldLabel}>Current Status *</Text>
      <View style={styles.optionsColumn}>
        {[
          {value: 'student', label: 'Student'},
          {value: 'employed', label: 'Employed'},
          {value: 'self_employed', label: 'Self-Employed'},
          {value: 'unemployed', label: 'Unemployed'},
          {value: 'business_owner', label: 'Business Owner'},
          {value: 'school_child', label: 'School Child'},
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
            <Text style={styles.optionText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.fieldLabel, {marginTop: 24}]}>
        Highest Education *
      </Text>
      <View style={styles.optionsColumn}>
        {[
          {value: 'school', label: 'School'},
          {value: 'college', label: 'College'},
          {value: 'bachelor', label: "Bachelor's"},
          {value: 'master', label: "Master's"},
          {value: 'phd', label: 'PhD'},
          {value: 'other', label: 'Other'},
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
            <Text style={styles.optionText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Step 3: Travel Profile
  const renderStep3_TravelProfile = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Travel Plans</Text>
      <Text style={styles.stepDescription}>
        When and how long do you plan to travel?
      </Text>

      {formData.visaType === 'student' && (
        <View style={styles.infoBox}>
          <Icon name="information-circle" size={20} color="#4A9EFF" />
          <Text style={styles.infoText}>
            Student visas typically require stays longer than 90 days
          </Text>
        </View>
      )}

      {formData.visaType === 'tourist' && (
        <>
          <Text style={styles.fieldLabel}>Duration *</Text>
          <View style={styles.optionsColumn}>
            {[
              {value: 'up_to_30_days', label: 'Up to 30 days'},
              {value: '31_90_days', label: '31-90 days'},
              {value: 'more_than_90_days', label: 'More than 90 days'},
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
                <Text style={styles.optionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {formData.visaType === 'student' && (
        <View style={styles.readOnlyField}>
          <Text style={styles.fieldLabel}>Duration</Text>
          <Text style={styles.readOnlyText}>More than 90 days (required)</Text>
        </View>
      )}

      <Text style={[styles.fieldLabel, {marginTop: 24}]}>
        Planned Travel Time *
      </Text>
      <View style={styles.optionsColumn}>
        {[
          {value: 'within_3_months', label: 'Within 3 months'},
          {value: '3_to_12_months', label: '3 to 12 months'},
          {value: 'not_sure', label: 'Not sure yet'},
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
            <Text style={styles.optionText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Exact dates known?</Text>
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
      <Text style={styles.stepTitle}>Financial Situation</Text>
      <Text style={styles.stepDescription}>
        Who will pay for your trip and studies?
      </Text>

      <Text style={styles.fieldLabel}>Who is paying? *</Text>
      <View style={styles.optionsColumn}>
        {[
          {value: 'self', label: 'Myself'},
          {value: 'parents', label: 'Parents'},
          {value: 'other_family', label: 'Other Family'},
          {value: 'employer', label: 'Employer'},
          {value: 'scholarship', label: 'Scholarship'},
          {value: 'other_sponsor', label: 'Other Sponsor'},
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
            <Text style={styles.optionText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.fieldLabel, {marginTop: 24}]}>
        Approximate Monthly Income *
      </Text>
      <View style={styles.optionsColumn}>
        {[
          {value: 'less_500', label: 'Less than $500'},
          {value: '500_1000', label: '$500 - $1,000'},
          {value: '1000_3000', label: '$1,000 - $3,000'},
          {value: '3000_plus', label: '$3,000+'},
          {value: 'not_applicable', label: 'Not Applicable'},
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
            <Text style={styles.optionText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Have bank statements?</Text>
        <Switch
          value={formData.finance?.hasBankStatement || false}
          onValueChange={value =>
            updateFormData('finance', {hasBankStatement: value})
          }
        />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Have stable income?</Text>
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
      <Text style={styles.stepTitle}>Invitation / Admission</Text>
      <Text style={styles.stepDescription}>
        Do you have an invitation or admission letter?
      </Text>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Have invitation/admission? *</Text>
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
                Invitation Type *
              </Text>
              <View style={styles.optionsColumn}>
                {[
                  {
                    value: 'university_acceptance',
                    label: 'University Acceptance Letter',
                  },
                  {value: 'language_course', label: 'Language Course'},
                  {value: 'exchange_program', label: 'Exchange Program'},
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
                    <Text style={styles.optionText}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {formData.visaType === 'tourist' && (
            <>
              <Text style={[styles.fieldLabel, {marginTop: 24}]}>
                Invitation Type *
              </Text>
              <View style={styles.optionsColumn}>
                {[
                  {value: 'hotel_booking', label: 'Hotel Booking'},
                  {value: 'family_or_friends', label: 'Family or Friends'},
                  {value: 'tour_agency', label: 'Tour Agency'},
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
                    <Text style={styles.optionText}>{opt.label}</Text>
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
              No invitation required for tourist visa
            </Text>
          </View>
        )}
    </View>
  );

  // Step 6: Stay & Tickets
  const renderStep6_StayAndTickets = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Accommodation & Travel</Text>
      <Text style={styles.stepDescription}>
        Where will you stay and have you booked tickets?
      </Text>

      <Text style={styles.fieldLabel}>Accommodation Type *</Text>
      <View style={styles.optionsColumn}>
        {[
          {value: 'hotel', label: 'Hotel'},
          {value: 'host_family', label: 'Host Family'},
          {value: 'relative', label: 'Relative'},
          {value: 'rented_apartment', label: 'Rented Apartment'},
          {value: 'dormitory', label: 'Dormitory'},
          {value: 'not_decided', label: 'Not Decided'},
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
            <Text style={styles.optionText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {formData.visaType === 'student'
            ? 'Ticket already booked (one-way or round-trip)?'
            : 'Have round-trip ticket?'}
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
      <Text style={styles.stepTitle}>Travel History</Text>
      <Text style={styles.stepDescription}>
        Have you traveled internationally before?
      </Text>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Traveled before? *</Text>
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
            Regions Visited
          </Text>
          <View style={styles.optionsColumn}>
            {[
              {value: 'schengen', label: 'Schengen Area'},
              {value: 'usa_canada', label: 'USA / Canada'},
              {value: 'uk', label: 'United Kingdom'},
              {value: 'asia', label: 'Asia'},
              {value: 'middle_east', label: 'Middle East'},
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
                      color={isSelected ? '#4A9EFF' : '#999'}
                    />
                    <Text style={styles.optionText}>{opt.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Have visa refusals? *</Text>
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
      <Text style={styles.stepTitle}>Ties & Documents</Text>
      <Text style={styles.stepDescription}>
        Property ownership and available documents
      </Text>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Have property in Uzbekistan? *</Text>
        <Switch
          value={formData.ties?.hasProperty || false}
          onValueChange={value => updateFormData('ties', {hasProperty: value})}
        />
      </View>

      {formData.ties?.hasProperty && (
        <>
          <Text style={[styles.fieldLabel, {marginTop: 16}]}>
            Property Type
          </Text>
          <View style={styles.optionsColumn}>
            {[
              {value: 'apartment', label: 'Apartment'},
              {value: 'house', label: 'House'},
              {value: 'land', label: 'Land'},
              {value: 'business', label: 'Business'},
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
                      color={isSelected ? '#4A9EFF' : '#999'}
                    />
                    <Text style={styles.optionText}>{opt.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          Have close family in Uzbekistan? *
        </Text>
        <Switch
          value={formData.ties?.hasCloseFamilyInUzbekistan || false}
          onValueChange={value =>
            updateFormData('ties', {hasCloseFamilyInUzbekistan: value})
          }
        />
      </View>

      <Text style={[styles.fieldLabel, {marginTop: 24}]}>
        Available Documents *
      </Text>
      {[
        {
          key: 'hasEmploymentOrStudyProof',
          label: 'Employment/Study Proof',
        },
        {key: 'hasInsurance', label: 'Insurance'},
        {key: 'hasPassport', label: 'Passport'},
        {key: 'hasBirthCertificate', label: 'Birth Certificate'},
        {key: 'hasPropertyDocs', label: 'Property Documents'},
      ].map(doc => (
        <View key={doc.key} style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{doc.label} *</Text>
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
      <Text style={styles.stepTitle}>Special Conditions</Text>
      <Text style={styles.stepDescription}>
        Any special circumstances we should know about?
      </Text>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Traveling with children? *</Text>
        <Switch
          value={formData.special?.travelingWithChildren || false}
          onValueChange={value =>
            updateFormData('special', {travelingWithChildren: value})
          }
        />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Medical reason for trip? *</Text>
        <Switch
          value={formData.special?.hasMedicalReasonForTrip || false}
          onValueChange={value =>
            updateFormData('special', {hasMedicalReasonForTrip: value})
          }
        />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Have criminal record? *</Text>
        <Switch
          value={formData.special?.hasCriminalRecord || false}
          onValueChange={value =>
            updateFormData('special', {hasCriminalRecord: value})
          }
        />
      </View>

      {formData.special?.hasCriminalRecord && (
        <View style={styles.warningBox}>
          <Icon name="warning" size={20} color="#FF6B6B" />
          <Text style={styles.warningText}>
            Having a criminal record may affect your visa application. Please
            provide accurate information.
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Step {currentStep + 1} of {TOTAL_STEPS}
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
          <Text style={styles.buttonTextSecondary}>Back</Text>
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
              {currentStep === TOTAL_STEPS - 1 ? 'Submit' : 'Next'}
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
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
    color: '#333',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    flex: 1,
    minHeight: 80,
  },
  optionCardSelected: {
    borderColor: '#4A9EFF',
    backgroundColor: '#E3F2FD',
  },
  optionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  optionButton: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    flex: 1,
    minWidth: 80,
  },
  optionButtonSelected: {
    borderColor: '#4A9EFF',
    backgroundColor: '#E3F2FD',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
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
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
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
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#C62828',
    flex: 1,
  },
  readOnlyField: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  readOnlyText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
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
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  buttonDisabled: {
    backgroundColor: '#CCC',
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
    color: '#333',
  },
});
