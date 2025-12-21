/**
 * Application Type Modal Component
 * Displays three options when user clicks "Start New Application":
 * 1. Start Visa Application
 * 2. Apply to Universities
 * 3. Job Contract
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import {AppIcon, IconSizes, IconColors} from '../icons/AppIcon';
import {useTranslation} from 'react-i18next';

interface ApplicationTypeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectVisa: () => void;
  onSelectUniversities: () => void;
  onSelectJobContract: () => void;
}

export function ApplicationTypeModal({
  visible,
  onClose,
  onSelectVisa,
  onSelectUniversities,
  onSelectJobContract,
}: ApplicationTypeModalProps) {
  const {t} = useTranslation();

  const handleSelectVisa = () => {
    onClose();
    onSelectVisa();
  };

  const handleSelectUniversities = () => {
    onClose();
    onSelectUniversities();
  };

  const handleSelectJobContract = () => {
    onClose();
    onSelectJobContract();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {t(
                'applications.selectApplicationType',
                'Select Application Type',
              )}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <AppIcon
                name="close-outline"
                library="ionicons"
                size={IconSizes.settings}
                color={IconColors.bright}
              />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* Visa Application Option */}
            <TouchableOpacity
              style={styles.optionCard}
              onPress={handleSelectVisa}
              activeOpacity={0.7}>
              <View style={styles.optionIconContainer}>
                <AppIcon
                  name="document-text-outline"
                  library="ionicons"
                  size={IconSizes.large}
                  color="#4A9EFF"
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>
                  {t(
                    'applications.startVisaApplication',
                    'Start Visa Application',
                  )}
                </Text>
                <Text style={styles.optionDescription}>
                  {t(
                    'applications.visaApplicationDescription',
                    'Create a new visa application and get personalized document checklist',
                  )}
                </Text>
              </View>
              <AppIcon
                name="chevron-forward-outline"
                library="ionicons"
                size={IconSizes.settings}
                color={IconColors.muted}
              />
            </TouchableOpacity>

            {/* Universities Option */}
            <TouchableOpacity
              style={styles.optionCard}
              onPress={handleSelectUniversities}
              activeOpacity={0.7}>
              <View style={styles.optionIconContainer}>
                <AppIcon
                  name="school"
                  library="ionicons"
                  size={IconSizes.large}
                  color="#4A9EFF"
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>
                  {t(
                    'applications.applyToUniversities',
                    'Apply to Universities',
                  )}
                </Text>
                <Text style={styles.optionDescription}>
                  {t(
                    'applications.universitiesDescription',
                    'Apply to universities and manage your applications',
                  )}
                </Text>
              </View>
              <AppIcon
                name="chevron-forward-outline"
                library="ionicons"
                size={IconSizes.settings}
                color={IconColors.muted}
              />
            </TouchableOpacity>

            {/* Job Contract Option */}
            <TouchableOpacity
              style={styles.optionCard}
              onPress={handleSelectJobContract}
              activeOpacity={0.7}>
              <View style={styles.optionIconContainer}>
                <AppIcon
                  name="briefcase"
                  library="ionicons"
                  size={IconSizes.large}
                  color="#4A9EFF"
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>
                  {t('applications.jobContract', 'Job Contract')}
                </Text>
                <Text style={styles.optionDescription}>
                  {t(
                    'applications.jobContractDescription',
                    'Find and apply for job contracts',
                  )}
                </Text>
              </View>
              <AppIcon
                name="chevron-forward-outline"
                library="ionicons"
                size={IconSizes.settings}
                color={IconColors.muted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0F1E2D',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 158, 255, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 30, 45, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.2)',
    gap: 16,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.4)',
  },
  optionContent: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
});
