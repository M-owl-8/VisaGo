import {create} from 'zustand';
import {apiClient} from '../services/api';

// Change summary (2025-11-24): Preserve the full country list even when performing server-side searches so questionnaire country picker always shows every destination.

interface Country {
  id: string;
  name: string;
  code: string;
  flagEmoji: string;
  description?: string;
  requirements?: string;
}

interface VisaType {
  id: string;
  countryId: string;
  name: string;
  description?: string;
  processingDays: number;
  validity: string;
  fee: number;
  requirements?: string;
  documentTypes: string[];
}

interface VisaTypeOption {
  name: string;
  availableInCountries: number;
  sampleCountries: Array<{
    id: string;
    name: string;
    code: string;
    flagEmoji: string;
  }>;
}

interface CountryWithVisaType extends Country {
  visaType: {
    id: string;
    name: string;
    description?: string;
    processingDays: number;
    validity: string;
    fee: number;
    requirements?: string;
    documentTypes: string;
  };
}

interface VisaState {
  // Data
  countries: Country[];
  selectedCountry: Country | null;
  selectedVisaType: VisaType | null;
  selectedVisaTypeName: string | null; // For visa type first flow
  visaTypesForCountry: VisaType[];
  allVisaTypeOptions: VisaTypeOption[]; // All available visa types
  countriesForVisaType: CountryWithVisaType[]; // Countries offering selected visa type

  // Loading states
  isLoadingCountries: boolean;
  isLoadingVisaTypes: boolean;
  isLoadingVisaTypeOptions: boolean;
  isLoadingCountriesForVisaType: boolean;

  // Search
  searchQuery: string;
  filteredCountries: Country[];

  // Actions
  fetchCountries: (search?: string) => Promise<void>;
  selectCountry: (country: Country) => Promise<void>;
  selectVisaType: (visaType: VisaType) => void;
  fetchVisaTypes: (countryId: string) => Promise<void>;
  setSearchQuery: (query: string) => Promise<void>;
  clearSelection: () => void;

  // New actions for visa type first flow
  fetchAllVisaTypes: (search?: string) => Promise<void>;
  selectVisaTypeName: (visaTypeName: string) => Promise<void>;
  fetchCountriesByVisaType: (visaTypeName: string) => Promise<void>;
  selectCountryForVisaType: (country: CountryWithVisaType) => void;
}

// Debounce timer for search
let searchDebounceTimer: NodeJS.Timeout | null = null;

export const useVisaStore = create<VisaState>((set, get) => ({
  countries: [],
  selectedCountry: null,
  selectedVisaType: null,
  selectedVisaTypeName: null,
  visaTypesForCountry: [],
  allVisaTypeOptions: [],
  countriesForVisaType: [],
  isLoadingCountries: false,
  isLoadingVisaTypes: false,
  isLoadingVisaTypeOptions: false,
  isLoadingCountriesForVisaType: false,
  searchQuery: '',
  filteredCountries: [],

  // Fetch all countries
  // IMPORTANT: Always fetch ALL countries (no limit). The questionnaire must show all 8 destination countries.
  fetchCountries: async (search?: string) => {
    try {
      set({isLoadingCountries: true});
      const response = await apiClient.getCountries(search);

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch countries');
      }

      const countries = response.data;

      // When searching, update filtered list but preserve the full master list
      if (search) {
        set(state => ({
          // Always preserve the full master list - never overwrite with search results
          countries: state.countries.length > 0 ? state.countries : countries,
          filteredCountries: countries, // Search results for display
        }));
        return;
      }

      // No search: Load ALL countries into both master list and filtered list
      // This ensures the questionnaire always has access to all 8 countries
      // HIGH PRIORITY FIX: Verify we have all 8 countries - log warning if not
      if (countries.length < 8) {
        console.warn(
          '[VisaStore] Expected 8 countries, but received:',
          countries.length,
          'countries',
        );
      }
      set({
        countries, // Master list: ALL countries from backend (should be 8)
        filteredCountries: countries, // Display list: ALL countries (no filter applied)
      });
    } catch (error) {
      console.error('Error fetching countries:', error);
      throw error;
    } finally {
      set({isLoadingCountries: false});
    }
  },

  // Select a country and fetch its visa types
  selectCountry: async (country: Country) => {
    try {
      set({selectedCountry: country, selectedVisaType: null});
      await get().fetchVisaTypes(country.id);
    } catch (error) {
      console.error('Error selecting country:', error);
      throw error;
    }
  },

  // Fetch visa types for a country
  fetchVisaTypes: async (countryId: string) => {
    try {
      set({isLoadingVisaTypes: true});
      const response = await apiClient.getVisaTypes(countryId);

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch visa types');
      }

      set({visaTypesForCountry: response.data});
    } catch (error) {
      console.error('Error fetching visa types:', error);
      throw error;
    } finally {
      set({isLoadingVisaTypes: false});
    }
  },

  // Select a visa type
  selectVisaType: (visaType: VisaType) => {
    set({selectedVisaType: visaType});
  },

  // Update search query - filters locally and triggers API call if needed
  // IMPORTANT: When search is cleared, show ALL countries (all 8). Never limit to 5.
  setSearchQuery: async (query: string) => {
    set({searchQuery: query});
    const {countries} = get();

    // If we have countries, filter locally first for instant feedback
    if (countries.length > 0) {
      if (!query || !query.trim()) {
        // No search query: show ALL countries (all 8 destination countries)
        set({filteredCountries: countries});
      } else {
        // Search query: filter by name or code, but show ALL matching results (no limit)
        const filtered = countries.filter(
          country =>
            country.name.toLowerCase().includes(query.toLowerCase()) ||
            country.code.toLowerCase().includes(query.toLowerCase()),
        );
        set({filteredCountries: filtered});
      }
    }

    // Clear existing debounce timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }

    // Debounce API call to avoid too many requests
    searchDebounceTimer = setTimeout(async () => {
      if (query && query.length >= 2) {
        // Trigger API call with search query for better results
        try {
          await get().fetchCountries(query);
        } catch (error) {
          console.error('Error searching countries:', error);
          // If API call fails, keep local filtering
        }
      } else if (!query) {
        // If search is cleared, reload all countries
        try {
          await get().fetchCountries();
        } catch (error) {
          console.error('Error loading countries:', error);
        }
      }
      searchDebounceTimer = null;
    }, 300); // 300ms debounce
  },

  // Clear selection
  clearSelection: () => {
    set({
      selectedCountry: null,
      selectedVisaType: null,
      selectedVisaTypeName: null,
      visaTypesForCountry: [],
      countriesForVisaType: [],
      searchQuery: '',
    });
  },

  // New: Fetch all visa type options (for visa type first flow)
  fetchAllVisaTypes: async (search?: string) => {
    try {
      set({isLoadingVisaTypeOptions: true});
      const response = await apiClient.getAllVisaTypes(search);

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch visa types');
      }

      set({allVisaTypeOptions: response.data});
    } catch (error) {
      console.error('Error fetching visa types:', error);
      throw error;
    } finally {
      set({isLoadingVisaTypeOptions: false});
    }
  },

  // New: Select visa type name and fetch countries
  selectVisaTypeName: async (visaTypeName: string) => {
    try {
      set({
        selectedVisaTypeName: visaTypeName,
        selectedCountry: null,
        selectedVisaType: null,
      });
      await get().fetchCountriesByVisaType(visaTypeName);
    } catch (error) {
      console.error('Error selecting visa type:', error);
      throw error;
    }
  },

  // New: Fetch countries that offer a specific visa type
  fetchCountriesByVisaType: async (visaTypeName: string) => {
    try {
      set({isLoadingCountriesForVisaType: true});
      const response = await apiClient.getCountriesByVisaType(visaTypeName);

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch countries for visa type');
      }

      set({countriesForVisaType: response.data});
    } catch (error) {
      console.error('Error fetching countries for visa type:', error);
      throw error;
    } finally {
      set({isLoadingCountriesForVisaType: false});
    }
  },

  // New: Select country for visa type (completes the selection)
  selectCountryForVisaType: (country: CountryWithVisaType) => {
    set({
      selectedCountry: {
        id: country.id,
        name: country.name,
        code: country.code,
        flagEmoji: country.flagEmoji,
        description: country.description,
        requirements: country.requirements,
      },
      selectedVisaType: {
        id: country.visaType.id,
        countryId: country.id,
        name: country.visaType.name,
        description: country.visaType.description,
        processingDays: country.visaType.processingDays,
        validity: country.visaType.validity,
        fee: country.visaType.fee,
        requirements: country.visaType.requirements,
        documentTypes: JSON.parse(country.visaType.documentTypes || '[]'),
      },
    });
  },
}));
