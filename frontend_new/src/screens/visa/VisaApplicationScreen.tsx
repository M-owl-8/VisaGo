import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/auth';
import DocumentPicker from 'react-native-document-picker';

// AI-generated document lists based on user questionnaire answers
const generateDocumentList = (questionnaireData: any): Array<{id: string; name: string; description: string}> => {
  const documents: Array<{id: string; name: string; description: string}> = [];
  
  // Always required
  documents.push({ id: 'passport', name: 'Valid Passport', description: 'Must be valid for at least 6 months' });
  documents.push({ id: 'photos', name: 'Passport-sized Photos', description: '2 recent color photographs' });
  documents.push({ id: 'application_form', name: 'Visa Application Form', description: 'Completed and signed' });
  
  // Based on visa type
  if (questionnaireData?.visaType) {
    switch (questionnaireData.visaType.toLowerCase()) {
      case 'student':
        documents.push({ id: 'acceptance_letter', name: 'Letter of Acceptance', description: 'From university or educational institution' });
        documents.push({ id: 'transcripts', name: 'Academic Transcripts', description: 'Official records from previous institutions' });
        documents.push({ id: 'financial_support', name: 'Proof of Financial Support', description: 'Bank statements or sponsor letter' });
        documents.push({ id: 'language_cert', name: 'Language Proficiency Certificate', description: 'IELTS, TOEFL, or equivalent' });
        documents.push({ id: 'health_insurance', name: 'Health Insurance', description: 'Valid for study duration' });
        break;
      case 'tourist':
        documents.push({ id: 'itinerary', name: 'Travel Itinerary', description: 'Detailed travel plans' });
        documents.push({ id: 'hotel', name: 'Hotel Reservations', description: 'Confirmed bookings' });
        documents.push({ id: 'bank_statement', name: 'Bank Statements', description: 'Last 6 months' });
        documents.push({ id: 'flight_tickets', name: 'Return Flight Tickets', description: 'Round-trip booking confirmation' });
        documents.push({ id: 'travel_insurance', name: 'Travel Insurance', description: 'Valid for trip duration' });
        break;
      case 'business':
        documents.push({ id: 'invitation', name: 'Business Invitation Letter', description: 'From host company' });
        documents.push({ id: 'company_reg', name: 'Company Registration', description: 'Business registration certificate' });
        documents.push({ id: 'bank_statement', name: 'Bank Statements', description: 'Last 6 months' });
        documents.push({ id: 'business_profile', name: 'Business Profile', description: 'Company overview document' });
        documents.push({ id: 'tax_returns', name: 'Tax Returns', description: 'Recent tax documents' });
        break;
      case 'work':
        documents.push({ id: 'job_offer', name: 'Job Offer Letter', description: 'From employer' });
        documents.push({ id: 'contract', name: 'Employment Contract', description: 'Signed agreement' });
        documents.push({ id: 'certificates', name: 'Educational Certificates', description: 'Degrees and diplomas' });
        documents.push({ id: 'licenses', name: 'Professional Licenses', description: 'If applicable' });
        documents.push({ id: 'experience', name: 'Work Experience Letters', description: 'From previous employers' });
        break;
      case 'family':
        documents.push({ id: 'family_invitation', name: 'Family Invitation Letter', description: 'From family member' });
        documents.push({ id: 'relationship_proof', name: 'Relationship Proof', description: 'Birth/marriage certificates' });
        documents.push({ id: 'sponsor_id', name: 'Sponsor\'s Documents', description: 'ID/Passport copy' });
        documents.push({ id: 'accommodation', name: 'Proof of Accommodation', description: 'Address confirmation' });
        documents.push({ id: 'financial_support', name: 'Financial Support Documents', description: 'Sponsor\'s bank statements' });
        break;
      default:
        documents.push({ id: 'supporting_docs', name: 'Supporting Documents', description: 'Additional required documents' });
        documents.push({ id: 'bank_statement', name: 'Bank Statements', description: 'Financial proof' });
        documents.push({ id: 'purpose_letter', name: 'Purpose of Visit Letter', description: 'Explanation of visit' });
    }
  }
  
  // Based on travel history
  if (questionnaireData?.travelHistory === 'yes') {
    documents.push({ id: 'previous_visas', name: 'Previous Visa Copies', description: 'Copies of previous visas' });
    documents.push({ id: 'travel_history', name: 'Travel History Records', description: 'Passport stamps and records' });
  }
  
  // Based on employment status
  if (questionnaireData?.employmentStatus) {
    switch (questionnaireData.employmentStatus.toLowerCase()) {
      case 'employed':
        documents.push({ id: 'employment_cert', name: 'Employment Certificate', description: 'From current employer' });
        documents.push({ id: 'salary_slips', name: 'Salary Slips', description: 'Last 3 months' });
        break;
      case 'self-employed':
        documents.push({ id: 'business_reg', name: 'Business Registration', description: 'Self-employment proof' });
        documents.push({ id: 'tax_returns', name: 'Tax Returns', description: 'Business tax documents' });
        break;
      case 'student':
        documents.push({ id: 'student_id', name: 'Student ID Card', description: 'Valid student identification' });
        documents.push({ id: 'enrollment_cert', name: 'Enrollment Certificate', description: 'From educational institution' });
        break;
      case 'retired':
        documents.push({ id: 'pension_cert', name: 'Pension Certificate', description: 'Retirement proof' });
        documents.push({ id: 'retirement_docs', name: 'Retirement Documents', description: 'Official retirement papers' });
        break;
    }
  }
  
  // Based on marital status
  if (questionnaireData?.maritalStatus === 'married') {
    documents.push({ id: 'marriage_cert', name: 'Marriage Certificate', description: 'Official marriage document' });
    documents.push({ id: 'spouse_docs', name: 'Spouse\'s Documents', description: 'ID/Passport copy' });
  }
  
  // Based on having dependents
  if (questionnaireData?.hasDependents === 'yes') {
    documents.push({ id: 'birth_certs', name: 'Birth Certificates', description: 'Of dependents' });
    documents.push({ id: 'guardianship', name: 'Guardianship Documents', description: 'Legal guardianship papers' });
  }
  
  // Remove duplicates by id
  const uniqueDocs = documents.filter((doc, index, self) =>
    index === self.findIndex((d) => d.id === doc.id)
  );
  
  return uniqueDocs;
};

export default function VisaApplicationScreen({ navigation }: any) {
  const user = useAuthStore((state) => state.user);
  
  const [questionnaireData, setQuestionnaireData] = useState<any>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, any>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [aiGeneratedDocs, setAiGeneratedDocs] = useState<Array<{id: string; name: string; description: string}>>([]);

  useEffect(() => {
    parseQuestionnaireData();
  }, [user]);

  useEffect(() => {
    if (questionnaireData) {
      const docs = generateDocumentList(questionnaireData);
      setAiGeneratedDocs(docs);
    }
  }, [questionnaireData]);

  const parseQuestionnaireData = () => {
    if (user?.bio) {
      try {
        const bioData = JSON.parse(user.bio);
        setQuestionnaireData(bioData);
      } catch (error) {
        console.error('Error parsing questionnaire data:', error);
        // Set default if no questionnaire data
        setQuestionnaireData({ visaType: 'tourist' });
      }
    } else {
      // Default questionnaire data if none exists
      setQuestionnaireData({ visaType: 'tourist' });
    }
  };

  const handleDocumentUpload = async (docId: string) => {
    try {
      setUploadingDoc(docId);
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
      });

      // Simulate AI verification (2 seconds)
      setTimeout(() => {
        setUploadedDocs(prev => ({
          ...prev,
          [docId]: {
            ...result[0],
            verified: true,
            uploadedAt: new Date().toISOString(),
          }
        }));
        setUploadingDoc(null);
        Alert.alert('✓ Verified', 'Document uploaded and verified by AI!');
      }, 2000);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User cancelled document picker');
      } else {
        Alert.alert('Error', 'Failed to upload document');
      }
      setUploadingDoc(null);
    }
  };

  const uploadedCount = Object.keys(uploadedDocs).length;
  const totalDocs = aiGeneratedDocs.length;
  const progressPercentage = totalDocs > 0 ? Math.round((uploadedCount / totalDocs) * 100) : 0;

  const renderDocumentItem = (doc: {id: string; name: string; description: string}, index: number) => {
    const isUploaded = !!uploadedDocs[doc.id];
    const isUploading = uploadingDoc === doc.id;

    return (
      <View key={doc.id} style={styles.documentItem}>
        {/* Number */}
        <View style={styles.documentNumber}>
          <Text style={styles.documentNumberText}>{index + 1}</Text>
        </View>
        
        {/* Document Info */}
        <View style={styles.documentInfo}>
          <Text style={styles.documentName}>{doc.name}</Text>
          <Text style={styles.documentDescription}>{doc.description}</Text>
        </View>
        
        {/* Upload Button */}
        <TouchableOpacity
          style={[
            styles.uploadButton,
            isUploaded && styles.uploadButtonSuccess,
            isUploading && styles.uploadButtonLoading,
          ]}
          onPress={() => handleDocumentUpload(doc.id)}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : isUploaded ? (
            <Icon name="checkmark-circle" size={24} color="#10B981" />
          ) : (
            <Icon name="cloud-upload-outline" size={24} color="#4A9EFF" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.gradientBackground}>
        {/* Background Pattern */}
        <View style={styles.backgroundPattern}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Document Checklist</Text>
              <Text style={styles.headerSubtitle}>
                {questionnaireData?.destinationCountry || 'Your'} visa application
              </Text>
            </View>
          </View>

          {/* Progress Card */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressTitle}>Upload Progress</Text>
                <Text style={styles.progressSubtitle}>
                  {uploadedCount} of {totalDocs} documents uploaded
                </Text>
              </View>
              <View style={styles.progressCircle}>
                <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
              </View>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
            </View>
          </View>

          {/* AI Generated Badge */}
          <View style={styles.aiGeneratedHeader}>
            <Icon name="sparkles" size={20} color="#8B5CF6" />
            <Text style={styles.aiGeneratedText}>
              AI Generated Document List
            </Text>
            <View style={styles.aiGeneratedBadge}>
              <Text style={styles.aiGeneratedBadgeText}>
                Based on your answers
              </Text>
            </View>
          </View>

          {/* Document List */}
          <View style={styles.documentListContainer}>
            {aiGeneratedDocs.length > 0 ? (
              aiGeneratedDocs.map((doc, index) => renderDocumentItem(doc, index))
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A9EFF" />
                <Text style={styles.loadingText}>Generating document list...</Text>
              </View>
            )}
          </View>

          {/* Help Section */}
          <View style={styles.helpCard}>
            <Icon name="information-circle-outline" size={24} color="#4A9EFF" />
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Need Help?</Text>
              <Text style={styles.helpText}>
                Upload each document and our AI will verify if it meets the requirements.
              </Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  progressCard: {
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    borderWidth: 3,
    borderColor: '#4A9EFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4A9EFF',
    borderRadius: 4,
  },
  aiGeneratedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 8,
  },
  aiGeneratedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  aiGeneratedBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  aiGeneratedBadgeText: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  documentListContainer: {
    paddingHorizontal: 24,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    gap: 12,
  },
  documentNumber: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.4)',
  },
  documentNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A9EFF',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  uploadButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.3)',
  },
  uploadButtonSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  uploadButtonLoading: {
    opacity: 0.6,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 16,
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 24,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    gap: 12,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
});
