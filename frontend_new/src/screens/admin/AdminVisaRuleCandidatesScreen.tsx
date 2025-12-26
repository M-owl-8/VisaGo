import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useIsAdmin} from '../../hooks/useIsAdmin';
import {adminApi} from '../../services/adminApi';
import {COLORS} from '../../theme/colors';

interface VisaRuleCandidate {
  id: string;
  countryCode: string;
  visaType: string;
  confidence: number | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  source?: {
    id: string;
    name?: string | null;
    url?: string;
  } | null;
  pageContent?: {
    id: string;
    url: string;
    title?: string | null;
    fetchedAt?: string;
  } | null;
}

export default function AdminVisaRuleCandidatesScreen() {
  const isAdmin = useIsAdmin();
  const nav = useNavigation();
  const [candidates, setCandidates] = useState<VisaRuleCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    countryCode: '',
    visaType: '',
    status: '',
  });

  useEffect(() => {
    if (!isAdmin) {
      if (nav.canGoBack()) {
        nav.goBack();
      } else {
        nav.navigate('MainTabs' as never);
      }
    }
  }, [isAdmin, nav]);

  const fetchCandidates = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getVisaRuleCandidates({
        countryCode: filters.countryCode.trim(),
        visaType: filters.visaType.trim(),
        status: filters.status,
      });
      setCandidates(data.candidates || data?.data?.candidates || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load candidates');
      console.error('Error fetching visa rule candidates:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, isAdmin]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  if (!isAdmin) {
    return null;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCandidates();
    setRefreshing(false);
  };

  const statusColors: Record<string, string> = {
    pending: '#F59E0B',
    approved: '#10B981',
    rejected: '#EF4444',
  };

  const renderCandidateCard = (candidate: VisaRuleCandidate) => (
    <TouchableOpacity
      key={candidate.id}
      style={styles.card}
      onPress={() =>
        nav.navigate(
          'AdminVisaRuleCandidateDetail' as never,
          {candidateId: candidate.id} as never,
        )
      }>
      <View style={styles.cardHeader}>
        <View style={{flex: 1}}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>
              {candidate.countryCode} • {candidate.visaType}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: `${statusColors[candidate.status] || '#999'}20`,
                },
              ]}>
              <Text
                style={[
                  styles.statusText,
                  {color: statusColors[candidate.status] || '#999'},
                ]}>
                {candidate.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.cardSubtitle}>
            {candidate.source?.name ||
              candidate.source?.url ||
              'Unknown source'}
          </Text>
        </View>
        {candidate.confidence !== null && (
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>
              {(candidate.confidence * 100).toFixed(0)}%
            </Text>
          </View>
        )}
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Icon name="time-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>
            Created {new Date(candidate.createdAt).toLocaleDateString()}
          </Text>
        </View>
        {candidate.reviewedAt && (
          <View style={styles.metaItem}>
            <Icon name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.metaText}>
              Reviewed {new Date(candidate.reviewedAt).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={styles.header}>
        <Text style={styles.title}>Visa Rule Candidates</Text>
        <Text style={styles.subtitle}>
          Review and approve GPT-extracted visa rules
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={18} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.input}
          value={filters.countryCode}
          placeholder="Country code (e.g., US)"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="characters"
          onChangeText={text => setFilters({...filters, countryCode: text})}
        />
        <TextInput
          style={styles.input}
          value={filters.visaType}
          placeholder="Visa type (e.g., student)"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="none"
          onChangeText={text => setFilters({...filters, visaType: text})}
        />
        <View style={styles.statusRow}>
          {['', 'pending', 'approved', 'rejected'].map(status => (
            <TouchableOpacity
              key={status || 'all'}
              style={[
                styles.chip,
                filters.status === status && styles.chipActive,
              ]}
              onPress={() => setFilters({...filters, status})}>
              <Text
                style={[
                  styles.chipText,
                  filters.status === status && styles.chipTextActive,
                ]}>
                {status ? status.toUpperCase() : 'ALL'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchCandidates}>
          <Icon name="refresh" size={16} color="#fff" />
          <Text style={styles.refreshText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>

      {loading && candidates.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading candidates...</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {candidates.map(renderCandidateCard)}
          {candidates.length === 0 && (
            <View style={styles.emptyContainer}>
              <Icon
                name="document-outline"
                size={48}
                color={COLORS.textSecondary}
              />
              <Text style={styles.emptyText}>No candidates found</Text>
              <Text style={styles.emptySubtext}>
                Adjust filters or trigger the crawler to ingest embassy sources.
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    flex: 1,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  chipActive: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 12,
  },
  refreshText: {
    color: '#fff',
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  confidenceBadge: {
    backgroundColor: '#0EA5E9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  confidenceText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  centerContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});

