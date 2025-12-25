import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useIsAdmin} from '../../hooks/useIsAdmin';
import {adminApi} from '../../services/adminApi';
import {COLORS} from '../../theme/colors';

interface VisaRuleSet {
  id: string;
  countryCode: string;
  visaType: string;
  version: number;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  summary: {
    requiredDocumentsCount: number;
  };
}

export default function AdminVisaRulesScreen() {
  const isAdmin = useIsAdmin();
  const nav = useNavigation();
  const [ruleSets, setRuleSets] = useState<VisaRuleSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countryFilter, setCountryFilter] = useState('');
  const [visaTypeFilter, setVisaTypeFilter] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      if (nav.canGoBack()) {
        nav.goBack();
      } else {
        nav.navigate('MainTabs' as never);
      }
    }
  }, [isAdmin, nav]);

  useEffect(() => {
    if (isAdmin) {
      fetchRuleSets();
    }
  }, [isAdmin, countryFilter, visaTypeFilter]);

  if (!isAdmin) {
    return null;
  }

  const fetchRuleSets = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (countryFilter) params.countryCode = countryFilter.toUpperCase();
      if (visaTypeFilter) params.visaType = visaTypeFilter.toLowerCase();

      const data = await adminApi.getVisaRules(params);
      setRuleSets(data.ruleSets || []);
    } catch (err: any) {
      console.error('Error fetching rule sets:', err);
      Alert.alert('Error', err.message || 'Failed to fetch rule sets');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRuleSets();
    setRefreshing(false);
  };

  const handleRulePress = (ruleSet: VisaRuleSet) => {
    nav.navigate('AdminVisaRuleDetail' as never, {ruleId: ruleSet.id} as never);
  };

  if (loading && ruleSets.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading rule sets...</Text>
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
        <Text style={styles.title}>Visa Rule Sets</Text>
        <Text style={styles.subtitle}>
          Manage visa document rules and conditions
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Country Code</Text>
          <TextInput
            style={styles.filterInput}
            value={countryFilter}
            onChangeText={text => setCountryFilter(text.toUpperCase())}
            placeholder="e.g., US, CA, GB"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="characters"
          />
        </View>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Visa Type</Text>
          <TextInput
            style={styles.filterInput}
            value={visaTypeFilter}
            onChangeText={text => setVisaTypeFilter(text.toLowerCase())}
            placeholder="e.g., student, tourist"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Rule Sets List */}
      <View style={styles.section}>
        {ruleSets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon
              name="document-outline"
              size={48}
              color={COLORS.textSecondary}
            />
            <Text style={styles.emptyText}>No rule sets found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your filters or create a new rule set
            </Text>
          </View>
        ) : (
          ruleSets.map(ruleSet => (
            <TouchableOpacity
              key={ruleSet.id}
              style={styles.ruleCard}
              onPress={() => handleRulePress(ruleSet)}>
              <View style={styles.ruleHeader}>
                <View style={styles.ruleTitleContainer}>
                  <Text style={styles.ruleCountry}>{ruleSet.countryCode}</Text>
                  <Text style={styles.ruleVisaType}>
                    {ruleSet.visaType.charAt(0).toUpperCase() +
                      ruleSet.visaType.slice(1)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    ruleSet.isApproved
                      ? styles.statusApproved
                      : styles.statusPending,
                  ]}>
                  <Text
                    style={[
                      styles.statusText,
                      ruleSet.isApproved
                        ? styles.statusTextApproved
                        : styles.statusTextPending,
                    ]}>
                    {ruleSet.isApproved ? 'Approved' : 'Pending'}
                  </Text>
                </View>
              </View>
              <View style={styles.ruleDetails}>
                <View style={styles.ruleDetailItem}>
                  <Icon
                    name="document-text"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.ruleDetailText}>
                    {ruleSet.summary.requiredDocumentsCount} documents
                  </Text>
                </View>
                <View style={styles.ruleDetailItem}>
                  <Icon
                    name="time-outline"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.ruleDetailText}>
                    Version {ruleSet.version}
                  </Text>
                </View>
                <View style={styles.ruleDetailItem}>
                  <Icon
                    name="calendar-outline"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.ruleDetailText}>
                    {new Date(ruleSet.updatedAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <View style={styles.ruleArrow}>
                <Icon
                  name="chevron-forward"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </View>
            </TouchableOpacity>
          ))
        )}
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
  filterRow: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
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
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  ruleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ruleTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleCountry: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  ruleVisaType: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusApproved: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextApproved: {
    color: '#10B981',
  },
  statusTextPending: {
    color: '#F59E0B',
  },
  ruleDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  ruleDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleDetailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  ruleArrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
});
