import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useIsAdmin} from '../../hooks/useIsAdmin';
import {adminApi} from '../../services/adminApi';
import {COLORS} from '../../theme/colors';
import {AdminStackParamList} from '../../navigation/AdminNavigator';

type CandidateRoute = RouteProp<
  AdminStackParamList,
  'AdminVisaRuleCandidateDetail'
>;

interface RuleSetDiff {
  addedDocuments?: Array<{documentType: string; category: string}>;
  removedDocuments?: Array<{documentType: string; category: string}>;
  modifiedDocuments?: Array<{
    documentType: string;
    changes: any;
  }>;
}

interface CandidateDetail {
  id: string;
  countryCode: string;
  visaType: string;
  confidence: number | null;
  status: 'pending' | 'approved' | 'rejected';
  data: any;
  existingRuleSet?: any;
  diff: RuleSetDiff | null;
  source?: any;
  pageContent?: any;
  extractionMetadata?: any;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
}

export default function AdminVisaRuleCandidateDetailScreen() {
  const isAdmin = useIsAdmin();
  const nav = useNavigation();
  const route = useRoute<CandidateRoute>();
  const {candidateId} = route.params;

  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      if (nav.canGoBack()) {
        nav.goBack();
      } else {
        nav.navigate('MainTabs' as never);
      }
    }
  }, [isAdmin, nav]);

  const fetchCandidate = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getVisaRuleCandidate(candidateId);
      setCandidate(response.data || response?.candidate || response);
    } catch (err: any) {
      setError(err?.message || 'Failed to load candidate');
      console.error('Error fetching candidate detail:', err);
    } finally {
      setLoading(false);
    }
  }, [candidateId, isAdmin]);

  useEffect(() => {
    fetchCandidate();
  }, [fetchCandidate]);

  if (!isAdmin) {
    return null;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCandidate();
    setRefreshing(false);
  };

  const handleApprove = async () => {
    try {
      setProcessing(true);
      setError(null);
      await adminApi.approveVisaRuleCandidate(candidateId);
      Alert.alert('Approved', 'Candidate approved and rule set created.');
      await fetchCandidate();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve candidate');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    try {
      setProcessing(true);
      setError(null);
      await adminApi.rejectVisaRuleCandidate(candidateId, notes || undefined);
      Alert.alert('Rejected', 'Candidate rejected successfully.');
      await fetchCandidate();
    } catch (err: any) {
      setError(err?.message || 'Failed to reject candidate');
    } finally {
      setProcessing(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: '#F59E0B',
    approved: '#10B981',
    rejected: '#EF4444',
  };

  const renderDiff = (diff: RuleSetDiff | null) => {
    if (!diff) {
      return (
        <Text style={styles.mutedText}>
          No existing rules to compare — this will create a new rule set.
        </Text>
      );
    }

    return (
      <View style={{gap: 12}}>
        {diff.addedDocuments?.length ? (
          <View>
            <Text style={[styles.sectionSubtitle, {color: '#10B981'}]}>
              Added Documents
            </Text>
            {diff.addedDocuments.map((doc, idx) => (
              <Text key={idx} style={styles.diffText}>
                • {doc.documentType} ({doc.category})
              </Text>
            ))}
          </View>
        ) : null}

        {diff.removedDocuments?.length ? (
          <View>
            <Text style={[styles.sectionSubtitle, {color: '#EF4444'}]}>
              Removed Documents
            </Text>
            {diff.removedDocuments.map((doc, idx) => (
              <Text key={idx} style={styles.diffText}>
                • {doc.documentType} ({doc.category})
              </Text>
            ))}
          </View>
        ) : null}

        {diff.modifiedDocuments?.length ? (
          <View>
            <Text style={[styles.sectionSubtitle, {color: '#F59E0B'}]}>
              Modified Documents
            </Text>
            {diff.modifiedDocuments.map((doc, idx) => (
              <Text key={idx} style={styles.diffText}>
                • {doc.documentType}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  const renderDocs = (docs?: any[]) => {
    if (!docs?.length) {
      return (
        <Text style={styles.mutedText}>
          No documents detected in candidate.
        </Text>
      );
    }
    return docs.map((doc, idx) => (
      <View key={idx} style={styles.docItem}>
        <Text style={styles.docTitle}>{doc.documentType}</Text>
        <Text style={styles.docMeta}>{doc.category}</Text>
        {doc.condition && (
          <Text style={styles.docCondition}>Condition: {doc.condition}</Text>
        )}
      </View>
    ));
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading candidate...</Text>
      </View>
    );
  }

  if (!candidate) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Candidate not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Review Candidate</Text>
        <Text style={styles.subtitle}>
          {candidate.countryCode} • {candidate.visaType}
        </Text>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.statusBadge,
              {backgroundColor: `${statusColors[candidate.status]}33`},
            ]}>
            <Text
              style={[
                styles.statusText,
                {color: statusColors[candidate.status]},
              ]}>
              {candidate.status.toUpperCase()}
            </Text>
          </View>
          {candidate.confidence !== null && (
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                {(candidate.confidence * 100).toFixed(0)}% confidence
              </Text>
            </View>
          )}
        </View>
        {candidate.reviewedAt && (
          <Text style={styles.mutedText}>
            Reviewed {new Date(candidate.reviewedAt).toLocaleString()}
          </Text>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={18} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Documents Proposed</Text>
        {renderDocs(candidate.data?.requiredDocuments)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Differences vs Existing</Text>
        {renderDiff(candidate.diff)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Source</Text>
        <Text style={styles.mutedText}>
          {candidate.source?.name || candidate.source?.url || 'Unknown source'}
        </Text>
        {candidate.pageContent?.url && (
          <Text style={styles.mutedText}>
            Page: {candidate.pageContent.url}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reviewer Notes (optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add rejection reason or reviewer notes"
          placeholderTextColor={COLORS.textSecondary}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={handleReject}
          disabled={processing}>
          <Text style={styles.actionButtonText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={handleApprove}
          disabled={processing}>
          <Text style={styles.actionButtonText}>
            {processing ? 'Processing...' : 'Approve'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  backLink: {
    color: COLORS.primary,
    marginBottom: 6,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confidenceBadge: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  confidenceText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  mutedText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  diffText: {
    color: COLORS.text,
    fontSize: 13,
  },
  docItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  docMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  docCondition: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    flex: 1,
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
