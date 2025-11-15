/**
 * Onboarding Screen
 * Welcome screen with nationality and destination selection
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useVisaStore } from '../../store/visa';
import { useAuthStore } from '../../store/auth';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api';

interface OnboardingScreenProps {
  navigation?: any;
}

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { fetchCountries, filteredCountries, isLoadingCountries } = useVisaStore();
  
  const [step, setStep] = useState<'welcome' | 'nationality' | 'destination'>('welcome');
  const [selectedNationality, setSelectedNationality] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (step === 'destination') {
      fetchCountries();
    }
  }, [step]);

  const handleWelcomeNext = () => {
    setStep('nationality');
  };

  const handleNationalitySelect = async (countryCode: string) => {
    setSelectedNationality(countryCode);
    
    // Save nationality to user profile
    try {
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.id) {
        await apiClient.updateUserProfile(currentUser.id, { 
          nationality: countryCode 
        });
      }
    } catch (error) {
      console.warn('Failed to save nationality:', error);
      // Continue anyway - not critical
    }
    
    setStep('destination');
  };

  const handleDestinationSelect = (country: any) => {
    // Navigate to visa selection
    navigation?.navigate('VisaSelection', {
      countryId: country.id,
      nationality: selectedNationality,
    });
  };

  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <View style={styles.welcomeContent}>
        <Icon name="airplane" size={80} color="#1E88E5" />
        <Text style={styles.welcomeTitle}>Welcome to VisaBuddy</Text>
        <Text style={styles.welcomeSubtitle}>
          Your AI-powered visa application assistant
        </Text>
        <Text style={styles.welcomeDescription}>
          We'll help you find visa requirements, prepare documents, and complete your application.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleWelcomeNext}
      >
        <Text style={styles.primaryButtonText}>Get Started</Text>
        <Icon name="arrow-forward" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const renderNationalitySelection = () => (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep('welcome')}>
          <Icon name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Your Nationality</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.stepDescription}>
        This helps us provide country-specific visa requirements
      </Text>

      <FlatList
        data={filteredCountries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.countryItem,
              selectedNationality === item.code && styles.countryItemSelected,
            ]}
            onPress={() => handleNationalitySelect(item.code)}
          >
            <Text style={styles.countryFlag}>{item.flagEmoji}</Text>
            <View style={styles.countryItemContent}>
              <Text style={styles.countryName}>{item.name}</Text>
              <Text style={styles.countryCode}>{item.code}</Text>
            </View>
            {selectedNationality === item.code && (
              <Icon name="checkmark-circle" size={24} color="#1E88E5" />
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContainer}
      />

      {selectedNationality && (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setStep('destination')}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
          <Icon name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderDestinationSelection = () => (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep('nationality')}>
          <Icon name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Destination</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.stepDescription}>
        Where do you want to travel?
      </Text>

      {isLoadingCountries ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E88E5" />
        </View>
      ) : (
        <FlatList
          data={filteredCountries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.countryItem}
              onPress={() => handleDestinationSelect(item)}
            >
              <Text style={styles.countryFlag}>{item.flagEmoji}</Text>
              <View style={styles.countryItemContent}>
                <Text style={styles.countryName}>{item.name}</Text>
                <Text style={styles.countryCode}>{item.code}</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#1E88E5" />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {step === 'welcome' && renderWelcome()}
      {step === 'nationality' && renderNationalitySelection()}
      {step === 'destination' && renderDestinationSelection()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212121',
    marginTop: 24,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#1E88E5',
    marginTop: 8,
    textAlign: 'center',
  },
  welcomeDescription: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  stepDescription: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 12,
  },
  countryItemSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#1E88E5',
  },
  countryFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  countryItemContent: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  countryCode: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#1E88E5',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 'auto',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});


