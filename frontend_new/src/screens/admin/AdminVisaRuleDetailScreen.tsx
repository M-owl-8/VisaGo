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

type RuleRoute = RouteProp<AdminStackParamList, 'AdminVisaRuleDetail'>;

interface RequiredDocument {
  documentType: string;
  category: 'required' | 'highly_recommended' | 'optional';
  description?: string;
  validityRequirements?: string;
  formatRequirements?: string;
  condition?: string;
}

interface VisaRuleSet {
  id: string;
  countryCode: string;
  visaType: string;
  version: number;
  isApproved: boolean;
  data: {
    requiredDocuments: RequiredDocument[];
    version?: number;
    [key: string]: any;
  };
}

export default function AdminVisaRuleDetailScreen() {
  const isAdmin = useIsAdmin();
  const nav = useNavigation();
  const route = useRoute<RuleRoute>();
  const {ruleId} = route.params;

  const [ruleSet, setRuleSet] = useState<VisaRuleSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      if (nav.canGoBack()) {
        nav.goBack();
      } else {
        nav.navigate('MainTabs' as never);
      }
    }
  }, [isAdmin, nav]);

  const fetchRuleSet = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getVisaRule(ruleId);
      setRuleSet(response.data || response?.ruleSet || response);
    } catch (err: any) {
      setError(err?.message || 'Failed to load rule set');
      console.error('Error fetching rule set:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, ruleId]);

  useEffect(() => {
    fetchRuleSet();
  }, [fetchRuleSet]);

  if (!isAdmin) {
    return null;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRuleSet();
    setRefreshing(false);
  };

  const handleConditionChange = (index: number, value: string) => {
    if (!ruleSet) return;
    const updated = {...ruleSet};
    const docs = [...(updated.data.requiredDocuments || [])];
    docs[index] = {...docs[index], condition: value || undefined};

    // Bump version if conditions are used
    const updatedData = {...updated.data, requiredDocuments: docs};
    if (value && (!updatedData.version || updatedData.version < 2)) {
      updatedData.version = 2;
    }

    setRuleSet({...updated, data: updatedData});
  };

  const handleSave = async () => {
    if (!ruleSet) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await adminApi.updateVisaRule(ruleId, {data: ruleSet.data});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading rule set...</Text>
      </View>
    );
  }

  if (!ruleSet) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Rule set not found.</Text>
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
        <Text style={styles.title}>Visa Rule Set</Text>
        <Text style={styles.subtitle}>
          {ruleSet.countryCode} • {ruleSet.visaType} • v{ruleSet.version}
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={18} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {success && (
        <View style={styles.successContainer}>
          <Icon name="checkmark-circle" size={18} color="#10B981" />
          <Text style={styles.successText}>Changes saved</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Required Documents</Text>
        {(ruleSet.data.requiredDocuments || []).map((doc, idx) => (
          <View key={idx} style={styles.docCard}>
            <View style={styles.docHeader}>
              <View>
                <Text style={styles.docTitle}>{doc.documentType}</Text>
                <Text style={styles.docMeta}>{doc.category}</Text>
              </View>
              {doc.description ? (
                <Text style={styles.docDescription}>{doc.description}</Text>
              ) : null}
            </View>
            <Text style={styles.label}>Condition</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., sponsorType !== 'self'"
              placeholderTextColor={COLORS.textSecondary}
              value={doc.condition || ''}
              onChangeText={text => handleConditionChange(idx, text)}
              autoCapitalize="none"
            />
            {doc.condition ? (
              <Text style={styles.helperText}>
                Document is included only if condition is true.
              </Text>
            ) : (
              <Text style={styles.helperText}>
                Leave empty to always include this document.
              </Text>
            )}
          </View>
        ))}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => nav.goBack()}>
          <Text style={styles.actionButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleSave}
          disabled={saving}>
          <Text style={styles.actionButtonText}>
            {saving ? 'Saving...' : 'Save'}
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
    paddingBottom: 8,
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
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  successText: {
    color: '#10B981',
    fontSize: 14,
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
  docCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
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
  docDescription: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 10,
    color: COLORS.text,
    fontSize: 13,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
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
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

