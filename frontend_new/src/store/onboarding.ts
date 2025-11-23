/**
 * Onboarding Store
 * Manages questionnaire state and progress
 */

import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  QuestionnaireData,
  AIGeneratedApplication,
} from '../types/questionnaire';
import {questionnaireQuestions} from '../data/questionnaireQuestions';

interface OnboardingState {
  currentStep: number;
  totalSteps: number;
  answers: Partial<QuestionnaireData>;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentStep: (step: number) => void;
  setAnswer: (key: keyof QuestionnaireData, value: any) => void;
  nextStep: () => void;
  previousStep: () => void;
  resetQuestionnaire: () => void;
  saveProgress: () => Promise<void>;
  loadProgress: () => Promise<void>;
  clearProgress: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getProgress: () => number;
  loadFromUserBio: (bio: string | null | undefined) => void;
}

const STORAGE_KEY = '@questionnaire_progress';

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  currentStep: 0,
  totalSteps: questionnaireQuestions.length, // Use actual questionnaire length
  answers: {},
  isLoading: false,
  error: null,

  setCurrentStep: (step: number) => {
    set({currentStep: step});
  },

  setAnswer: (key: keyof QuestionnaireData, value: any) => {
    set(state => ({
      answers: {
        ...state.answers,
        [key]: value,
      },
    }));
    // Auto-save progress
    get().saveProgress();
  },

  // Load questionnaire data from user bio
  // Supports both legacy format and new format with summary
  loadFromUserBio: (bio: string | null | undefined) => {
    if (!bio) return;
    try {
      const parsed = JSON.parse(bio);

      // Check if it's the new format with summary
      if (parsed._hasSummary && parsed.summary) {
        // New format: extract legacy fields for backwards compatibility
        // Remove metadata fields
        const {summary, _version, _hasSummary, ...legacyData} = parsed;

        // Use legacy data for populating answers (for UI compatibility)
        set(state => ({
          answers: {
            ...state.answers,
            ...legacyData,
          },
        }));
      } else {
        // Legacy format: use as-is
        set(state => ({
          answers: {
            ...state.answers,
            ...parsed,
          },
        }));
      }
    } catch (error) {
      console.error('Failed to parse questionnaire data from bio:', error);
    }
  },

  nextStep: () => {
    set(state => ({
      currentStep: Math.min(state.currentStep + 1, state.totalSteps - 1),
    }));
  },

  previousStep: () => {
    set(state => ({
      currentStep: Math.max(state.currentStep - 1, 0),
    }));
  },

  resetQuestionnaire: () => {
    set({
      currentStep: 0,
      answers: {},
      error: null,
    });
  },

  saveProgress: async () => {
    try {
      const {answers, currentStep} = get();
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({answers, currentStep}),
      );
    } catch (error) {
      console.error('Failed to save questionnaire progress:', error);
    }
  },

  loadProgress: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const {answers, currentStep} = JSON.parse(saved);
        set({answers, currentStep});
      }
    } catch (error) {
      console.error('Failed to load questionnaire progress:', error);
    }
  },

  clearProgress: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      set({
        currentStep: 0,
        answers: {},
        error: null,
      });
    } catch (error) {
      console.error('Failed to clear questionnaire progress:', error);
    }
  },

  setLoading: (loading: boolean) => {
    set({isLoading: loading});
  },

  setError: (error: string | null) => {
    set({error});
  },

  getProgress: () => {
    const {currentStep, totalSteps} = get();
    return Math.round((currentStep / totalSteps) * 100);
  },
}));
