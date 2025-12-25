import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useIsAdmin} from '../../hooks/useIsAdmin';
import {adminApi} from '../../services/adminApi';
import {COLORS} from '../../theme/colors';

interface AIInteraction {
  id: string;
  userId?: string;
  applicationId?: string;
  taskType: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  success: boolean;
  errorMessage?: string;
  latencyMs?: number;
  createdAt: string;
}

export default function AdminAIScreen() {
  const isAdmin = useIsAdmin();
  const nav = useNavigation();
  const [interactions, setInteractions] = useState<AIInteraction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({
    taskType: '',
    model: '',
    success: '',
    dateFrom: '',
    dateTo: '',
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

  const loadInteractions = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        skip: (page - 1) * pageSize,
        take: pageSize,
      };
      if (filters.taskType) params.taskType = filters.taskType;
      if (filters.model) params.model = filters.model;
      if (filters.success) params.success = filters.success === 'true';
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.taskType) params.userId = filters.taskType; // Reuse for userId filter

      const response = await adminApi.getAIInteractions(params);
      setInteractions(response.data || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      console.error('Error loading AI interactions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    if (isAdmin) {
      loadInteractions();
    }
  }, [isAdmin, loadInteractions]);

  if (!isAdmin) {
    return null;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInteractions();
    setRefreshing(false);
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading && interactions.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading AI interactions...</Text>
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
        <Text style={styles.title}>AI Interactions</Text>
        <Text style={styles.subtitle}>View AI/GPT interaction logs</Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.filterInput}
          value={filters.taskType}
          onChangeText={text => setFilters({...filters, taskType: text})}
          placeholder="Task Type"
          placeholderTextColor={COLORS.textSecondary}
        />
        <TextInput
          style={styles.filterInput}
          value={filters.model}
          onChangeText={text => setFilters({...filters, model: text})}
          placeholder="Model"
          placeholderTextColor={COLORS.textSecondary}
        />
        <View style={styles.filterRow}>
          <TextInput
            style={[styles.filterInput, styles.filterInputHalf]}
            value={filters.dateFrom}
            onChangeText={text => setFilters({...filters, dateFrom: text})}
            placeholder="From Date (YYYY-MM-DD)"
            placeholderTextColor={COLORS.textSecondary}
          />
          <TextInput
            style={[styles.filterInput, styles.filterInputHalf]}
            value={filters.dateTo}
            onChangeText={text => setFilters({...filters, dateTo: text})}
            placeholder="To Date (YYYY-MM-DD)"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filters.success === 'true' && styles.filterButtonActive,
            ]}
            onPress={() =>
              setFilters({
                ...filters,
                success: filters.success === 'true' ? '' : 'true',
              })
            }>
            <Text
              style={[
                styles.filterButtonText,
                filters.success === 'true' && styles.filterButtonTextActive,
              ]}>
              Success Only
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filters.success === 'false' && styles.filterButtonActive,
            ]}
            onPress={() =>
              setFilters({
                ...filters,
                success: filters.success === 'false' ? '' : 'false',
              })
            }>
            <Text
              style={[
                styles.filterButtonText,
                filters.success === 'false' && styles.filterButtonTextActive,
              ]}>
              Errors Only
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Interactions List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{total} total interactions</Text>
        {interactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon
              name="chatbubbles-outline"
              size={48}
              color={COLORS.textSecondary}
            />
            <Text style={styles.emptyText}>No AI interactions found</Text>
          </View>
        ) : (
          interactions.map(interaction => (
            <View
              key={interaction.id}
              style={[
                styles.interactionCard,
                !interaction.success && styles.interactionCardError,
              ]}>
              <View style={styles.interactionHeader}>
                <View style={styles.interactionTitleContainer}>
                  <Icon
                    name={
                      interaction.success ? 'checkmark-circle' : 'close-circle'
                    }
                    size={20}
                    color={interaction.success ? '#10B981' : '#EF4444'}
                  />
                  <Text style={styles.interactionTaskType}>
                    {interaction.taskType}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    interaction.success
                      ? styles.statusSuccess
                      : styles.statusError,
                  ]}>
                  <Text
                    style={[
                      styles.statusText,
                      interaction.success
                        ? styles.statusTextSuccess
                        : styles.statusTextError,
                    ]}>
                    {interaction.success ? 'Success' : 'Error'}
                  </Text>
                </View>
              </View>
              <View style={styles.interactionDetails}>
                <View style={styles.interactionDetailItem}>
                  <Icon
                    name="hardware-chip"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.interactionDetailText}>
                    {interaction.model}
                  </Text>
                </View>
                {interaction.totalTokens && (
                  <View style={styles.interactionDetailItem}>
                    <Icon
                      name="document-text"
                      size={16}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.interactionDetailText}>
                      {interaction.totalTokens} tokens
                    </Text>
                  </View>
                )}
                {interaction.latencyMs && (
                  <View style={styles.interactionDetailItem}>
                    <Icon
                      name="time-outline"
                      size={16}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.interactionDetailText}>
                      {interaction.latencyMs}ms
                    </Text>
                  </View>
                )}
              </View>
              {interaction.errorMessage && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>
                    {interaction.errorMessage}
                  </Text>
                </View>
              )}
              <Text style={styles.interactionDate}>
                {new Date(interaction.createdAt).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
            onPress={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}>
            <Icon name="chevron-back" size={20} color={COLORS.text} />
            <Text style={styles.pageButtonText}>Previous</Text>
          </TouchableOpacity>
          <Text style={styles.pageInfo}>
            Page {page} of {totalPages}
          </Text>
          <TouchableOpacity
            style={[
              styles.pageButton,
              page >= totalPages && styles.pageButtonDisabled,
            ]}
            onPress={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}>
            <Text style={styles.pageButtonText}>Next</Text>
            <Icon name="chevron-forward" size={20} color={COLORS.text} />
          </TouchableOpacity>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  filterInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    color: COLORS.text,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterInputHalf: {
    flex: 1,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: COLORS.primary,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  interactionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  interactionCardError: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  interactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  interactionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  interactionTaskType: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusError: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextSuccess: {
    color: '#10B981',
  },
  statusTextError: {
    color: '#EF4444',
  },
  interactionDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  interactionDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  interactionDetailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
  },
  interactionDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  pageInfo: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
