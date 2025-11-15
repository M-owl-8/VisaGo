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
  calculateProgressPercentage,
  groupDocumentsByStatus,
} from "../../utils/documentHelpers";

export const CheckpointScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const applicationId = route?.params?.applicationId;

  const {
    applicationDocuments,
    requiredDocuments,
    isLoading,
    loadApplicationDocuments,
    getRequiredDocuments,
  } = useDocumentStore();

  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);

  useEffect(() => {
    if (applicationId) {
      loadApplicationDocuments(applicationId);
      getRequiredDocuments(applicationId).then(setRequiredDocs);
    }
  }, [applicationId]);

  const appDocs = applicationId
    ? applicationDocuments[applicationId] || []
    : [];

  const grouped = groupDocumentsByStatus(appDocs, requiredDocs);
  const progressPercentage = calculateProgressPercentage(
    appDocs.length,
    requiredDocs.length
  );

  const handleUploadDocument = () => {
    navigation.navigate("DocumentUpload", { applicationId });
  };

  const handleDocumentPress = (document: any) => {
    navigation.navigate("DocumentPreview", {
      documentId: document.id,
      applicationId,
    });
  };

  const renderProgressBar = () => {
    return (
      <View
        style={{
          backgroundColor: colors.gray[100],
          borderRadius: colors.radius[8],
          height: 12,
          overflow: "hidden",
          marginBottom: colors.spacing[12],
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${progressPercentage}%`,
            backgroundColor: colors.success[500],
            borderRadius: colors.radius[8],
          }}
        />
      </View>
    );
  };

  const renderDocumentStatus = (status: string) => {
    const statusConfig = {
      verified: { icon: "checkmark-circle", color: colors.success[500] },
      pending: { icon: "hourglass", color: colors.warning[500] },
      rejected: { icon: "close-circle", color: colors.error[500] },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || {
      icon: "help-circle",
      color: colors.gray[400],
    };

    return (
      <Icon
        name={config.icon}
        size={20}
        color={config.color}
        style={{ marginRight: colors.spacing[8] }}
      />
    );
  };

  const renderDocumentItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => handleDocumentPress(item)}
      style={{
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray[200],
        borderRadius: colors.radius[8],
        padding: colors.spacing[16],
        marginBottom: colors.spacing[12],
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: colors.spacing[8] }}>
          {renderDocumentStatus(item.status)}
          <Text
            style={{
              fontSize: colors.typography.sizes.base,
              fontWeight: colors.typography.weights.semibold as any,
              color: colors.black,
            }}
          >
            {getDocumentTypeLabel(item.documentType)}
          </Text>
        </View>
        <Text
          style={{
            fontSize: colors.typography.sizes.xs,
            color: colors.gray[600],
          }}
        >
          {item.documentName}
        </Text>
      </View>
      <Icon name="chevron-forward" size={24} color={colors.gray[400]} />
    </TouchableOpacity>
  );

  const renderMissingDocumentItem = ({ item }: { item: string }) => (
    <View
      style={{
        backgroundColor: colors.gray[50],
        borderWidth: 1,
        borderColor: colors.gray[200],
        borderRadius: colors.radius[8],
        padding: colors.spacing[16],
        marginBottom: colors.spacing[12],
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Icon
        name="document-outline"
        size={20}
        color={colors.gray[400]}
        style={{ marginRight: colors.spacing[12] }}
      />
      <Text
        style={{
          fontSize: colors.typography.sizes.base,
          color: colors.gray[600],
        }}
      >
        {getDocumentTypeLabel(item)}
      </Text>
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
        contentContainerStyle={{
          paddingHorizontal: colors.spacing[20],
          paddingVertical: colors.spacing[16],
        }}
      >
        {/* Header */}
        <View style={{ marginBottom: colors.spacing[24] }}>
          <Text
            style={{
              fontSize: colors.typography.sizes.xl,
              fontWeight: colors.typography.weights.bold as any,
              color: colors.black,
              marginBottom: colors.spacing[8],
            }}
          >
            Document Checkpoint
          </Text>
          <Text
            style={{
              fontSize: colors.typography.sizes.sm,
              color: colors.gray[600],
            }}
          >
            Complete your document requirements
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator
            color={colors.black}
            size="large"
            style={{ marginVertical: colors.spacing[32] }}
          />
        ) : (
          <>
            {/* Progress Section */}
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
                  marginBottom: colors.spacing[12],
                }}
              >
                <Text
                  style={{
                    fontSize: colors.typography.sizes.sm,
                    fontWeight: colors.typography.weights.semibold as any,
                    color: colors.black,
                  }}
                >
                  Progress
                </Text>
                <Text
                  style={{
                    fontSize: colors.typography.sizes.sm,
                    fontWeight: colors.typography.weights.semibold as any,
                    color: colors.success[500],
                  }}
                >
                  {progressPercentage}% Complete
                </Text>
              </View>
              {renderProgressBar()}
              <Text
                style={{
                  fontSize: colors.typography.sizes.xs,
                  color: colors.gray[600],
                }}
              >
                {appDocs.length} of {requiredDocs.length} documents
              </Text>
            </View>

            {/* Status Summary */}
            <View
              style={{
                flexDirection: "row",
                gap: colors.spacing[12],
                marginBottom: colors.spacing[24],
              }}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.success[50],
                  borderRadius: colors.radius[8],
                  padding: colors.spacing[12],
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: colors.typography.sizes.xl,
                    fontWeight: colors.typography.weights.bold as any,
                    color: colors.success[500],
                  }}
                >
                  {grouped.verified.length}
                </Text>
                <Text
                  style={{
                    fontSize: colors.typography.sizes.xs,
                    color: colors.success[700],
                  }}
                >
                  Verified
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.warning[50],
                  borderRadius: colors.radius[8],
                  padding: colors.spacing[12],
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: colors.typography.sizes.xl,
                    fontWeight: colors.typography.weights.bold as any,
                    color: colors.warning[500],
                  }}
                >
                  {grouped.pending.length}
                </Text>
                <Text
                  style={{
                    fontSize: colors.typography.sizes.xs,
                    color: colors.warning[700],
                  }}
                >
                  Pending
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.error[50],
                  borderRadius: colors.radius[8],
                  padding: colors.spacing[12],
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: colors.typography.sizes.xl,
                    fontWeight: colors.typography.weights.bold as any,
                    color: colors.error[500],
                  }}
                >
                  {grouped.rejected.length}
                </Text>
                <Text
                  style={{
                    fontSize: colors.typography.sizes.xs,
                    color: colors.error[700],
                  }}
                >
                  Rejected
                </Text>
              </View>
            </View>

            {/* Upload Button */}
            {grouped.missing.length > 0 && (
              <TouchableOpacity
                onPress={handleUploadDocument}
                style={{
                  backgroundColor: colors.primary,
                  paddingVertical: colors.spacing[14],
                  borderRadius: colors.radius[8],
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: colors.spacing[24],
                }}
              >
                <Icon
                  name="cloud-upload-outline"
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
                  Upload Document
                </Text>
              </TouchableOpacity>
            )}

            {/* Uploaded Documents */}
            {appDocs.length > 0 && (
              <View>
                <Text
                  style={{
                    fontSize: colors.typography.sizes.sm,
                    fontWeight: colors.typography.weights.semibold as any,
                    color: colors.black,
                    marginBottom: colors.spacing[12],
                  }}
                >
                  Uploaded Documents ({appDocs.length})
                </Text>
                <FlatList
                  data={appDocs}
                  renderItem={renderDocumentItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* Missing Documents */}
            {grouped.missing.length > 0 && (
              <View style={{ marginTop: colors.spacing[24] }}>
                <Text
                  style={{
                    fontSize: colors.typography.sizes.sm,
                    fontWeight: colors.typography.weights.semibold as any,
                    color: colors.black,
                    marginBottom: colors.spacing[12],
                  }}
                >
                  Still Needed ({grouped.missing.length})
                </Text>
                <FlatList
                  data={grouped.missing}
                  renderItem={renderMissingDocumentItem}
                  keyExtractor={(item) => item}
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* Empty State */}
            {appDocs.length === 0 && (
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: colors.spacing[48],
                }}
              >
                <Icon
                  name="folder-outline"
                  size={64}
                  color={colors.gray[300]}
                  style={{ marginBottom: colors.spacing[16] }}
                />
                <Text
                  style={{
                    fontSize: colors.typography.sizes.base,
                    fontWeight: colors.typography.weights.semibold as any,
                    color: colors.gray[600],
                    marginBottom: colors.spacing[8],
                  }}
                >
                  No Documents Yet
                </Text>
                <Text
                  style={{
                    fontSize: colors.typography.sizes.sm,
                    color: colors.gray[600],
                    textAlign: "center",
                  }}
                >
                  Start by uploading the required documents for your visa
                  application.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};