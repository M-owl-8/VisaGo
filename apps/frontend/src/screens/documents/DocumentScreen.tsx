import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { useDocumentStore } from "../../store/documents";
import { colors } from "../../theme/colors";
import {
  getDocumentTypeLabel,
  formatFileSize,
} from "../../utils/documentHelpers";
import {
  pickFromCamera,
  pickFromGallery,
  pickDocument,
  prepareFileForUpload,
  isFileSizeValid,
  showFilePickerOptions,
} from "../../utils/mediaPickerHelpers";

export const DocumentScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const applicationId = route?.params?.applicationId;

  const {
    applicationDocuments,
    documents,
    isLoading,
    error,
    loadApplicationDocuments,
    uploadDocument,
    deleteDocument,
    clearError,
    getRequiredDocuments,
  } = useDocumentStore();

  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);

  useEffect(() => {
    if (applicationId) {
      loadApplicationDocuments(applicationId);
      getRequiredDocuments(applicationId).then(setRequiredDocs);
    }
  }, [applicationId]);

  const appDocs = applicationId
    ? applicationDocuments[applicationId] || []
    : documents || [];

  const handleCameraPress = async () => {
    const file = await pickFromCamera();
    if (file) {
      await uploadSelectedFile(file);
    }
  };

  const handleGalleryPress = async () => {
    const file = await pickFromGallery();
    if (file) {
      await uploadSelectedFile(file);
    }
  };

  const handleDocumentPress = async () => {
    const file = await pickDocument();
    if (file) {
      await uploadSelectedFile(file);
    }
  };

  const uploadSelectedFile = async (file: any) => {
    if (!selectedDocType) {
      Alert.alert("Select Document Type", "Please select a document type first");
      return;
    }

    if (!isFileSizeValid(file.size || 0, 20)) {
      Alert.alert("File Too Large", "File size must be less than 20 MB");
      return;
    }

    try {
      setIsUploading(true);
      const fileToUpload = prepareFileForUpload(file);
      await uploadDocument(applicationId || "", selectedDocType, fileToUpload);
      Alert.alert("Success", "Document uploaded successfully");
      setSelectedDocType("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickFile = () => {
    showFilePickerOptions(
      handleCameraPress,
      handleGalleryPress,
      handleDocumentPress
    );
  };

  const handleDeleteDocument = (docId: string) => {
    Alert.alert("Delete Document", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        onPress: () => deleteDocument(docId),
        style: "destructive",
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return colors.success[500];
      case "rejected":
        return colors.error[500];
      default:
        return colors.warning[500];
    }
  };

  const renderDocumentItem = ({ item }: { item: any }) => (
    <View
      style={{
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray[200],
        borderRadius: colors.radius[8],
        padding: colors.spacing[16],
        marginBottom: colors.spacing[12],
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: colors.typography.sizes.base,
              fontWeight: colors.typography.weights.semibold as any,
              color: colors.black,
              marginBottom: colors.spacing[4],
            }}
          >
            {item.documentName}
          </Text>
          <Text
            style={{
              fontSize: colors.typography.sizes.sm,
              color: colors.gray[600],
              marginBottom: colors.spacing[8],
            }}
          >
            {item.documentType.replace(/_/g, " ")} •{" "}
            {(item.fileSize / 1024 / 1024).toFixed(2)} MB
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: colors.spacing[8],
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: getStatusColor(item.status),
              }}
            />
            <Text
              style={{
                fontSize: colors.typography.sizes.xs,
                color: colors.gray[700],
                textTransform: "capitalize",
              }}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => handleDeleteDocument(item.id)}
          style={{
            padding: colors.spacing[8],
          }}
        >
          <Text style={{ fontSize: 20, color: colors.error[500] }}>×</Text>
        </TouchableOpacity>
      </View>

      {item.verificationNotes && (
        <Text
          style={{
            fontSize: colors.typography.sizes.xs,
            color: colors.gray[600],
            marginTop: colors.spacing[8],
            fontStyle: "italic",
          }}
        >
          {item.verificationNotes}
        </Text>
      )}
    </View>
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.white,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: colors.spacing[20] }}
      >
        {/* Header */}
        <View style={{ marginTop: colors.spacing[16], marginBottom: colors.spacing[24] }}>
          <Text
            style={{
              fontSize: colors.typography.sizes.xl,
              fontWeight: colors.typography.weights.bold as any,
              color: colors.black,
              marginBottom: colors.spacing[8],
            }}
          >
            Documents
          </Text>
          <Text
            style={{
              fontSize: colors.typography.sizes.sm,
              color: colors.gray[600],
            }}
          >
            Upload and manage your application documents
          </Text>
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
            }}
          >
            <Text
              style={{
                fontSize: colors.typography.sizes.sm,
                color: colors.error[700],
              }}
            >
              {error}
            </Text>
            <TouchableOpacity
              onPress={clearError}
              style={{ marginTop: colors.spacing[8] }}
            >
              <Text
                style={{
                  fontSize: colors.typography.sizes.xs,
                  color: colors.error[600],
                  fontWeight: colors.typography.weights.semibold as any,
                }}
              >
                Dismiss
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upload Section */}
        <View
          style={{
            backgroundColor: colors.gray[50],
            borderWidth: 1,
            borderColor: colors.gray[200],
            borderRadius: colors.radius[8],
            padding: colors.spacing[16],
            marginBottom: colors.spacing[24],
          }}
        >
          <Text
            style={{
              fontSize: colors.typography.sizes.sm,
              fontWeight: colors.typography.weights.semibold as any,
              color: colors.black,
              marginBottom: colors.spacing[12],
            }}
          >
            Upload New Document
          </Text>

          {/* Document Type Selection */}
          <View style={{ marginBottom: colors.spacing[12] }}>
            <Text
              style={{
                fontSize: colors.typography.sizes.xs,
                color: colors.gray[700],
                marginBottom: colors.spacing[8],
                fontWeight: colors.typography.weights.medium as any,
              }}
            >
              Document Type
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -colors.spacing[16] }}
              contentContainerStyle={{ paddingHorizontal: colors.spacing[16] }}
            >
              {documentTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => setSelectedDocType(type.id)}
                  style={{
                    paddingVertical: colors.spacing[8],
                    paddingHorizontal: colors.spacing[12],
                    marginRight: colors.spacing[8],
                    backgroundColor:
                      selectedDocType === type.id ? colors.black : colors.gray[200],
                    borderRadius: colors.radius[6],
                  }}
                >
                  <Text
                    style={{
                      fontSize: colors.typography.sizes.xs,
                      color:
                        selectedDocType === type.id ? colors.white : colors.black,
                      fontWeight: colors.typography.weights.medium as any,
                    }}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Upload Button */}
          <TouchableOpacity
            onPress={handlePickFile}
            disabled={isUploading || !selectedDocType}
            style={{
              backgroundColor:
                isUploading || !selectedDocType ? colors.gray[300] : colors.black,
              paddingVertical: colors.spacing[12],
              borderRadius: colors.radius[6],
              alignItems: "center",
            }}
          >
            {isUploading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text
                style={{
                  fontSize: colors.typography.sizes.sm,
                  fontWeight: colors.typography.weights.semibold as any,
                  color: colors.white,
                }}
              >
                Choose File & Upload
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Documents List */}
        <View>
          <Text
            style={{
              fontSize: colors.typography.sizes.sm,
              fontWeight: colors.typography.weights.semibold as any,
              color: colors.black,
              marginBottom: colors.spacing[12],
            }}
          >
            Your Documents ({appDocs.length})
          </Text>

          {isLoading ? (
            <ActivityIndicator
              color={colors.black}
              size="large"
              style={{ marginVertical: colors.spacing[32] }}
            />
          ) : appDocs.length === 0 ? (
            <View
              style={{
                backgroundColor: colors.gray[50],
                borderWidth: 1,
                borderColor: colors.gray[200],
                borderRadius: colors.radius[8],
                padding: colors.spacing[24],
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: colors.typography.sizes.base,
                  color: colors.gray[600],
                }}
              >
                No documents uploaded yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={appDocs}
              renderItem={renderDocumentItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
};