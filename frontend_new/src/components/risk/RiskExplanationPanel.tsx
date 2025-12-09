/**
 * Risk Explanation Panel Component (Mobile)
 * Displays visa risk analysis with level, summary, and recommendations
 * Matches web app functionality using v2 risk engine
 */

import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTranslation} from 'react-i18next';
import {apiClient} from '../../services/api';

interface RiskExplanation {
  riskLevel: 'low' | 'medium' | 'high';
  summaryEn: string;
  summaryUz: string;
  summaryRu: string;
  recommendations: Array<{
    id: string;
    titleEn: string;
    titleUz: string;
    titleRu: string;
    detailsEn: string;
    detailsUz: string;
    detailsRu: string;
  }>;
}

interface RiskExplanationPanelProps {
  applicationId: string;
  language?: string;
}

export function RiskExplanationPanel({
  applicationId,
  language = 'en',
}: RiskExplanationPanelProps) {
  const {t, i18n} = useTranslation();
  const currentLanguage = language || i18n.language || 'en';
  const [explanation, setExplanation] = useState<RiskExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!applicationId) return;

    const fetchRiskExplanation = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.getRiskExplanation(applicationId);

        if (response.success && response.data) {
          setExplanation(response.data);
        } else {
          throw new Error(
            response.error?.message || 'Failed to load risk explanation',
          );
        }
      } catch (err: any) {
        console.error('[RiskExplanation] Error fetching explanation:', err);
        setError(err?.message || 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRiskExplanation();
  }, [applicationId]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {t('applications.visaRisk', 'Visa Risk')}
          </Text>
        </View>
        <ActivityIndicator size="small" color="#4A9EFF" />
      </View>
    );
  }

  if (error || !explanation) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {t('applications.visaRisk', 'Visa Risk')}
          </Text>
        </View>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={16} color="#9CA3AF" />
          <Text style={styles.errorText}>
            {t(
              'applications.unableToLoadRiskAnalysis',
              'Unable to load risk analysis',
            )}
          </Text>
        </View>
      </View>
    );
  }

  // Get localized text
  const summary =
    currentLanguage === 'uz'
      ? explanation.summaryUz
      : currentLanguage === 'ru'
        ? explanation.summaryRu
        : explanation.summaryEn;

  const riskLevel = explanation.riskLevel;
  const recommendations = explanation.recommendations || [];

  // Risk level badge styling
  const getRiskBadgeStyle = () => {
    switch (riskLevel) {
      case 'low':
        return {
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgba(16, 185, 129, 0.3)',
          color: '#34D399',
        };
      case 'high':
        return {
          backgroundColor: 'rgba(244, 63, 94, 0.2)',
          borderColor: 'rgba(244, 63, 94, 0.3)',
          color: '#F87171',
        };
      default:
        return {
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          borderColor: 'rgba(245, 158, 11, 0.3)',
          color: '#FBBF24',
        };
    }
  };

  const getRiskLabel = () => {
    switch (riskLevel) {
      case 'low':
        return t('applications.riskLow', 'Low Risk');
      case 'high':
        return t('applications.riskHigh', 'High Risk');
      default:
        return t('applications.riskMedium', 'Medium Risk');
    }
  };

  const badgeStyle = getRiskBadgeStyle();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('applications.visaRisk', 'Visa Risk')}
        </Text>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: badgeStyle.backgroundColor,
              borderColor: badgeStyle.borderColor,
            },
          ]}>
          <Icon
            name={
              riskLevel === 'low'
                ? 'trending-up'
                : riskLevel === 'high'
                  ? 'trending-down'
                  : 'remove'
            }
            size={14}
            color={badgeStyle.color}
            style={styles.badgeIcon}
          />
          <Text style={[styles.badgeText, {color: badgeStyle.color}]}>
            {getRiskLabel()}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.summaryText}>{summary}</Text>
        </View>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.recommendationsTitle}>
              {t('applications.recommendations', 'Recommendations')}
            </Text>
            {recommendations.map(rec => {
              const title =
                currentLanguage === 'uz'
                  ? rec.titleUz
                  : currentLanguage === 'ru'
                    ? rec.titleRu
                    : rec.titleEn;
              const details =
                currentLanguage === 'uz'
                  ? rec.detailsUz
                  : currentLanguage === 'ru'
                    ? rec.detailsRu
                    : rec.detailsEn;

              return (
                <View key={rec.id} style={styles.recommendationItem}>
                  <View style={styles.recommendationBullet} />
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>{title}</Text>
                    <Text style={styles.recommendationDetails}>{details}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    maxHeight: 400,
  },
  section: {
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  recommendationBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4A9EFF',
    marginTop: 6,
    marginRight: 12,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  recommendationDetails: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
