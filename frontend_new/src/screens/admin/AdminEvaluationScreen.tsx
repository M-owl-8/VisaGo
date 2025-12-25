import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useIsAdmin} from '../../hooks/useIsAdmin';
import {adminApi} from '../../services/adminApi';
import {COLORS} from '../../theme/colors';

interface EvaluationMetrics {
  checklistAccuracy: number;
  checklistPrecision: number;
  checklistRecall: number;
  checklistF1Score: number;
  docVerificationAccuracy: number;
  docVerificationPrecision: number;
  docVerificationRecall: number;
  docVerificationF1Score: number;
  averageLatencyMs: number;
  averageTokenUsage: number;
  totalTestCases: number;
  passedTestCases: number;
  failedTestCases: number;
  falsePositives: number;
  falseNegatives: number;
  truePositives: number;
  trueNegatives: number;
}

interface EvaluationResult {
  caseId: string;
  caseName: string;
  checklistScore: {
    accuracy: number;
    matches: number;
    missing: number;
    extra: number;
  };
  docVerificationScore?: {
    accuracy: number;
    passed: number;
    failed: number;
  };
  latencyMs?: number;
  tokenUsage?: number;
  errors?: string[];
}

export default function AdminEvaluationScreen() {
  const isAdmin = useIsAdmin();
  const nav = useNavigation();
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
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
      fetchMetrics();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return null;
  }

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getEvaluationMetrics();
      // API returns { success: true, data: { metrics, results } }
      if (response.data) {
        if (response.data.metrics) {
          setMetrics(response.data.metrics);
        }
        if (response.data.results) {
          setResults(response.data.results);
        }
      } else if (response.metrics) {
        // Fallback for direct response
        setMetrics(response.metrics);
        if (response.results) {
          setResults(response.results);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load evaluation metrics');
      console.error('Error fetching evaluation metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const runEvaluation = async () => {
    try {
      setRunning(true);
      setError(null);
      const response = await adminApi.runEvaluation();
      // API returns { success: true, data: { metrics, results } }
      if (response.data) {
        if (response.data.metrics) {
          setMetrics(response.data.metrics);
        }
        if (response.data.results) {
          setResults(response.data.results);
        }
      } else if (response.metrics) {
        // Fallback for direct response
        setMetrics(response.metrics);
        if (response.results) {
          setResults(response.results);
        }
      }
      Alert.alert('Success', 'Evaluation completed successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to run evaluation');
      Alert.alert('Error', err.message || 'Failed to run evaluation');
    } finally {
      setRunning(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
    setRefreshing(false);
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return '#10B981';
    if (accuracy >= 75) return '#F59E0B';
    return '#EF4444';
  };

  const MetricCard = ({
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
    <View style={[styles.metricCard, {borderLeftColor: color}]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, {color}]}>{value}</Text>
      {subtext && <Text style={styles.metricSubtext}>{subtext}</Text>}
    </View>
  );

  if (loading && !metrics) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading metrics...</Text>
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
        <Text style={styles.title}>Evaluation Dashboard</Text>
        <Text style={styles.subtitle}>
          Track checklist accuracy, document verification quality, and system
          performance
        </Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.refreshButton]}
          onPress={fetchMetrics}
          disabled={loading}>
          <Icon
            name="refresh"
            size={18}
            color="#FFFFFF"
            style={loading ? styles.spinning : undefined}
          />
          <Text style={styles.actionButtonText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.runButton]}
          onPress={runEvaluation}
          disabled={running}>
          <Icon
            name="trending-up"
            size={18}
            color="#FFFFFF"
            style={running ? styles.spinning : undefined}
          />
          <Text style={styles.actionButtonText}>
            {running ? 'Running...' : 'Run Evaluation'}
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={20} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {metrics && (
        <>
          {/* Overall Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overall Metrics</Text>
            <View style={styles.metricsGrid}>
              <MetricCard
                label="Checklist Accuracy"
                value={`${metrics.checklistAccuracy.toFixed(1)}%`}
                subtext={`F1: ${metrics.checklistF1Score.toFixed(2)}`}
                color={getAccuracyColor(metrics.checklistAccuracy)}
              />
              <MetricCard
                label="Doc Verification Accuracy"
                value={`${metrics.docVerificationAccuracy.toFixed(1)}%`}
                subtext={`F1: ${metrics.docVerificationF1Score.toFixed(2)}`}
                color={getAccuracyColor(metrics.docVerificationAccuracy)}
              />
              <MetricCard
                label="Avg Latency"
                value={`${metrics.averageLatencyMs.toFixed(0)}ms`}
                subtext={`${metrics.averageTokenUsage.toFixed(0)} tokens avg`}
                color={COLORS.primary}
              />
              <MetricCard
                label="Test Cases"
                value={metrics.totalTestCases}
                subtext={`${metrics.passedTestCases} passed, ${metrics.failedTestCases} failed`}
                color={COLORS.primary}
              />
            </View>
          </View>

          {/* Detailed Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Checklist Generation Metrics
            </Text>
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Precision</Text>
                <Text style={styles.detailValue}>
                  {(metrics.checklistPrecision * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Recall</Text>
                <Text style={styles.detailValue}>
                  {(metrics.checklistRecall * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>F1 Score</Text>
                <Text style={styles.detailValue}>
                  {metrics.checklistF1Score.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Document Verification Metrics
            </Text>
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Precision</Text>
                <Text style={styles.detailValue}>
                  {(metrics.docVerificationPrecision * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Recall</Text>
                <Text style={styles.detailValue}>
                  {(metrics.docVerificationRecall * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>F1 Score</Text>
                <Text style={styles.detailValue}>
                  {metrics.docVerificationF1Score.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Error Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Error Breakdown</Text>
            <View style={styles.errorBreakdownGrid}>
              <View style={styles.errorBreakdownItem}>
                <Text style={styles.errorBreakdownLabel}>True Positives</Text>
                <Text style={[styles.errorBreakdownValue, {color: '#10B981'}]}>
                  {metrics.truePositives}
                </Text>
              </View>
              <View style={styles.errorBreakdownItem}>
                <Text style={styles.errorBreakdownLabel}>True Negatives</Text>
                <Text style={[styles.errorBreakdownValue, {color: '#10B981'}]}>
                  {metrics.trueNegatives}
                </Text>
              </View>
              <View style={styles.errorBreakdownItem}>
                <Text style={styles.errorBreakdownLabel}>False Positives</Text>
                <Text style={[styles.errorBreakdownValue, {color: '#EF4444'}]}>
                  {metrics.falsePositives}
                </Text>
              </View>
              <View style={styles.errorBreakdownItem}>
                <Text style={styles.errorBreakdownLabel}>False Negatives</Text>
                <Text style={[styles.errorBreakdownValue, {color: '#EF4444'}]}>
                  {metrics.falseNegatives}
                </Text>
              </View>
            </View>
          </View>

          {/* Test Results */}
          {results.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Test Results</Text>
              {results.slice(0, 10).map(result => (
                <View key={result.caseId} style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultName}>{result.caseName}</Text>
                    <Text
                      style={[
                        styles.resultAccuracy,
                        {
                          color: getAccuracyColor(
                            result.checklistScore.accuracy,
                          ),
                        },
                      ]}>
                      {result.checklistScore.accuracy.toFixed(0)}%
                    </Text>
                  </View>
                  <Text style={styles.resultDetails}>
                    Checklist: {result.checklistScore.accuracy.toFixed(1)}%
                    accuracy
                    {result.docVerificationScore &&
                      ` • Doc: ${result.docVerificationScore.accuracy.toFixed(1)}% accuracy`}
                    {result.latencyMs && ` • ${result.latencyMs}ms`}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {!metrics && !loading && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No evaluation metrics available yet.
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, styles.runButton]}
            onPress={runEvaluation}>
            <Icon name="trending-up" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Run First Evaluation</Text>
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
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  runButton: {
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  spinning: {
    transform: [{rotate: '360deg'}],
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
  metricsGrid: {
    gap: 12,
  },
  metricCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  detailCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  errorBreakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  errorBreakdownItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  errorBreakdownLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  errorBreakdownValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  resultCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  resultAccuracy: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultDetails: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
});
