import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTranslation} from 'react-i18next';
import {useDocumentStore} from '../../store/documents';
import {colors} from '../../theme/colors';
import {
  getDocumentTypeLabel,
  formatFileSize,
  getOCRStatusLabel,
  getOCRStatusBadgeColor,
} from '../../utils/documentHelpers';
import {
  pickFromCamera,
  pickFromGallery,
  pickDocument,
  prepareFileForUpload,
  isFileSizeValid,
  getFileSizeInMB,
  showFilePickerOptions,
} from '../../utils/mediaPickerHelpers';

export const DocumentUploadScreen = ({route, navigation}: any) => {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const applicationId = route?.params?.applicationId;
  const onUploadSuccess = route?.params?.onUploadSuccess;

  const {isLoading, uploadDocument, getRequiredDocuments, error, clearError} =
    useDocumentStore();

  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  useEffect(() => {
    if (applicationId) {
      getRequiredDocuments(applicationId).then(docs => {
        setRequiredDocs(docs);
      });
    }
  }, [applicationId]);

  // MEDIUM PRIORITY FIX: Validate file size immediately after selection to provide instant feedback
  // This prevents users from filling out the form only to discover the file is too large at upload time
  const handleCameraPress = async () => {
    const file = await pickFromCamera();
    if (file) {
      // Validate file size immediately after selection
      if (!isFileSizeValid(file.size || 0, 20)) {
        // LOW PRIORITY FIX: Use translation system for error messages
        Alert.alert(t('errors.fileTooLarge'), t('errors.fileTooLargeMessage'));
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleGalleryPress = async () => {
    const file = await pickFromGallery();
    if (file) {
      // Validate file size immediately after selection
      if (!isFileSizeValid(file.size || 0, 20)) {
        // LOW PRIORITY FIX: Use translation system for error messages
        Alert.alert(t('errors.fileTooLarge'), t('errors.fileTooLargeMessage'));
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDocumentPress = async () => {
    const file = await pickDocument();
    if (file) {
      // Validate file size immediately after selection
      if (!isFileSizeValid(file.size || 0, 20)) {
        // LOW PRIORITY FIX: Use translation system for error messages
        Alert.alert(t('errors.fileTooLarge'), t('errors.fileTooLargeMessage'));
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSelectFileSource = () => {
    showFilePickerOptions(
      handleCameraPress,
      handleGalleryPress,
      handleDocumentPress,
    );
  };

  const handleUpload = async () => {
    if (!selectedDocType) {
      // LOW PRIORITY FIX: Use translation system for error messages
      Alert.alert(
        t('errors.selectDocumentType'),
        t('errors.selectDocumentTypeMessage'),
      );
      return;
    }

    if (!selectedFile) {
      // LOW PRIORITY FIX: Use translation system for error messages
      Alert.alert(t('errors.selectFile'), t('errors.selectFileMessage'));
      return;
    }

    // MEDIUM PRIORITY FIX: File size is now validated immediately after selection
    // This check remains as a safety fallback, but should rarely trigger
    if (!isFileSizeValid(selectedFile.size || 0, 20)) {
      // LOW PRIORITY FIX: Use translation system for error messages
      Alert.alert(t('errors.fileTooLarge'), t('errors.fileTooLargeMessage'));
      return;
    }

    try {
      const fileToUpload = prepareFileForUpload(selectedFile);
      await uploadDocument(applicationId, selectedDocType, fileToUpload);
      // LOW PRIORITY FIX: Use translation system for success messages
      Alert.alert(t('common.success'), t('documents.uploadSuccess'));
      setSelectedDocType('');
      setSelectedFile(null);

      // CRITICAL FIX: Call success callback to force refresh checklist
      // Pass true to indicate force refresh is needed
      if (onUploadSuccess && typeof onUploadSuccess === 'function') {
        onUploadSuccess(true);
      }

      navigation.goBack();
    } catch (err: any) {
      // LOW PRIORITY FIX: Use translation system for error messages
      Alert.alert(t('common.error'), err.message || t('errors.uploadFailed'));
    }
  };

  const renderDocumentTypeButton = ({item}: {item: string}) => (
    <TouchableOpacity
      onPress={() => setSelectedDocType(item)}
      style={{
        paddingVertical: colors.spacing[12],
        paddingHorizontal: colors.spacing[16],
        marginRight: colors.spacing[8],
        marginBottom: colors.spacing[8],
        backgroundColor:
          selectedDocType === item ? colors.black : colors.gray[200],
        borderRadius: colors.radius[6],
      }}>
      <Text
        style={{
          fontSize: colors.typography.sizes.sm,
          color: selectedDocType === item ? colors.white : colors.black,
          fontWeight: colors.typography.weights.medium as any,
        }}>
        {getDocumentTypeLabel(item)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.white,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: colors.spacing[20],
          paddingVertical: colors.spacing[16],
        }}>
        {/* Header with Back Button */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: colors.spacing[24],
          }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{marginRight: colors.spacing[12]}}>
            <Icon name="chevron-back" size={28} color={colors.black} />
          </TouchableOpacity>
          <View style={{flex: 1}}>
            <Text
              style={{
                fontSize: colors.typography.sizes.xl,
                fontWeight: colors.typography.weights.bold as any,
                color: colors.black,
              }}>
              Upload Document
            </Text>
            <Text
              style={{
                fontSize: colors.typography.sizes.xs,
                color: colors.gray[600],
              }}>
              Select document type and file
            </Text>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View
            style={{
              backgroundColor: colors.error[50],
              borderLeftWidth: 4,
              borderLeftColor: colors.error[500],
              padding: colors.spacing[12],
              borderRadius: colors.radius[4],
              marginBottom: colors.spacing[16],
            }}>
            <Text
              style={{
                fontSize: colors.typography.sizes.sm,
                color: colors.error[700],
                marginBottom: colors.spacing[8],
              }}>
              {error}
            </Text>
            <TouchableOpacity onPress={clearError}>
              <Text
                style={{
                  fontSize: colors.typography.sizes.xs,
                  color: colors.error[600],
                  fontWeight: colors.typography.weights.semibold as any,
                }}>
                Dismiss
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Document Type Selection */}
        <View style={{marginBottom: colors.spacing[24]}}>
          <Text
            style={{
              fontSize: colors.typography.sizes.sm,
              fontWeight: colors.typography.weights.semibold as any,
              color: colors.black,
              marginBottom: colors.spacing[12],
            }}>
            Document Type
          </Text>
          {requiredDocs.length > 0 ? (
            <FlatList
              data={requiredDocs}
              renderItem={renderDocumentTypeButton}
              keyExtractor={item => item}
              scrollEnabled={false}
              numColumns={2}
            />
          ) : (
            <Text
              style={{
                fontSize: colors.typography.sizes.sm,
                color: colors.gray[600],
              }}>
              Loading required documents...
            </Text>
          )}
        </View>

        {/* File Selection Section */}
        <View
          style={{
            backgroundColor: colors.gray[50],
            borderWidth: 2,
            borderColor: selectedFile ? colors.success[200] : colors.gray[200],
            borderStyle: selectedFile ? 'solid' : 'dashed',
            borderRadius: colors.radius[8],
            padding: colors.spacing[24],
            alignItems: 'center',
            marginBottom: colors.spacing[24],
          }}>
          {selectedFile ? (
            <>
              <Icon
                name="checkmark-circle"
                size={48}
                color={colors.success[500]}
                style={{marginBottom: colors.spacing[12]}}
              />
              <Text
                style={{
                  fontSize: colors.typography.sizes.base,
                  fontWeight: colors.typography.weights.semibold as any,
                  color: colors.black,
                  marginBottom: colors.spacing[8],
                  textAlign: 'center',
                }}>
                {selectedFile.name}
              </Text>
              <Text
                style={{
                  fontSize: colors.typography.sizes.sm,
                  color: colors.gray[600],
                  marginBottom: colors.spacing[12],
                }}>
                {selectedFile.size
                  ? formatFileSize(selectedFile.size)
                  : 'Size unknown'}
              </Text>
              <TouchableOpacity
                onPress={handleSelectFileSource}
                style={{
                  paddingVertical: colors.spacing[8],
                  paddingHorizontal: colors.spacing[12],
                  backgroundColor: colors.gray[200],
                  borderRadius: colors.radius[4],
                }}>
                <Text
                  style={{
                    fontSize: colors.typography.sizes.sm,
                    color: colors.black,
                    fontWeight: colors.typography.weights.medium as any,
                  }}>
                  Change File
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Icon
                name="cloud-upload-outline"
                size={48}
                color={colors.gray[400]}
                style={{marginBottom: colors.spacing[12]}}
              />
              <Text
                style={{
                  fontSize: colors.typography.sizes.base,
                  fontWeight: colors.typography.weights.semibold as any,
                  color: colors.black,
                  marginBottom: colors.spacing[8],
                  textAlign: 'center',
                }}>
                Select a File
              </Text>
              <Text
                style={{
                  fontSize: colors.typography.sizes.sm,
                  color: colors.gray[600],
                  marginBottom: colors.spacing[16],
                  textAlign: 'center',
                }}>
                Choose from camera, gallery, or file picker
              </Text>
              <TouchableOpacity
                onPress={handleSelectFileSource}
                style={{
                  paddingVertical: colors.spacing[12],
                  paddingHorizontal: colors.spacing[24],
                  backgroundColor: colors.black,
                  borderRadius: colors.radius[6],
                }}>
                <Text
                  style={{
                    fontSize: colors.typography.sizes.sm,
                    fontWeight: colors.typography.weights.semibold as any,
                    color: colors.white,
                  }}>
                  Choose File
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Upload Button */}
        <TouchableOpacity
          onPress={handleUpload}
          disabled={isLoading || !selectedDocType || !selectedFile}
          style={{
            backgroundColor:
              isLoading || !selectedDocType || !selectedFile
                ? colors.gray[300]
                : colors.success[500],
            paddingVertical: colors.spacing[14],
            borderRadius: colors.radius[8],
            alignItems: 'center',
            marginBottom: colors.spacing[24],
          }}>
          {isLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text
              style={{
                fontSize: colors.typography.sizes.base,
                fontWeight: colors.typography.weights.semibold as any,
                color: colors.white,
              }}>
              Upload Document
            </Text>
          )}
        </TouchableOpacity>

        {/* OCR Processing Information */}
        <View
          style={{
            backgroundColor: getOCRStatusBadgeColor('pending').bg,
            borderLeftWidth: 4,
            borderLeftColor: getOCRStatusBadgeColor('pending').text,
            borderRadius: colors.radius[6],
            padding: colors.spacing[16],
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: colors.spacing[12],
            }}>
            <Icon
              name="information-circle"
              size={20}
              color={getOCRStatusBadgeColor('pending').text}
              style={{marginTop: colors.spacing[2]}}
            />
            <View style={{flex: 1}}>
              <Text
                style={{
                  fontSize: colors.typography.sizes.sm,
                  fontWeight: colors.typography.weights.semibold as any,
                  color: getOCRStatusBadgeColor('pending').text,
                  marginBottom: colors.spacing[4],
                }}>
                Document Processing
              </Text>
              <Text
                style={{
                  fontSize: colors.typography.sizes.xs,
                  color: getOCRStatusBadgeColor('pending').text,
                  lineHeight: 16,
                }}>
                After upload, your document will be processed for OCR (Optical
                Character Recognition). This helps extract and verify document
                information automatically.
              </Text>
            </View>
          </View>
        </View>

        {/* Info Text */}
        <Text
          style={{
            fontSize: colors.typography.sizes.xs,
            color: colors.gray[600],
            marginTop: colors.spacing[16],
            textAlign: 'center',
          }}>
          Maximum file size: 20 MB • Supported: PDF, JPEG, PNG, Word Documents
        </Text>
      </ScrollView>
    </View>
  );
};
