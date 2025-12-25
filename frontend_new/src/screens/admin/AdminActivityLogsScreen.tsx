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

interface ActivityLog {
  id: string;
  userId: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  createdAt: string;
}

export default function AdminActivityLogsScreen() {
  const isAdmin = useIsAdmin();
  const nav = useNavigation();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
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

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        pageSize,
      };
      if (filters.userId) params.userId = filters.userId;
      if (filters.action) params.action = filters.action;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      const response = await adminApi.getActivityLogs(params);
      setLogs(response.items || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      console.error('Error loading activity logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    if (isAdmin) {
      loadLogs();
    }
  }, [isAdmin, loadLogs]);

  if (!isAdmin) {
    return null;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const totalPages = Math.ceil(total / pageSize);

  const getActionIcon = (action: string) => {
    if (action.includes('create') || action.includes('Create')) {
      return 'add-circle';
    }
    if (action.includes('update') || action.includes('Update')) {
      return 'pencil';
    }
    if (action.includes('delete') || action.includes('Delete')) {
      return 'trash';
    }
    return 'document-text';
  };

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('Create')) {
      return '#10B981';
    }
    if (action.includes('update') || action.includes('Update')) {
      return '#3B82F6';
    }
    if (action.includes('delete') || action.includes('Delete')) {
      return '#EF4444';
    }
    return COLORS.primary;
  };

  if (loading && logs.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading activity logs...</Text>
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
        <Text style={styles.title}>Activity Logs</Text>
        <Text style={styles.subtitle}>
          View user activity and system events
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.filterInput}
          value={filters.userId}
          onChangeText={text => setFilters({...filters, userId: text})}
          placeholder="User ID"
          placeholderTextColor={COLORS.textSecondary}
        />
        <TextInput
          style={styles.filterInput}
          value={filters.action}
          onChangeText={text => setFilters({...filters, action: text})}
          placeholder="Action"
          placeholderTextColor={COLORS.textSecondary}
        />
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.filterInput, styles.dateInput]}
            value={filters.dateFrom}
            onChangeText={text => setFilters({...filters, dateFrom: text})}
            placeholder="From Date (YYYY-MM-DD)"
            placeholderTextColor={COLORS.textSecondary}
          />
          <TextInput
            style={[styles.filterInput, styles.dateInput]}
            value={filters.dateTo}
            onChangeText={text => setFilters({...filters, dateTo: text})}
            placeholder="To Date (YYYY-MM-DD)"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>
      </View>

      {/* Logs List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{total} total logs</Text>
        {logs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon
              name="document-outline"
              size={48}
              color={COLORS.textSecondary}
            />
            <Text style={styles.emptyText}>No activity logs found</Text>
          </View>
        ) : (
          logs.map(log => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <View
                  style={[
                    styles.actionIconContainer,
                    {backgroundColor: getActionColor(log.action) + '20'},
                  ]}>
                  <Icon
                    name={getActionIcon(log.action)}
                    size={20}
                    color={getActionColor(log.action)}
                  />
                </View>
                <View style={styles.logInfo}>
                  <Text style={styles.logAction}>{log.action}</Text>
                  <Text style={styles.logEntity}>
                    {log.entityType} • {log.entityId}
                  </Text>
                </View>
              </View>
              {log.userEmail && (
                <Text style={styles.logUser}>User: {log.userEmail}</Text>
              )}
              <Text style={styles.logDate}>
                {new Date(log.createdAt).toLocaleString()}
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
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
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
  logCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logInfo: {
    flex: 1,
  },
  logAction: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  logEntity: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  logUser: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  logDate: {
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
