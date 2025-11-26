import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {LineChart, BarChart, PieChart} from 'react-native-chart-kit';
import {useNavigation} from '@react-navigation/native';
import {useIsAdmin} from '../../hooks/useIsAdmin';
import {adminApi} from '../../services/adminApi';
import Colors from '../../constants/Colors';

const screenWidth = Dimensions.get('window').width;

interface MetricsPeriod {
  days: 7 | 30 | 90;
  label: string;
}

const METRIC_PERIODS: MetricsPeriod[] = [
  {days: 7, label: '7 Days'},
  {days: 30, label: '30 Days'},
  {days: 90, label: '90 Days'},
];

export default function AdminAnalyticsScreen() {
  const isAdmin = useIsAdmin();
  const nav = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [showFunnel, setShowFunnel] = useState(false);

  // Metrics data
  const [metrics, setMetrics] = useState<any>(null);
  const [funnel, setFunnel] = useState<any>(null);
  const [acquisition, setAcquisition] = useState<Record<string, number>>({});
  const [eventBreakdown, setEventBreakdown] = useState<Record<string, number>>(
    {},
  );

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

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [metricsData, funnelData, acqData, eventsData] = await Promise.all([
        adminApi.getAnalyticsMetrics(selectedPeriod),
        adminApi.getConversionFunnel(),
        adminApi.getUserAcquisition(),
        adminApi.getEventBreakdown(selectedPeriod),
      ]);

      setMetrics(metricsData);
      setFunnel(funnelData);
      setAcquisition(acqData);
      setEventBreakdown(eventsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Prepare chart data for daily trends
  const chartData = metrics?.dailyTrends
    ? {
        labels: metrics.dailyTrends.map((d: any) => d.date.slice(5)).slice(-7), // Last 7 days
        datasets: [
          {
            data: metrics.dailyTrends.map((d: any) => d.revenue).slice(-7),
            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Green
            strokeWidth: 2,
          },
        ],
      }
    : null;

  // Prepare data for top countries pie chart
  const countriesData =
    metrics?.topCountries && metrics.topCountries.length > 0
      ? {
          labels: metrics.topCountries.map((c: any) => c.name).slice(0, 5),
          datasets: [
            {
              data: metrics.topCountries.map((c: any) => c.count).slice(0, 5),
            },
          ],
        }
      : null;

  const paymentMethods = Object.entries(metrics?.paymentMethodBreakdown || {});
  const topVisaTypes = metrics?.topVisaTypes || [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {METRIC_PERIODS.map(period => (
          <TouchableOpacity
            key={period.days}
            style={[
              styles.periodButton,
              selectedPeriod === period.days && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period.days)}>
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === period.days && styles.periodButtonTextActive,
              ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Key Metrics Cards */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Signups</Text>
          <Text style={styles.metricValue}>{metrics?.totalSignups || 0}</Text>
          <Text style={styles.metricChange}>+{metrics?.newUsers || 0} new</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Visa Selected</Text>
          <Text style={styles.metricValue}>
            {metrics?.totalVisaSelections || 0}
          </Text>
          <Text style={styles.metricChange}>
            {metrics?.totalSignups
              ? (
                  (metrics.totalVisaSelections / metrics.totalSignups) *
                  100
                ).toFixed(1)
              : 0}
            %
          </Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Payments</Text>
          <Text style={styles.metricValue}>{metrics?.totalPayments || 0}</Text>
          <Text style={styles.metricChange}>
            ${metrics?.totalRevenue?.toFixed(2) || '0.00'}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Conversion Rate</Text>
          <Text style={styles.metricValue}>
            {metrics?.conversionRate?.toFixed(1) || 0}%
          </Text>
          <Text style={styles.metricChange}>signup → payment</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Active Users</Text>
          <Text style={styles.metricValue}>{metrics?.activeUsers || 0}</Text>
          <Text style={styles.metricChange}>in {selectedPeriod}d</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Documents</Text>
          <Text style={styles.metricValue}>{metrics?.totalDocuments || 0}</Text>
          <Text style={styles.metricChange}>
            {metrics?.totalMessages || 0} messages
          </Text>
        </View>
      </View>

      {/* Revenue Trend Chart */}
      {chartData && (
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Revenue Trend (Last 7 Days)</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 32}
            height={220}
            chartConfig={{
              backgroundColor: Colors.background,
              backgroundGradientFrom: Colors.background,
              backgroundGradientTo: Colors.background,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              strokeWidth: 2,
            }}
            bezier
          />
        </View>
      )}

      {/* Top Countries */}
      {countriesData && (
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Top Countries</Text>
          <PieChart
            data={countriesData}
            width={screenWidth - 32}
            height={220}
            chartConfig={{
              backgroundColor: Colors.background,
              backgroundGradientFrom: Colors.background,
              backgroundGradientTo: Colors.background,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="data"
          />
        </View>
      )}

      {/* Conversion Funnel */}
      <TouchableOpacity
        style={styles.sectionButton}
        onPress={() => setShowFunnel(true)}>
        <Text style={styles.sectionTitle}>📊 Conversion Funnel</Text>
        <Text style={styles.sectionSubtitle}>View funnel metrics</Text>
      </TouchableOpacity>

      {/* Payment Methods */}
      {paymentMethods.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          {paymentMethods.map(([method, count]) => (
            <View key={method} style={styles.listItem}>
              <Text style={styles.listLabel}>{method.toUpperCase()}</Text>
              <View style={styles.listValueContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${
                        (count / Math.max(...paymentMethods.map(m => m[1]))) *
                        100
                      }%`,
                    },
                  ]}
                />
                <Text style={styles.listValue}>{count}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Top Visa Types */}
      {topVisaTypes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Visa Types</Text>
          {topVisaTypes.slice(0, 5).map((visa: any, index: number) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.listLabel}>{visa.name}</Text>
              <Text style={styles.listValue}>{visa.count}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Event Breakdown */}
      {Object.keys(eventBreakdown).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Breakdown</Text>
          {Object.entries(eventBreakdown).map(([event, count]) => (
            <View key={event} style={styles.listItem}>
              <Text style={styles.listLabel}>{event.replace(/_/g, ' ')}</Text>
              <Text style={styles.listValue}>{count}</Text>
            </View>
          ))}
        </View>
      )}

      {/* User Acquisition */}
      {Object.keys(acquisition).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Acquisition Sources</Text>
          {Object.entries(acquisition).map(([source, count]) => (
            <View key={source} style={styles.listItem}>
              <Text style={styles.listLabel}>{source || 'Unknown'}</Text>
              <Text style={styles.listValue}>{count}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Conversion Funnel Modal */}
      <Modal visible={showFunnel} animationType="slide">
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowFunnel(false)}>
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </TouchableOpacity>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>Conversion Funnel (90 Days)</Text>

            {funnel && (
              <>
                <View style={styles.funnelStep}>
                  <View style={styles.funnelValue}>
                    <Text style={styles.funnelNumber}>{funnel.signups}</Text>
                    <Text style={styles.funnelLabel}>Signups</Text>
                  </View>
                  <View style={styles.funnelBar} />
                </View>

                <View style={styles.funnelStep}>
                  <View style={styles.funnelValue}>
                    <Text style={styles.funnelNumber}>
                      {funnel.visaSelections}
                    </Text>
                    <Text style={styles.funnelLabel}>Visa Selections</Text>
                  </View>
                  <Text style={styles.conversionText}>
                    {funnel.conversionRates.signupToVisa?.toFixed(1)}%
                  </Text>
                  <View style={styles.funnelBar} />
                </View>

                <View style={styles.funnelStep}>
                  <View style={styles.funnelValue}>
                    <Text style={styles.funnelNumber}>
                      {funnel.paymentsStarted}
                    </Text>
                    <Text style={styles.funnelLabel}>Payments Started</Text>
                  </View>
                  <Text style={styles.conversionText}>
                    {funnel.conversionRates.visaToPayment?.toFixed(1)}%
                  </Text>
                  <View style={styles.funnelBar} />
                </View>

                <View style={styles.funnelStep}>
                  <View style={styles.funnelValue}>
                    <Text style={styles.funnelNumber}>
                      {funnel.paymentsCompleted}
                    </Text>
                    <Text style={styles.funnelLabel}>Payments Completed</Text>
                  </View>
                  <Text style={styles.conversionText}>
                    {funnel.conversionRates.paymentToCompleted?.toFixed(1)}%
                  </Text>
                  <View style={styles.funnelBar} />
                </View>

                <View style={styles.funnelStep}>
                  <View style={styles.funnelValue}>
                    <Text style={styles.funnelNumber}>
                      {funnel.documentsUploaded}
                    </Text>
                    <Text style={styles.funnelLabel}>Documents Uploaded</Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  periodButtonText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  periodButtonTextActive: {
    color: Colors.white,
  },
  metricsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  metricChange: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionButton: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  chartContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    textTransform: 'capitalize',
  },
  listValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  listValueContainer: {
    flex: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: 3,
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 16,
  },
  closeButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 24,
  },
  funnelStep: {
    marginBottom: 24,
    alignItems: 'center',
  },
  funnelValue: {
    alignItems: 'center',
    marginBottom: 8,
  },
  funnelNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  funnelLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  conversionText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
    marginBottom: 8,
  },
  funnelBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});
