/**
 * Form Filling Screen
 * AI-powered form pre-filling and completion
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { apiClient } from '../../services/api';
import { useAuthStore } from '../../store/auth';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'date' | 'number' | 'select' | 'textarea';
  value?: string | number | null;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface FormTemplate {
  id: string;
  title: string;
  fields: FormField[];
  instructions?: string;
}

interface PreFilledForm {
  template: FormTemplate;
  preFilledData: Record<string, any>;
  confidence: number;
  missingFields: string[];
  suggestions: Record<string, string>;
}

export default function FormFillingScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { countryId, visaTypeId, applicationId } = route.params as any;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});

  useEffect(() => {
    loadForm();
  }, []);

  const loadForm = async () => {
    try {
      setLoading(true);

      // Get pre-filled form
      const response = await apiClient.post('/forms/prefill', {
        countryId,
        visaTypeId,
      });

      if (response.success && response.data) {
        const preFilled: PreFilledForm = response.data;
        setTemplate(preFilled.template);
        setFormData(preFilled.preFilledData);
        setSuggestions(preFilled.suggestions);
      }
    } catch (error) {
      console.error('Error loading form:', error);
      Alert.alert('Error', 'Failed to load form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSave = async () => {
    try {
      if (!applicationId) {
        Alert.alert('Error', 'Application ID is required');
        return;
      }

      const response = await apiClient.post(`/forms/${applicationId}/save`, {
        formData,
      });

      if (response.success) {
        Alert.alert('Success', 'Form saved successfully');
      }
    } catch (error) {
      console.error('Error saving form:', error);
      Alert.alert('Error', 'Failed to save form. Please try again.');
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Validate form
      const validationResponse = await apiClient.post('/forms/validate', {
        countryId,
        visaTypeId,
        formData,
      });

      if (!validationResponse.success || !validationResponse.data.isValid) {
        const errors = validationResponse.data?.errors || {};
        const errorMessages = Object.values(errors).join('\n');
        Alert.alert('Validation Error', errorMessages);
        return;
      }

      // Save form first
      if (applicationId) {
        await apiClient.post(`/forms/${applicationId}/save`, { formData });
      }

      // Submit form
      const submitResponse = await apiClient.post(
        `/forms/${applicationId}/submit`,
        { submissionMethod: 'download' }
      );

      if (submitResponse.success) {
        Alert.alert(
          'Success',
          'Form submitted successfully!',
          [
            {
              text: 'Download PDF',
              onPress: () => {
                // Navigate to download screen
                navigation?.navigate('DocumentPreview', {
                  url: submitResponse.data.pdfUrl,
                });
              },
            },
            {
              text: 'OK',
              onPress: () => navigation?.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      Alert.alert('Error', 'Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name] || '';
    const suggestion = suggestions[field.name];

    return (
      <View key={field.name} style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>
          {field.label}
          {field.required && <Text style={styles.required}> *</Text>}
        </Text>

        {suggestion && !value && (
          <View style={styles.suggestionContainer}>
            <Icon name="bulb-outline" size={16} color="#FFA726" />
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </View>
        )}

        {field.type === 'textarea' ? (
          <TextInput
            style={[styles.input, styles.textarea]}
            value={value}
            onChangeText={(text) => handleFieldChange(field.name, text)}
            placeholder={field.placeholder}
            multiline
            numberOfLines={4}
          />
        ) : field.type === 'select' ? (
          <TouchableOpacity style={styles.selectInput}>
            <Text style={value ? styles.selectText : styles.selectPlaceholder}>
              {value || field.placeholder || 'Select...'}
            </Text>
            <Icon name="chevron-down" size={20} color="#757575" />
          </TouchableOpacity>
        ) : (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={(text) => handleFieldChange(field.name, text)}
            placeholder={field.placeholder}
            keyboardType={
              field.type === 'email'
                ? 'email-address'
                : field.type === 'number'
                ? 'numeric'
                : 'default'
            }
          />
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <Text style={styles.loadingText}>Loading form...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!template) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>Form Not Found</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Icon name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Form</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {template.instructions && (
          <View style={styles.instructionsContainer}>
            <Icon name="information-circle-outline" size={20} color="#1E88E5" />
            <Text style={styles.instructionsText}>{template.instructions}</Text>
          </View>
        )}

        {template.fields.map((field) => renderField(field))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleSave}
          disabled={submitting}
        >
          <Text style={styles.secondaryButtonText}>Save Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Submit</Text>
              <Icon name="checkmark-circle" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  instructionsContainer: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
  },
  suggestionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    gap: 6,
  },
  suggestionText: {
    flex: 1,
    fontSize: 12,
    color: '#E65100',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#212121',
    backgroundColor: '#FFFFFF',
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top',
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  selectText: {
    fontSize: 16,
    color: '#212121',
  },
  selectPlaceholder: {
    fontSize: 16,
    color: '#9E9E9E',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1E88E5',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#757575',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#757575',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginTop: 16,
    marginBottom: 24,
  },
});




