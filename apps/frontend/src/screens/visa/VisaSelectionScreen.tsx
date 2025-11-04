import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useVisaStore } from '../../store/visa';

interface VisaSelectionScreenProps {
  route?: any;
  navigation?: any;
}

export default function VisaSelectionScreen({
  route,
  navigation,
}: VisaSelectionScreenProps) {
  const {
    selectedCountry,
    visaTypesForCountry,
    isLoadingVisaTypes,
    selectVisaType,
  } = useVisaStore();

  useEffect(() => {
    if (!selectedCountry) {
      navigation?.goBack();
    }
  }, [selectedCountry, navigation]);

  const handleSelectVisa = (visaType: any) => {
    selectVisaType(visaType);
    navigation?.navigate('VisaOverview', {
      countryId: selectedCountry?.id,
      visaTypeId: visaType.id,
    });
  };

  const renderVisaTypeCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.visaCard}
      onPress={() => handleSelectVisa(item)}
      activeOpacity={0.7}
    >
      <View style={styles.visaCardHeader}>
        <Text style={styles.visaTypeName}>{item.name}</Text>
        <View style={styles.feeBadge}>
          <Text style={styles.feeAmount}>${item.fee}</Text>
        </View>
      </View>

      {item.description && (
        <Text style={styles.visaDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.detailsContainer}>
        <View style={styles.detailItem}>
          <Icon name="calendar" size={16} color="#1E88E5" />
          <Text style={styles.detailText}>{item.processingDays} days</Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="time" size={16} color="#1E88E5" />
          <Text style={styles.detailText}>{item.validity}</Text>
        </View>
      </View>

      <View style={styles.selectButton}>
        <Text style={styles.selectButtonText}>Select</Text>
        <Icon name="arrow-forward" size={16} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="document-outline" size={64} color="#DDD" />
      <Text style={styles.emptyTitle}>No Visa Types Available</Text>
      <Text style={styles.emptySubtitle}>
        No visa types found for this country. Try another country.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Select Visa Type</Text>
          {selectedCountry && (
            <Text style={styles.headerSubtitle}>
              {selectedCountry.flagEmoji} {selectedCountry.name}
            </Text>
          )}
        </View>
      </View>

      {/* Loading State */}
      {isLoadingVisaTypes ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <Text style={styles.loadingText}>Loading visa types...</Text>
        </View>
      ) : (
        /* Visa Types List */
        <FlatList
          data={visaTypesForCountry}
          renderItem={renderVisaTypeCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          scrollEnabled={visaTypesForCountry.length > 0}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  // Header
  header: {
    backgroundColor: '#1E88E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
    marginTop: 2,
  },

  // List
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },

  // Visa Card
  visaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  visaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  visaTypeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    flex: 1,
  },
  feeBadge: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginLeft: 8,
  },
  feeAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E88E5',
  },

  // Description
  visaDescription: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 12,
    lineHeight: 18,
  },

  // Details
  detailsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

  // Select Button
  selectButton: {
    flexDirection: 'row',
    backgroundColor: '#1E88E5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#757575',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 8,
  },
});