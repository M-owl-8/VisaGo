import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useIsAdmin} from '../../hooks/useIsAdmin';
import {adminApi} from '../../services/adminApi';
import {COLORS} from '../../theme/colors';

interface CountryStats {
  country: string;
  countryCode: string;
  total: number;
  rulesMode: number;
  legacyMode: number;
  fallbackMode: number;
  averageItems: number;
  fallbackPercentage: number;
  rulesPercentage: number;
  legacyPercentage: number;
}

interface ChecklistStats {
  byCountry: CountryStats[];
  overall: {
    totalChecklists: number;
    totalRulesMode: number;
    totalLegacyMode: number;
    totalFallbackMode: number;
    overallFallbackPercentage: number;
    overallAverageItems: number;
  };
  period: {
    from: string;
    to: string;
    days: number;
  };
}

export default function AdminChecklistStatsScreen() {
  const isAdmin = useIsAdmin();
  const nav = useNavigation();
  const [stats, setStats] = useState<ChecklistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      fetchStats();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return null;
  }

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getChecklistStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load statistics');
      console.error('Error fetching checklist stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  if (loading && !stats) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </View>
    );
  }

  const StatCard = ({
    label,
    value,
    subtext,
    color = COLORS.primary,
  }: {
    label: string;
    value: string | number;
    subtext?: string;
    color?: string;
  }) => (
    <View style={[styles.statCard, {borderLeftColor: color}]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, {color}]}>{value}</Text>
      {subtext && <Text style={styles.statSubtext}>{subtext}</Text>}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={styles.header}>
        <Text style={styles.title}>Checklist Generation Statistics</Text>
        <Text style={styles.subtitle}>
          Track checklist generation modes and performance
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={20} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {stats && (
        <>
          {/* Overall Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overall Statistics</Text>
            <View style={styles.statsGrid}>
              <StatCard
                label="Total Checklists"
                value={stats.overall.totalChecklists}
                color={COLORS.primary}
              />
              <StatCard
                label="Rules Mode"
                value={stats.overall.totalRulesMode}
                subtext={`${(
                  (stats.overall.totalRulesMode /
                    stats.overall.totalChecklists) *
                  100
                ).toFixed(1)}%`}
                color="#10B981"
              />
              <StatCard
                label="Legacy Mode"
                value={stats.overall.totalLegacyMode}
                subtext={`${(
                  (stats.overall.totalLegacyMode /
                    stats.overall.totalChecklists) *
                  100
                ).toFixed(1)}%`}
                color="#F59E0B"
              />
              <StatCard
                label="Fallback Mode"
                value={stats.overall.totalFallbackMode}
                subtext={`${stats.overall.overallFallbackPercentage.toFixed(1)}%`}
                color="#EF4444"
              />
              <StatCard
                label="Avg Items"
                value={stats.overall.overallAverageItems.toFixed(1)}
                color={COLORS.primary}
              />
            </View>
          </View>

          {/* Period Info */}
          <View style={styles.section}>
            <View style={styles.periodCard}>
              <Icon name="calendar-outline" size={20} color={COLORS.primary} />
              <Text style={styles.periodText}>
                Period: {new Date(stats.period.from).toLocaleDateString()} -{' '}
                {new Date(stats.period.to).toLocaleDateString()} (
                {stats.period.days} days)
              </Text>
            </View>
          </View>

          {/* Country Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Country</Text>
            {stats.byCountry.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No country data available</Text>
              </View>
            ) : (
              stats.byCountry.map(country => (
                <View key={country.countryCode} style={styles.countryCard}>
                  <View style={styles.countryHeader}>
                    <Text style={styles.countryName}>{country.country}</Text>
                    <Text style={styles.countryCode}>
                      {country.countryCode}
                    </Text>
                  </View>
                  <View style={styles.countryStats}>
                    <View style={styles.countryStatItem}>
                      <Text style={styles.countryStatLabel}>Total</Text>
                      <Text style={styles.countryStatValue}>
                        {country.total}
                      </Text>
                    </View>
                    <View style={styles.countryStatItem}>
                      <Text style={styles.countryStatLabel}>Rules</Text>
                      <Text
                        style={[styles.countryStatValue, {color: '#10B981'}]}>
                        {country.rulesMode} (
                        {country.rulesPercentage.toFixed(1)}%)
                      </Text>
                    </View>
                    <View style={styles.countryStatItem}>
                      <Text style={styles.countryStatLabel}>Legacy</Text>
                      <Text
                        style={[styles.countryStatValue, {color: '#F59E0B'}]}>
                        {country.legacyMode} (
                        {country.legacyPercentage.toFixed(1)}%)
                      </Text>
                    </View>
                    <View style={styles.countryStatItem}>
                      <Text style={styles.countryStatLabel}>Fallback</Text>
                      <Text
                        style={[styles.countryStatValue, {color: '#EF4444'}]}>
                        {country.fallbackMode} (
                        {country.fallbackPercentage.toFixed(1)}%)
                      </Text>
                    </View>
                    <View style={styles.countryStatItem}>
                      <Text style={styles.countryStatLabel}>Avg Items</Text>
                      <Text style={styles.countryStatValue}>
                        {country.averageItems.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    flex: 1,
    color: '#EF4444',
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  periodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  periodText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  countryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  countryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  countryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  countryStatItem: {
    flex: 1,
    minWidth: '45%',
  },
  countryStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  countryStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});
