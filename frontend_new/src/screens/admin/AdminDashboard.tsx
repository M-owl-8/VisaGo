import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import {useIsAdmin} from '../../hooks/useIsAdmin';
import {adminApi, DashboardMetrics} from '../../services/adminApi';
import {COLORS} from '../../theme/colors';

const AdminDashboard: React.FC<any> = ({navigation}) => {
  const isAdmin = useIsAdmin();
  const nav = useNavigation();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Screen-level guard
  useEffect(() => {
    if (!isAdmin) {
      if (nav.canGoBack()) {
        nav.goBack();
      } else {
        nav.navigate('MainTabs' as never);
      }
    }
  }, [isAdmin, nav]);

  if (!isAdmin) {
    return null;
  }

  useFocusEffect(
    React.useCallback(() => {
      fetchMetrics();
    }, []),
  );

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getDashboard();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const StatCard = ({
    label,
    value,
    subtext,
    color = COLORS.primary,
    icon,
  }: any) => (
    <View style={[styles.statCard, {borderLeftColor: color}]}>
      {icon && (
        <View
          style={[styles.statIconContainer, {backgroundColor: color + '20'}]}>
          <Icon name={icon} size={24} color={color} />
        </View>
      )}
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
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>System Overview & Analytics</Text>
      </View>

      {/* Key Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          <StatCard
            label="Total Users"
            value={metrics?.totalUsers || 0}
            color="#4A9EFF"
            icon="people"
          />
          <StatCard
            label="Total Applications"
            value={metrics?.totalApplications || 0}
            color="#10B981"
            icon="document-text"
          />
          <StatCard
            label="Total Revenue"
            value={`$${(metrics?.totalRevenue || 0).toFixed(2)}`}
            color="#F59E0B"
            icon="cash"
          />
          <StatCard
            label="Verified Documents"
            value={metrics?.totalDocumentsVerified || 0}
            color="#8B5CF6"
            icon="checkmark-circle"
          />
        </View>
      </View>

      {/* Application Status Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Application Status</Text>
        <View style={styles.breakdownContainer}>
          <BreakdownItem
            label="Draft"
            value={metrics?.applicationsBreakdown.draft || 0}
            color="#999"
          />
          <BreakdownItem
            label="Submitted"
            value={metrics?.applicationsBreakdown.submitted || 0}
            color="#007AFF"
          />
          <BreakdownItem
            label="Approved"
            value={metrics?.applicationsBreakdown.approved || 0}
            color="#34C759"
          />
          <BreakdownItem
            label="Rejected"
            value={metrics?.applicationsBreakdown.rejected || 0}
            color="#FF3B30"
          />
          <BreakdownItem
            label="Expired"
            value={metrics?.applicationsBreakdown.expired || 0}
            color="#FF9500"
          />
        </View>
      </View>

      {/* Payment Status Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Status</Text>
        <View style={styles.breakdownContainer}>
          <BreakdownItem
            label="Pending"
            value={metrics?.paymentBreakdown.pending || 0}
            color="#FF9500"
          />
          <BreakdownItem
            label="Completed"
            value={metrics?.paymentBreakdown.completed || 0}
            color="#34C759"
          />
          <BreakdownItem
            label="Failed"
            value={metrics?.paymentBreakdown.failed || 0}
            color="#FF3B30"
          />
          <BreakdownItem
            label="Refunded"
            value={metrics?.paymentBreakdown.refunded || 0}
            color="#5856D6"
          />
        </View>
      </View>

      {/* Document Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Document Statistics</Text>
        <View style={styles.breakdownContainer}>
          <BreakdownItem
            label="Pending Verification"
            value={metrics?.documentStats.pendingVerification || 0}
            color="#FF9500"
          />
          <BreakdownItem
            label="Verification Rate"
            value={`${(metrics?.documentStats.verificationRate || 0).toFixed(1)}%`}
            color="#34C759"
          />
        </View>
      </View>

      {/* Top Countries by Revenue */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Countries by Revenue</Text>
        <View style={styles.listContainer}>
          {metrics?.revenueByCountry.map((country, index) => (
            <View key={index} style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <Text style={styles.listItemTitle}>{country.country}</Text>
                <Text style={styles.listItemSubtext}>
                  {country.applicationCount} applications
                </Text>
              </View>
              <Text style={styles.listItemValue}>
                ${country.revenue.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Management</Text>
        <AdminButton
          title="👥 Users Management"
          onPress={() => navigation.navigate('AdminUsers')}
        />
        <AdminButton
          title="📋 Applications"
          onPress={() => navigation.navigate('AdminApplications')}
        />
        <AdminButton
          title="💳 Payments"
          onPress={() => navigation.navigate('AdminPayments')}
        />
        <AdminButton
          title="📄 Document Verification"
          onPress={() => navigation.navigate('AdminDocuments')}
        />
        <AdminButton
          title="📊 Analytics & Tracking"
          onPress={() => navigation.navigate('AdminAnalytics')}
        />
      </View>

      {/* GPT & Evaluation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GPT & Evaluation</Text>
        <AdminButton
          title="📈 Evaluation Dashboard"
          onPress={() => navigation.navigate('AdminEvaluation')}
        />
        <AdminButton
          title="🤖 AI Interactions"
          onPress={() => navigation.navigate('AdminAI')}
        />
        <AdminButton
          title="📋 Checklist Statistics"
          onPress={() => navigation.navigate('AdminChecklistStats')}
        />
      </View>

      {/* System Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Management</Text>
        <AdminButton
          title="📜 Visa Rules"
          onPress={() => navigation.navigate('AdminVisaRules')}
        />
        <AdminButton
          title="📝 Activity Logs"
          onPress={() => navigation.navigate('AdminActivityLogs')}
        />
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const BreakdownItem = ({label, value, color}: any) => (
  <View style={styles.breakdownItem}>
    <View style={[styles.colorBadge, {backgroundColor: color}]} />
    <View style={styles.breakdownItemContent}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
  </View>
);

const AdminButton = ({title, onPress}: any) => (
  <TouchableOpacity style={styles.adminButton} onPress={onPress}>
    <Text style={styles.adminButtonText}>{title}</Text>
  </TouchableOpacity>
);

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
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  breakdownContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  colorBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  breakdownItemContent: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  listContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  listItemLeft: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  listItemSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  listItemValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  adminButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  adminButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default AdminDashboard;
