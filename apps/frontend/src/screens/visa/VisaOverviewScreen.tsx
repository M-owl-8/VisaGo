import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { apiClient } from '../../services/api';
import { useVisaStore } from '../../store/visa';

interface VisaOverviewScreenProps {
  route?: any;
  navigation?: any;
}

interface VisaTypeDetails {
  id: string;
  countryId: string;
  name: string;
  description?: string;
  processingDays: number;
  validity: string;
  fee: number;
  requirements?: string;
  documentTypes: string[];
  country?: {
    id: string;
    name: string;
    code: string;
    flagEmoji: string;
    description?: string;
  };
}

export default function VisaOverviewScreen({
  route,
  navigation,
}: VisaOverviewScreenProps) {
  const [visaDetails, setVisaDetails] = useState<VisaTypeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingApplication, setIsCreatingApplication] = useState(false);
  const { selectedVisaType, selectedCountry } = useVisaStore();

  const visaTypeId = route?.params?.visaTypeId;
  const countryId = route?.params?.countryId;

  useEffect(() => {
    loadVisaDetails();
  }, [visaTypeId]);

  const loadVisaDetails = async () => {
    if (!visaTypeId) {
      navigation?.goBack();
      return;
    }

    try {
      setIsLoading(true);
      // Fetch full visa type details with country info
      const response = await apiClient.getVisaTypes(countryId || '');
      
      if (response.success && response.data) {
        const visa = response.data.find((v: any) => v.id === visaTypeId);
        if (visa) {
          setVisaDetails(visa);
        }
      }
    } catch (error) {
      console.error('Error loading visa details:', error);
      Alert.alert('Error', 'Failed to load visa details');
    } finally {
      setIsLoading(false);
    }
  };

  const parseDocumentTypes = (documentTypes: any): string[] => {
    if (typeof documentTypes === 'string') {
      try {
        return JSON.parse(documentTypes);
      } catch {
        return documentTypes.split(',').map((d: string) => d.trim());
      }
    }
    return Array.isArray(documentTypes) ? documentTypes : [];
  };

  const handlePaymentAndContinue = async () => {
    if (!visaDetails) return;

    try {
      setIsCreatingApplication(true);

      // Create visa application
      const appResponse = await apiClient.createApplication(
        visaDetails.countryId,
        visaDetails.id,
        `Visa application for ${visaDetails.name}`
      );

      if (!appResponse.success || !appResponse.data) {
        throw new Error('Failed to create application');
      }

      const applicationId = appResponse.data.id;

      // Navigate to payment screen
      navigation?.navigate('Payment', {
        applicationId,
        amount: visaDetails.fee,
        visaTypeName: visaDetails.name,
      });
    } catch (error) {
      console.error('Error creating application:', error);
      Alert.alert(
        'Error',
        'Failed to create application. Please try again.'
      );
    } finally {
      setIsCreatingApplication(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <Text style={styles.loadingText}>Loading visa details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!visaDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>Visa Not Found</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const documentTypes = parseDocumentTypes(visaDetails.documentTypes);
  const country = selectedCountry;

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
        <Text style={styles.headerTitle}>Visa Overview</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Country & Visa Header Card */}
        <View style={styles.heroCard}>
          {country && (
            <Text style={styles.countryFlag}>{country.flagEmoji}</Text>
          )}
          <Text style={styles.countryName}>{country?.name || 'Country'}</Text>
          <Text style={styles.visaTypeName}>{visaDetails.name}</Text>
        </View>

        {/* Fee & Quick Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Icon name="card-outline" size={24} color="#1E88E5" />
            <Text style={styles.infoLabel}>Fee</Text>
            <Text style={styles.infoValue}>${visaDetails.fee}</Text>
          </View>
          <View style={styles.infoCard}>
            <Icon name="calendar-outline" size={24} color="#1E88E5" />
            <Text style={styles.infoLabel}>Processing</Text>
            <Text style={styles.infoValue}>
              {visaDetails.processingDays} days
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Icon name="time-outline" size={24} color="#1E88E5" />
            <Text style={styles.infoLabel}>Validity</Text>
            <Text style={styles.infoValue}>{visaDetails.validity}</Text>
          </View>
        </View>

        {/* Description */}
        {visaDetails.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Visa</Text>
            <Text style={styles.description}>{visaDetails.description}</Text>
          </View>
        )}

        {/* Required Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Documents</Text>
          <View style={styles.documentsList}>
            {documentTypes.length > 0 ? (
              documentTypes.map((doc, index) => (
                <View key={index} style={styles.documentItem}>
                  <Icon name="document-outline" size={20} color="#1E88E5" />
                  <Text style={styles.documentName}>
                    {doc.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDocuments}>
                No specific documents listed
              </Text>
            )}
          </View>
        </View>

        {/* Requirements */}
        {visaDetails.requirements && visaDetails.requirements !== '{}' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Requirements</Text>
            <Text style={styles.requirementsText}>
              {typeof visaDetails.requirements === 'string'
                ? visaDetails.requirements
                : JSON.stringify(visaDetails.requirements)}
            </Text>
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerSection}>
          <Icon name="information-circle-outline" size={20} color="#FF9800" />
          <Text style={styles.disclaimerText}>
            This is general information. Please verify all requirements with the
            official embassy or consulate before submitting your application.
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Action Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.payButton,
            isCreatingApplication && styles.payButtonDisabled,
          ]}
          onPress={handlePaymentAndContinue}
          disabled={isCreatingApplication}
        >
          {isCreatingApplication ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Icon name="card-outline" size={20} color="#FFFFFF" />
              <Text style={styles.payButtonText}>
                Pay ${visaDetails.fee} & Continue
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  countryFlag: {
    fontSize: 48,
    marginBottom: 12,
  },
  countryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#757575',
    marginBottom: 4,
  },
  visaTypeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
    textAlign: 'center',
  },

  // Info Grid
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
    marginTop: 4,
    textAlign: 'center',
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 12,
  },

  // Description
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  // Documents
  documentsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  documentName: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '500',
  },
  noDocuments: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 8,
  },

  // Requirements
  requirementsText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
  },

  // Disclaimer
  disclaimerSection: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
    gap: 10,
    marginBottom: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#F57C00',
    lineHeight: 16,
  },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  payButton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    fontSize: 16,
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

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 16,
  },
  errorButton: {
    backgroundColor: '#F44336',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 24,
  },
  errorButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});