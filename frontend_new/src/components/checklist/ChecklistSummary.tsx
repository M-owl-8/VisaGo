/**
 * Checklist Summary Component (Mobile)
 * Displays stats: Total, Uploaded, Verified, Completion percentage
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTranslation} from 'react-i18next';

interface ChecklistItem {
  category: 'required' | 'highly_recommended' | 'optional';
  status?: 'missing' | 'pending' | 'verified' | 'rejected';
}

interface ChecklistSummaryProps {
  items: ChecklistItem[];
  className?: string;
}

export function ChecklistSummary({items}: ChecklistSummaryProps) {
  const {t} = useTranslation();

  // Calculate stats
  const requiredItems = items.filter(item => item.category === 'required');
  const totalRequired = requiredItems.length;
  const totalItems = items.length; // Total count of all items
  // Uploaded = items with status !== 'missing'
  const uploadedCount = items.filter(
    item => item.status !== 'missing' && item.status !== undefined,
  ).length;
  // Verified = items with status === 'verified'
  const verifiedCount = items.filter(item => item.status === 'verified').length;
  // Completion percentage is based on required items only
  const completionPercentage =
    totalRequired > 0 ? Math.round((verifiedCount / totalRequired) * 100) : 0;

  const stats = [
    {
      label: t('checklist.summary.total', 'Total'),
      value: totalItems,
      icon: 'document-text-outline' as const,
      color: '#FFFFFF',
    },
    {
      label: t('checklist.summary.uploaded', 'Uploaded'),
      value: uploadedCount,
      icon: 'cloud-upload-outline' as const,
      color: '#93C5FD',
    },
    {
      label: t('checklist.summary.verified', 'Verified'),
      value: verifiedCount,
      icon: 'checkmark-circle-outline' as const,
      color: '#34D399',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('checklist.summary.title', 'Checklist Summary')}
        </Text>
        <View style={styles.completionBadge}>
          <Text style={styles.completionText}>{completionPercentage}%</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statItem}>
            <Icon name={stat.icon} size={20} color={stat.color} />
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          </View>
        ))}
      </View>
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
    marginHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completionBadge: {
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.3)',
  },
  completionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A9EFF',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
});
