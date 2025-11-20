/**
 * Questionnaire Screen - Complete 10-Question Flow
 * AI-powered visa planning with personalized recommendations
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTranslation} from 'react-i18next';
import {useAuthStore} from '../../store/auth';
import {useOnboardingStore} from '../../store/onboarding';
import {useVisaStore} from '../../store/visa';
import {apiClient} from '../../services/api';
import {questionnaireQuestions} from '../../data/questionnaireQuestions';
import {QuestionnaireData} from '../../types/questionnaire';
import {getTranslatedCountryName} from '../../data/countryTranslations';
import {mapExistingQuestionnaireToSummary} from '../../utils/questionnaireMapper';

export default function QuestionnaireScreen({navigation}: any) {
  const {t, i18n} = useTranslation();
  const language = i18n.language || 'en';

  const {
    currentStep,
    totalSteps,
    answers,
    setCurrentStep,
    setAnswer,
    nextStep,
    previousStep,
    resetQuestionnaire,
    clearProgress,
    setLoading: setStoreLoading,
    setError: setStoreError,
  } = useOnboardingStore();

  const {user, fetchUserProfile, setUser} = useAuthStore();
  const {countries, fetchCountries, isLoadingCountries} = useVisaStore();

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCountrySearch, setShowCountrySearch] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Load countries on mount
  useEffect(() => {
    fetchCountries();
  }, []);

  // Fade in animation
  useEffect(() => {
    let isMounted = true;
    let animation: Animated.CompositeAnimation | null = null;

    if (isMounted) {
      animation = Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      });
      animation.start();
    }

    return () => {
      isMounted = false;
      if (animation) {
        animation.stop();
      }
    };
  }, [currentStep]);

  const currentQuestion = questionnaireQuestions[currentStep];

  // Get localized question text
  const getQuestionText = (field: 'title' | 'description') => {
    if (language === 'uz') return currentQuestion[`${field}Uz`];
    if (language === 'ru') return currentQuestion[`${field}Ru`];
    return currentQuestion[`${field}En`];
  };

  // Get localized option text
  const getOptionText = (option: any) => {
    if (language === 'uz') return option.labelUz;
    if (language === 'ru') return option.labelRu;
    return option.labelEn;
  };

  // Handle answer selection
  const handleSelectAnswer = (questionId: string, value: any) => {
    setAnswer(questionId as keyof QuestionnaireData, value);
  };

  // Handle continue button
  const handleContinue = async () => {
    const currentQuestionId = currentQuestion.id;
    const currentAnswer = answers[currentQuestionId as keyof QuestionnaireData];

    // Validate required questions
    if (currentQuestion.required && !currentAnswer) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    // If last question, submit
    if (currentStep === totalSteps - 1) {
      await handleSubmit();
    } else {
      nextStep();
      // Reset fade animation
      fadeAnim.stopAnimation();
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  // Handle back button
  const handleBack = () => {
    if (currentStep > 0) {
      previousStep();
      // Reset fade animation
      fadeAnim.stopAnimation();
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // First question, go back to login
      navigation.goBack();
    }
  };

  // Submit questionnaire and generate AI application
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setStoreLoading(true);

      // Prepare questionnaire data (legacy format for API compatibility)
      const questionnaireData: QuestionnaireData = {
        purpose: (answers.purpose as any) || 'tourism',
        country: answers.country as string,
        duration: (answers.duration as any) || '1_3_months',
        traveledBefore:
          answers.traveledBefore === true ||
          String(answers.traveledBefore) === 'true',
        currentStatus: (answers.currentStatus as any) || 'employee',
        hasInvitation:
          answers.hasInvitation === true ||
          String(answers.hasInvitation) === 'true',
        financialSituation:
          (answers.financialSituation as any) || 'stable_income',
        maritalStatus: (answers.maritalStatus as any) || 'single',
        hasChildren: (answers.hasChildren as any) || 'no',
        englishLevel: (answers.englishLevel as any) || 'intermediate',
      };

      // Create standardized summary
      // Pass countries array to help map country ID to code
      const questionnaireSummary = mapExistingQuestionnaireToSummary(
        questionnaireData,
        language as "uz" | "ru" | "en",
        countries // Pass countries from visa store to help with country code mapping
      );

      // Save both legacy format (for backwards compatibility) and summary
      // Store as JSON with both formats
      const bio = JSON.stringify({
        // Legacy format for backwards compatibility
        ...questionnaireData,
        // New standardized summary
        summary: questionnaireSummary,
        // Metadata
        _version: '1.0',
        _hasSummary: true,
      });

      // Use store's updateProfile method which properly updates AsyncStorage
      const {updateProfile: updateUserProfile} = useAuthStore.getState();
      await updateUserProfile({
        bio,
        questionnaireCompleted: true,
      });

      // Refresh from server to get any other updates (but don't fail if it errors)
      try {
        await fetchUserProfile();
      } catch (error) {
        console.warn(
          'Failed to refresh profile, but questionnaire is saved:',
          error,
        );
        // Don't throw - questionnaire is already saved
      }

      // Call AI generation endpoint
      try {
        const response =
          await apiClient.generateApplicationWithAI(questionnaireData);

        if (response.success && response.data) {
          // Clear questionnaire progress
          await clearProgress();

          // Show success message and navigate to Applications
          Alert.alert('Success!', 'Your visa plan is ready!', [
            {
              text: 'OK',
              onPress: async () => {
                // Refresh applications list before navigating
                const { fetchUserApplications } = useAuthStore.getState();
                try {
                  await fetchUserApplications();
                } catch (error) {
                  console.warn('Failed to refresh applications:', error);
                }
                // Navigate back to Applications tab
                navigation?.navigate('MainTabs', { screen: 'Applications' });
              },
            },
          ]);
        } else {
          throw new Error(
            response.error?.message || 'Failed to generate application',
          );
        }
      } catch (aiError: any) {
        console.error('AI generation failed:', aiError);

        // Fallback: Create a basic application even if AI fails
        try {
          console.log('Starting fallback application creation...');
          console.log('Questionnaire data:', questionnaireData);
          
          // Get default country and visa type
          let countryId = questionnaireData.country;
          let visaTypeId: string | undefined;

          // Step 1: Get country ID
          // Validate country if provided
          if (countryId && countryId.trim() !== '') {
            console.log('Using country from questionnaire:', countryId);
            // Try to validate country exists, but don't fail if validation fails
            try {
              const countryCheck = await apiClient.getCountry(countryId);
              if (!countryCheck.success) {
                console.warn('Selected country not found, will fetch new one');
                countryId = undefined; // Reset to fetch a new one
              }
            } catch (error) {
              console.warn('Error validating country, will fetch new one:', error);
              countryId = undefined; // Reset to fetch a new one
            }
          }
          
          // Country is required - validate it exists
          if (!countryId || (typeof countryId === 'string' && countryId.trim() === '')) {
            throw new Error(t('questionnaire.country.required'));
          }

          if (!countryId) {
            throw new Error('Could not determine country');
          }

          console.log('Selected country ID:', countryId);

          // Step 2: Get visa types for the country
          console.log('Fetching visa types for country:', countryId);
          let visaTypesFetched = false;
          
          try {
            const visaTypes = await apiClient.getVisaTypes(countryId);
            console.log('Visa types API response:', visaTypes);
            
            if (visaTypes.success && visaTypes.data && Array.isArray(visaTypes.data) && visaTypes.data.length > 0) {
              // Find visa type matching purpose, or use first one
              const purposeMap: Record<string, string> = {
                study: 'student',
                work: 'work',
                tourism: 'tourist',
                business: 'business',
                immigration: 'immigration',
              };
              const visaTypeName = purposeMap[questionnaireData.purpose] || 'tourist';
              const matchingVisaType = visaTypes.data.find(
                (vt: any) => vt.name && vt.name.toLowerCase().includes(visaTypeName)
              );
              visaTypeId = matchingVisaType?.id || visaTypes.data[0].id;
              console.log('Selected visa type ID:', visaTypeId);
              visaTypesFetched = true;
            } else {
              console.warn('No visa types returned for country:', countryId);
              console.warn('Response:', visaTypes);
            }
          } catch (visaTypeError: any) {
            console.error('Error fetching visa types:', visaTypeError);
            console.error('Error details:', {
              message: visaTypeError.message,
              response: visaTypeError.response?.data,
              status: visaTypeError.response?.status,
            });
          }
          
          if (!visaTypeId) {
            throw new Error(`No visa types available for selected country. The database may need to be seeded. Please run 'npm run db:seed' in the backend directory.`);
          }

          if (!visaTypeId) {
            throw new Error('Could not determine visa type');
          }

          // Step 3: Create basic application
          console.log('Creating application with country:', countryId, 'visa type:', visaTypeId);
          const createResponse = await apiClient.createApplication(
            countryId,
            visaTypeId,
            'Application created from questionnaire (AI generation unavailable)'
          );

          console.log('Application creation response:', createResponse);

          if (createResponse.success && createResponse.data) {
            console.log('Application created successfully:', createResponse.data.id);
            Alert.alert(
              'Success!',
              'Your application has been created successfully!',
              [
                {
                  text: 'OK',
                  onPress: async () => {
                    // Refresh applications list before navigating
                    const { fetchUserApplications } = useAuthStore.getState();
                    try {
                      await fetchUserApplications();
                    } catch (error) {
                      console.warn('Failed to refresh applications:', error);
                    }
                    // Navigate back to Applications tab
                    navigation?.navigate('MainTabs', { screen: 'Applications' });
                  },
                },
              ],
            );
          } else {
            throw new Error(createResponse.error?.message || 'Failed to create application');
          }
        } catch (fallbackError: any) {
          console.error('Fallback application creation failed:', fallbackError);
          console.error('Error details:', {
            message: fallbackError.message,
            stack: fallbackError.stack,
            questionnaireData,
          });
          
          // Even if fallback fails, questionnaire is complete
          // Show detailed error message to help debug
          const errorMessage = fallbackError.message || 'Unknown error';
          Alert.alert(
            t('questionnaire.complete'),
            t('questionnaire.saveError', { error: errorMessage }),
            [
              {
                text: t('common.ok'),
                onPress: async () => {
                  // Refresh applications list in case something was created
                  const { fetchUserApplications } = useAuthStore.getState();
                  try {
                    await fetchUserApplications();
                  } catch (error) {
                    console.warn('Failed to refresh applications:', error);
                  }
                  // Navigate back to Applications tab
                  navigation?.navigate('MainTabs', { screen: 'Applications' });
                },
              },
            ],
          );
        }
      }
    } catch (error: any) {
      console.error('Questionnaire submission failed:', error);
      setStoreError(error.message);
      Alert.alert(t('common.error'), error.message || t('questionnaire.failed'));
    } finally {
      setLoading(false);
      setStoreLoading(false);
    }
  };

  // Render question based on type
  const renderQuestion = () => {
    const questionId = currentQuestion.id;
    const currentAnswer = answers[questionId as keyof QuestionnaireData];

    // For country question, handle special case
    if (questionId === 'country') {
      return renderCountryQuestion();
    }

    // For boolean questions
    if (currentQuestion.type === 'boolean') {
      return (
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                currentAnswer === option.value && styles.optionCardSelected,
              ]}
              onPress={() => handleSelectAnswer(questionId, option.value)}
              disabled={loading}>
              <View
                style={[
                  styles.optionIcon,
                  currentAnswer === option.value && styles.optionIconSelected,
                ]}>
                <Text style={styles.optionEmoji}>{option.icon}</Text>
              </View>
              <Text
                style={[
                  styles.optionLabel,
                  currentAnswer === option.value && styles.optionLabelSelected,
                ]}>
                {getOptionText(option)}
              </Text>
              {currentAnswer === option.value && (
                <Icon
                  name="checkmark-circle"
                  size={24}
                  color="#4A9EFF"
                  style={styles.checkmark}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    // For single/multiple choice questions
    return (
      <View style={styles.optionsContainer}>
        {currentQuestion.options.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionCard,
              currentAnswer === option.value && styles.optionCardSelected,
            ]}
            onPress={() => handleSelectAnswer(questionId, option.value)}
            disabled={loading}>
            <View
              style={[
                styles.optionIcon,
                currentAnswer === option.value && styles.optionIconSelected,
              ]}>
              <Text style={styles.optionEmoji}>{option.icon}</Text>
            </View>
            <Text
              style={[
                styles.optionLabel,
                currentAnswer === option.value && styles.optionLabelSelected,
              ]}>
              {getOptionText(option)}
            </Text>
            {currentAnswer === option.value && (
              <Icon
                name="checkmark-circle"
                size={24}
                color="#4A9EFF"
                style={styles.checkmark}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render country question with search
  const renderCountryQuestion = () => {
    const currentAnswer = answers.country;

    if (!showCountrySearch) {
      const selectedCountry = countries.find(c => c.id === currentAnswer);
      const displayName = selectedCountry
        ? getTranslatedCountryName(selectedCountry.code, language, selectedCountry.name)
        : null;

      return (
        <View style={styles.optionsContainer}>
          {/* Search button */}
          <TouchableOpacity
            style={[
              styles.searchButton,
              currentAnswer && styles.searchButtonSelected,
            ]}
            onPress={() => setShowCountrySearch(true)}>
            <Icon 
              name="search-outline" 
              size={20} 
              color={currentAnswer ? "#4A9EFF" : "#94A3B8"} 
            />
            <Text style={[
              styles.searchButtonText,
              currentAnswer && styles.searchButtonTextSelected,
            ]}>
              {displayName || t('questionnaire.country.searchPlaceholder')}
            </Text>
            {currentAnswer && (
              <Icon
                name="checkmark-circle"
                size={24}
                color="#4A9EFF"
                style={styles.checkmark}
              />
            )}
          </TouchableOpacity>
        </View>
      );
    }

    // Show country search - filter by translated names
    const filteredCountries = countries.filter(country => {
      const translatedName = getTranslatedCountryName(country.code, language, country.name);
      return translatedName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             country.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
      <View style={styles.countrySearchContainer}>
        <View style={styles.searchHeader}>
          <TouchableOpacity
            style={styles.searchBackButton}
            onPress={() => {
              setShowCountrySearch(false);
              setSearchQuery('');
            }}>
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder={t('questionnaire.country.searchPlaceholder')}
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>

        <ScrollView style={styles.countryList}>
          {isLoadingCountries ? (
            <ActivityIndicator
              size="large"
              color="#4A9EFF"
              style={{marginTop: 20}}
            />
          ) : filteredCountries.length === 0 ? (
            <Text style={styles.noResultsText}>
              {t('home.noCountriesFound')}
            </Text>
          ) : (
            filteredCountries.map(country => (
              <TouchableOpacity
                key={country.id}
                style={styles.countryItem}
                onPress={() => {
                  handleSelectAnswer('country', country.id);
                  setShowCountrySearch(false);
                  setSearchQuery('');
                }}>
                <Text style={styles.countryFlag}>{country.flagEmoji}</Text>
                <Text style={styles.countryName}>
                  {getTranslatedCountryName(country.code, language, country.name)}
                </Text>
                {currentAnswer === country.id && (
                  <Icon
                    name="checkmark-circle"
                    size={24}
                    color="#4A9EFF"
                    style={styles.checkmark}
                  />
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  // Check if current question is answered
  const isCurrentQuestionAnswered = () => {
    const questionId = currentQuestion.id;
    const answer = answers[questionId as keyof QuestionnaireData];
    return answer !== undefined && answer !== null && answer !== '';
  };

  return (
    <View style={styles.container}>
      <View style={styles.gradientBackground}>
        {/* Background Pattern */}
        <View style={styles.backgroundPattern}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Icon name="clipboard-outline" size={32} color="#4A9EFF" />
              </View>
              <Text style={styles.headerTitle}>Visa Plan</Text>
              <Text style={styles.headerSubtitle}>
                Help us find the best visa type for you
              </Text>
            </View>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressSteps}>
                {Array.from({length: totalSteps}).map((_, index) => (
                  <View
                    key={`step-${index}`}
                    style={[
                      styles.progressStep,
                      index <= currentStep && styles.progressStepActive,
                      index < currentStep && styles.progressStepCompleted,
                    ]}>
                    {index < currentStep ? (
                      <Icon name="checkmark" size={14} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.progressStepText,
                          index === currentStep &&
                            styles.progressStepTextActive,
                        ]}>
                        {index + 1}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
              <Text style={styles.progressText}>
                {currentStep + 1} of {totalSteps}
              </Text>
            </View>

            {/* Question Card */}
            <Animated.View
              style={[
                styles.contentCard,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}>
              <View style={styles.questionContainer}>
                <Text style={styles.questionTitle}>
                  {getQuestionText('title')}
                </Text>
                {getQuestionText('description') && (
                  <Text style={styles.questionSubtitle}>
                    {getQuestionText('description')}
                  </Text>
                )}

                {/* Render question options */}
                {renderQuestion()}
              </View>
            </Animated.View>

            {/* Navigation Buttons */}
            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBack}
                disabled={loading}>
                <Icon name="arrow-back" size={20} color="#FFFFFF" />
                <Text style={styles.backButtonText}>{t('common.back')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.continueButton,
                  (!isCurrentQuestionAnswered() || loading) &&
                    styles.continueButtonDisabled,
                ]}
                onPress={handleContinue}
                disabled={!isCurrentQuestionAnswered() || loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.continueButtonText}>
                      {currentStep === totalSteps - 1 ? t('questionnaire.complete') : t('questionnaire.continue')}
                    </Text>
                    <Icon
                      name={
                        currentStep === totalSteps - 1
                          ? 'checkmark'
                          : 'arrow-forward'
                      }
                      size={20}
                      color="#FFFFFF"
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
    backgroundColor: '#0A1929',
  },
  backgroundPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.1)',
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -50,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.3)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  progressSteps: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(74, 158, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: 'rgba(74, 158, 255, 0.3)',
    borderColor: '#4A9EFF',
  },
  progressStepCompleted: {
    backgroundColor: '#4A9EFF',
    borderColor: '#4A9EFF',
  },
  progressStepText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  progressStepTextActive: {
    color: '#FFFFFF',
  },
  progressText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  contentCard: {
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  questionContainer: {
    gap: 20,
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 28,
  },
  questionSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    gap: 12,
  },
  optionCardSelected: {
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    borderColor: '#4A9EFF',
    borderWidth: 2,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIconSelected: {
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#E2E8F0',
  },
  optionLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  checkmark: {
    marginLeft: 'auto',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    gap: 12,
  },
  searchButtonSelected: {
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    borderColor: '#4A9EFF',
    borderWidth: 2,
  },
  searchButtonText: {
    flex: 1,
    fontSize: 15,
    color: '#94A3B8',
  },
  searchButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  countrySearchContainer: {
    maxHeight: 400,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  searchBackButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  countryList: {
    maxHeight: 300,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    gap: 12,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryName: {
    flex: 1,
    fontSize: 15,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  noResultsText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 20,
  },
  navigationButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 114, 128, 0.3)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.4)',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A9EFF',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#4A9EFF',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonDisabled: {
    opacity: 0.4,
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
