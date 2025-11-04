import { create } from 'zustand';
import { apiClient } from '../services/api';

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

interface VisaState {
  // Data
  countries: Country[];
  selectedCountry: Country | null;
  selectedVisaType: VisaType | null;
  visaTypesForCountry: VisaType[];
  
  // Loading states
  isLoadingCountries: boolean;
  isLoadingVisaTypes: boolean;
  
  // Search
  searchQuery: string;
  filteredCountries: Country[];
  
  // Actions
  fetchCountries: (search?: string) => Promise<void>;
  selectCountry: (country: Country) => Promise<void>;
  selectVisaType: (visaType: VisaType) => void;
  fetchVisaTypes: (countryId: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  clearSelection: () => void;
}

export const useVisaStore = create<VisaState>((set, get) => ({
  countries: [],
  selectedCountry: null,
  selectedVisaType: null,
  visaTypesForCountry: [],
  isLoadingCountries: false,
  isLoadingVisaTypes: false,
  searchQuery: '',
  filteredCountries: [],

  // Fetch all countries
  fetchCountries: async (search?: string) => {
    try {
      set({ isLoadingCountries: true });
      const response = await apiClient.getCountries(search);
      
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch countries');
      }

      const countries = response.data;
      set({
        countries,
        filteredCountries: search 
          ? countries.filter(c => 
              c.name.toLowerCase().includes(search.toLowerCase()) ||
              c.code.toLowerCase().includes(search.toLowerCase())
            )
          : countries,
      });
    } catch (error) {
      console.error('Error fetching countries:', error);
      throw error;
    } finally {
      set({ isLoadingCountries: false });
    }
  },

  // Select a country and fetch its visa types
  selectCountry: async (country: Country) => {
    try {
      set({ selectedCountry: country, selectedVisaType: null });
      await get().fetchVisaTypes(country.id);
    } catch (error) {
      console.error('Error selecting country:', error);
      throw error;
    }
  },

  // Fetch visa types for a country
  fetchVisaTypes: async (countryId: string) => {
    try {
      set({ isLoadingVisaTypes: true });
      const response = await apiClient.getVisaTypes(countryId);
      
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch visa types');
      }

      set({ visaTypesForCountry: response.data });
    } catch (error) {
      console.error('Error fetching visa types:', error);
      throw error;
    } finally {
      set({ isLoadingVisaTypes: false });
    }
  },

  // Select a visa type
  selectVisaType: (visaType: VisaType) => {
    set({ selectedVisaType: visaType });
  },

  // Update search query
  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    const { countries } = get();
    
    if (!query) {
      set({ filteredCountries: countries });
      return;
    }

    const filtered = countries.filter(country =>
      country.name.toLowerCase().includes(query.toLowerCase()) ||
      country.code.toLowerCase().includes(query.toLowerCase())
    );
    
    set({ filteredCountries: filtered });
  },

  // Clear selection
  clearSelection: () => {
    set({
      selectedCountry: null,
      selectedVisaType: null,
      visaTypesForCountry: [],
      searchQuery: '',
    });
  },
}));