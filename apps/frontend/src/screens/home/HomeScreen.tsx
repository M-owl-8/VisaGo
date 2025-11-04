import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/auth';
import { useVisaStore } from '../../store/visa';

interface HomeScreenProps {
  navigation?: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const user = useAuthStore((state) => state.user);
  const {
    fetchCountries,
    filteredCountries,
    isLoadingCountries,
    setSearchQuery,
    searchQuery,
    selectCountry,
  } = useVisaStore();
  
  const [showCountriesList, setShowCountriesList] = useState(false);

  useEffect(() => {
    // Load countries on mount
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      await fetchCountries();
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };

  const handleCountrySelect = async (country: any) => {
    try {
      await selectCountry(country);
      setShowCountriesList(false);
      navigation?.navigate('VisaSelection', {
        countryId: country.id,
      });
    } catch (error) {
      console.error('Error selecting country:', error);
    }
  };

  const handleStartApplication = () => {
    setShowCountriesList(true);
  };

  const renderCountryItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.countryItem}
      onPress={() => handleCountrySelect(item)}
    >
      <Text style={styles.countryItemFlag}>{item.flagEmoji}</Text>
      <View style={styles.countryItemContent}>
        <Text style={styles.countryItemName}>{item.name}</Text>
        <Text style={styles.countryItemCode}>{item.code}</Text>
      </View>
      <Icon name="chevron-forward" size={20} color="#1E88E5" />
    </TouchableOpacity>
  );

  // If countries list is shown, display it
  if (showCountriesList) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.listHeader}>
          <TouchableOpacity
            onPress={() => setShowCountriesList(false)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.listHeaderTitle}>Select Destination</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search countries..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Countries List */}
        {isLoadingCountries ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E88E5" />
          </View>
        ) : (
          <FlatList
            data={filteredCountries}
            renderItem={renderCountryItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.countriesListContainer}
          />
        )}
      </View>
    );
  }

  const features = [
    {
      icon: '🌍',
      title: 'Browse Countries',
      desc: 'Explore visa requirements',
      onPress: handleStartApplication,
    },
    { icon: '📄', title: 'Track Documents', desc: 'Manage your documents' },
    { icon: '💰', title: 'Payment Status', desc: 'Monitor payments' },
    { icon: '🤖', title: 'AI Assistant', desc: 'Get visa guidance' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Welcome Header */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>
          Welcome back, {user?.firstName || 'User'}! 👋
        </Text>
        <Text style={styles.subText}>Let's help you with your visa application</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Applications</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Documents</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0%</Text>
          <Text style={styles.statLabel}>Progress</Text>
        </View>
      </View>

      {/* Features Grid */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <TouchableOpacity
              key={index}
              style={styles.featureCard}
              activeOpacity={0.7}
              onPress={feature.onPress}
            >
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Get Started Section */}
      <View style={styles.getStartedSection}>
        <View style={styles.getStartedCard}>
          <Icon name="star" size={32} color="#FFA726" />
          <Text style={styles.getStartedTitle}>Get Started</Text>
          <Text style={styles.getStartedDesc}>
            Create your first visa application and start tracking your documents
          </Text>
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleStartApplication}
          >
            <Text style={styles.getStartedButtonText}>Start New Application</Text>
            <Icon name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.emptyState}>
          <Icon name="document-outline" size={48} color="#DDD" />
          <Text style={styles.emptyStateText}>No recent activity</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  welcomeSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#1E88E5',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    color: '#E3F2FD',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  featuresSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 12,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  getStartedSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  getStartedCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FFA726',
  },
  getStartedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginVertical: 8,
  },
  getStartedDesc: {
    fontSize: 13,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 16,
  },
  getStartedButton: {
    flexDirection: 'row',
    backgroundColor: '#FFA726',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    gap: 8,
  },
  getStartedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activitySection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },

  // Countries List Styles
  listHeader: {
    backgroundColor: '#1E88E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 14,
    color: '#212121',
  },

  countriesListContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  countryItemFlag: {
    fontSize: 32,
  },
  countryItemContent: {
    flex: 1,
  },
  countryItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  countryItemCode: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
});