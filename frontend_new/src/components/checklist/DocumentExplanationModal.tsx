/**
 * Document Explanation Modal Component (Mobile)
 * Displays "Why?" explanation for documents with Where to obtain, Common mistakes, and Tips
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTranslation} from 'react-i18next';

interface DocumentChecklistItem {
  name: string;
  nameUz?: string;
  nameRu?: string;
  description?: string;
  descriptionUz?: string;
  descriptionRu?: string;
  whereToObtain?: string;
  whereToObtainUz?: string;
  whereToObtainRu?: string;
  commonMistakes?: string;
  commonMistakesUz?: string;
  commonMistakesRu?: string;
}

interface DocumentExplanationModalProps {
  visible: boolean;
  onClose: () => void;
  item: DocumentChecklistItem | null;
  language?: string;
}

export function DocumentExplanationModal({
  visible,
  onClose,
  item,
  language = 'en',
}: DocumentExplanationModalProps) {
  const {t} = useTranslation();

  if (!item) return null;

  // Get localized text
  const name =
    language === 'uz'
      ? item.nameUz || item.name
      : language === 'ru'
        ? item.nameRu || item.name
        : item.name;

  const description =
    language === 'uz'
      ? item.descriptionUz || item.description
      : language === 'ru'
        ? item.descriptionRu || item.description
        : item.description;

  const commonMistakes =
    language === 'uz'
      ? item.commonMistakesUz || item.commonMistakes
      : language === 'ru'
        ? item.commonMistakesRu || item.commonMistakes
        : item.commonMistakes;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {t('applications.whyDoINeedThis', 'Why do I need this document?')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}>
            {/* Document Name */}
            <Text style={styles.documentName}>{name}</Text>

            {/* Description */}
            {description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('applications.whyThisDocument', 'Why this document?')}
                </Text>
                <Text style={styles.sectionText}>{description}</Text>
              </View>
            )}

            {/* Common Mistakes */}
            {commonMistakes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('applications.commonMistakes', 'Common mistakes')}
                </Text>
                <Text style={styles.sectionText}>{commonMistakes}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
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
    maxHeight: '85%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  documentName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
