import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { useDocumentStore } from "../../store/documents";
import { colors } from "../../theme/colors";
import {
  getDocumentTypeLabel,
  formatFileSize,
  formatUploadDate,
  getStatusBadgeColor,
} from "../../utils/documentHelpers";

export const DocumentPreviewScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { documentId, applicationId } = route?.params || {};

  const {
    currentDocument,
    isLoading,
    getDocument,
    deleteDocument,
    updateDocumentStatus,
  } = useDocumentStore();

  const [document, setDocument] = useState<any>(null);

  useEffect(() => {
    if (documentId) {
      getDocument(documentId).then(() => {
        // Document is now in currentDocument from store
      });
    }
  }, [documentId]);

  // Update local state when store updates
  useEffect(() => {
    if (currentDocument && currentDocument.id === documentId) {
      setDocument(currentDocument);
    }
  }, [currentDocument]);

  const handleViewDocument = async () => {
    if (document?.fileUrl) {
      try {
        const supported = await Linking.canOpenURL(document.fileUrl);
        if (supported) {
          await Linking.openURL(document.fileUrl);
        } else {
          Alert.alert(
            "Cannot Open",
            "This file type cannot be opened in your device"
          );
        }
      } catch (error) {
        console.error("Error opening document:", error);
        Alert.alert("Error", "Could not open document");
      }
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Document",
      "Are you sure you want to delete this document?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await deleteDocument(documentId);
              Alert.alert("Success", "Document deleted successfully");
              navigation.goBack();
            } catch (error) {
              Alert.alert("Error", "Failed to delete document");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleVerify = () => {
    if (document?.status === "verified") {
      Alert.alert("Already Verified", "This document is already verified");
      return;
    }

    Alert.prompt(
      "Verify Document",
      "Add any verification notes (optional):",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Verify",
          onPress: async (notes) => {
            try {
              await updateDocumentStatus(documentId, "verified", notes);
              Alert.alert("Success", "Document marked as verified");
              navigation.goBack();
            } catch (error) {
              Alert.alert("Error", "Failed to verify document");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const handleReject = () => {
    Alert.prompt(
      "Reject Document",
      "Please provide a reason for rejection:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          onPress: async (reason) => {
            if (!reason?.trim()) {
              Alert.alert("Required", "Please provide a reason for rejection");
              return;
            }
            try {
              await updateDocumentStatus(documentId, "rejected", reason);
              Alert.alert("Success", "Document rejected");
              navigation.goBack();
            } catch (error) {
              Alert.alert("Error", "Failed to reject document");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  if (isLoading || !document) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.white,
          justifyContent: "center",
          alignItems: "center",
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <ActivityIndicator color={colors.black} size="large" />
      </View>
    );
  }

  const statusColors = getStatusBadgeColor(document.status);

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
        contentContainerStyle={{
          paddingHorizontal: colors.spacing[20],
          paddingVertical: colors.spacing[16],
        }}
      >
        {/* Header with Back Button */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: colors.spacing[24],
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginRight: colors.spacing[12] }}
          >
            <Icon name="chevron-back" size={28} color={colors.black} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: colors.typography.sizes.xl,
              fontWeight: colors.typography.weights.bold as any,
              color: colors.black,
              flex: 1,
            }}
          >
            Document Details
          </Text>
        </View>

        {/* Document Preview Area */}
        <View
          style={{
            backgroundColor: colors.gray[100],
            borderRadius: colors.radius[8],
            padding: colors.spacing[24],
            alignItems: "center",
            justifyContent: "center",
            height: 200,
            marginBottom: colors.spacing[24],
          }}
        >
          <Icon
            name={document.fileUrl?.includes(".pdf")
              ? "document-outline"
              : "image-outline"}
            size={64}
            color={colors.gray[400]}
          />
          <Text
            style={{
              fontSize: colors.typography.sizes.sm,
              color: colors.gray[600],
              marginTop: colors.spacing[12],
              textAlign: "center",
            }}
          >
            {document.fileUrl?.includes(".pdf") ? "PDF Document" : "Image Document"}
          </Text>
        </View>

        {/* Document Information */}
        <View
          style={{
            backgroundColor: colors.gray[50],
            borderRadius: colors.radius[8],
            padding: colors.spacing[16],
            marginBottom: colors.spacing[24],
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: colors.spacing[16],
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: colors.typography.sizes.sm,
                  color: colors.gray[600],
                  marginBottom: colors.spacing[4],
                }}
              >
                Document Type
              </Text>
              <Text
                style={{
                  fontSize: colors.typography.sizes.base,
                  fontWeight: colors.typography.weights.semibold as any,
                  color: colors.black,
                }}
              >
                {getDocumentTypeLabel(document.documentType)}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: statusColors.bg,
                paddingVertical: colors.spacing[6],
                paddingHorizontal: colors.spacing[12],
                borderRadius: colors.radius[4],
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Icon
                name={statusColors.icon}
                size={16}
                color={statusColors.text}
                style={{ marginRight: colors.spacing[4] }}
              />
              <Text
                style={{
                  fontSize: colors.typography.sizes.xs,
                  color: statusColors.text,
                  fontWeight: colors.typography.weights.semibold as any,
                  textTransform: "capitalize",
                }}
              >
                {document.status}
              </Text>
            </View>
          </View>

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.gray[200],
              paddingTop: colors.spacing[16],
            }}
          >
            <Text
              style={{
                fontSize: colors.typography.sizes.sm,
                color: colors.gray[600],
                marginBottom: colors.spacing[4],
              }}
            >
              File Name
            </Text>
            <Text
              style={{
                fontSize: colors.typography.sizes.sm,
                fontWeight: colors.typography.weights.medium as any,
                color: colors.black,
                marginBottom: colors.spacing[12],
              }}
            >
              {document.documentName}
            </Text>

            <Text
              style={{
                fontSize: colors.typography.sizes.sm,
                color: colors.gray[600],
                marginBottom: colors.spacing[4],
              }}
            >
              File Size
            </Text>
            <Text
              style={{
                fontSize: colors.typography.sizes.sm,
                fontWeight: colors.typography.weights.medium as any,
                color: colors.black,
                marginBottom: colors.spacing[12],
              }}
            >
              {formatFileSize(document.fileSize)}
            </Text>

            <Text
              style={{
                fontSize: colors.typography.sizes.sm,
                color: colors.gray[600],
                marginBottom: colors.spacing[4],
              }}
            >
              Uploaded
            </Text>
            <Text
              style={{
                fontSize: colors.typography.sizes.sm,
                fontWeight: colors.typography.weights.medium as any,
                color: colors.black,
              }}
            >
              {formatUploadDate(document.uploadedAt)}
            </Text>
          </View>
        </View>

        {/* Verification Notes */}
        {document.verificationNotes && (
          <View
            style={{
              backgroundColor: colors.warning[50],
              borderLeftWidth: 4,
              borderLeftColor: colors.warning[500],
              padding: colors.spacing[12],
              borderRadius: colors.radius[4],
              marginBottom: colors.spacing[24],
            }}
          >
            <Text
              style={{
                fontSize: colors.typography.sizes.xs,
                fontWeight: colors.typography.weights.semibold as any,
                color: colors.warning[700],
                marginBottom: colors.spacing[4],
              }}
            >
              Notes
            </Text>
            <Text
              style={{
                fontSize: colors.typography.sizes.sm,
                color: colors.warning[700],
              }}
            >
              {document.verificationNotes}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={{ gap: colors.spacing[12], marginBottom: colors.spacing[12] }}>
          <TouchableOpacity
            onPress={handleViewDocument}
            style={{
              backgroundColor: colors.black,
              paddingVertical: colors.spacing[12],
              borderRadius: colors.radius[8],
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              name="open-outline"
              size={20}
              color={colors.white}
              style={{ marginRight: colors.spacing[8] }}
            />
            <Text
              style={{
                fontSize: colors.typography.sizes.base,
                fontWeight: colors.typography.weights.semibold as any,
                color: colors.white,
              }}
            >
              View Document
            </Text>
          </TouchableOpacity>

          {document.status === "pending" && (
            <>
              <TouchableOpacity
                onPress={handleVerify}
                style={{
                  backgroundColor: colors.success[500],
                  paddingVertical: colors.spacing[12],
                  borderRadius: colors.radius[8],
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon
                  name="checkmark-outline"
                  size={20}
                  color={colors.white}
                  style={{ marginRight: colors.spacing[8] }}
                />
                <Text
                  style={{
                    fontSize: colors.typography.sizes.base,
                    fontWeight: colors.typography.weights.semibold as any,
                    color: colors.white,
                  }}
                >
                  Mark as Verified
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleReject}
                style={{
                  backgroundColor: colors.error[500],
                  paddingVertical: colors.spacing[12],
                  borderRadius: colors.radius[8],
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon
                  name="close-outline"
                  size={20}
                  color={colors.white}
                  style={{ marginRight: colors.spacing[8] }}
                />
                <Text
                  style={{
                    fontSize: colors.typography.sizes.base,
                    fontWeight: colors.typography.weights.semibold as any,
                    color: colors.white,
                  }}
                >
                  Reject Document
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={handleDelete}
            style={{
              backgroundColor: colors.error[50],
              borderWidth: 1,
              borderColor: colors.error[500],
              paddingVertical: colors.spacing[12],
              borderRadius: colors.radius[8],
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              name="trash-outline"
              size={20}
              color={colors.error[500]}
              style={{ marginRight: colors.spacing[8] }}
            />
            <Text
              style={{
                fontSize: colors.typography.sizes.base,
                fontWeight: colors.typography.weights.semibold as any,
                color: colors.error[500],
              }}
            >
              Delete Document
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};