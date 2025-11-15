import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  TextInput,
} from "react-native";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";

interface Document {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  documentName: string;
  documentType: string;
  applicationCountry: string;
  status: string;
  uploadedAt: string;
}

const AdminDocumentsScreen: React.FC<any> = ({ navigation }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [selectedAction, setSelectedAction] = useState<"verified" | "rejected" | null>(null);
  const [processedCount, setProcessedCount] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      setPage(0);
      setDocuments([]);
      setProcessedCount(0);
      fetchDocuments(0);
    }, [])
  );

  const fetchDocuments = async (pageNum: number) => {
    try {
      if (pageNum === 0) {
        setLoading(true);
      }
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://localhost:3000"}/api/admin/documents/verification-queue?skip=${pageNum * 20}&take=20`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (pageNum === 0) {
        setDocuments(response.data.data);
        setProcessedCount(0);
      } else {
        setDocuments((prev) => [...prev, ...response.data.data]);
      }

      setHasMore(response.data.data.length === 20);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    setDocuments([]);
    setProcessedCount(0);
    await fetchDocuments(0);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchDocuments(nextPage);
    }
  };

  const handleVerification = async (docId: string, status: "verified" | "rejected") => {
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_URL || "http://localhost:3000"}/api/admin/documents/${docId}/verify`,
        {
          status,
          notes: verificationNotes,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Remove verified/rejected document from list
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setProcessedCount((prev) => prev + 1);
      setModalVisible(false);
      setVerificationNotes("");
      setSelectedAction(null);
    } catch (error) {
      console.error("Error verifying document:", error);
    }
  };

  if (loading && documents.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading documents...</Text>
      </View>
    );
  }

  const renderDocItem = ({ item }: { item: Document }) => (
    <TouchableOpacity
      style={styles.docCard}
      onPress={() => {
        setSelectedDoc(item);
        setVerificationNotes("");
        setSelectedAction(null);
        setModalVisible(true);
      }}
    >
      <View style={styles.docHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.docName}>{item.documentName}</Text>
          <Text style={styles.docType}>{item.documentType}</Text>
        </View>
        <View style={styles.docBadge}>
          <Text style={styles.docBadgeText}>{item.applicationCountry}</Text>
        </View>
      </View>

      <View style={styles.docUser}>
        <Text style={styles.docUserName}>{item.userName}</Text>
        <Text style={styles.docUserEmail}>{item.userEmail}</Text>
      </View>

      <View style={styles.docFooter}>
        <Text style={styles.docDate}>
          Uploaded: {new Date(item.uploadedAt).toLocaleDateString()}
        </Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => {
              setSelectedDoc(item);
              setSelectedAction("verified");
              setVerificationNotes("");
              setModalVisible(true);
            }}
          >
            <Text style={styles.actionButtonText}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => {
              setSelectedDoc(item);
              setSelectedAction("rejected");
              setVerificationNotes("");
              setModalVisible(true);
            }}
          >
            <Text style={styles.actionButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Document Verification</Text>
          <Text style={styles.subtitle}>
            {documents.length} pending • {processedCount} processed
          </Text>
        </View>
      </View>

      {documents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>✓ All caught up!</Text>
          <Text style={styles.emptySubtitle}>
            No documents pending verification
          </Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          renderItem={renderDocItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={() =>
            loading && documents.length > 0 ? (
              <ActivityIndicator size="small" color="#007AFF" style={styles.loadMoreIndicator} />
            ) : null
          }
        />
      )}

      {/* Verification Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Document Verification</Text>
            <Text style={styles.modalSubtitle}>{selectedDoc?.documentName}</Text>

            <View style={styles.documentInfo}>
              <InfoRow label="Type" value={selectedDoc?.documentType || ""} />
              <InfoRow label="User" value={selectedDoc?.userEmail || ""} />
              <InfoRow label="Country" value={selectedDoc?.applicationCountry || ""} />
              <InfoRow
                label="Uploaded"
                value={
                  selectedDoc
                    ? new Date(selectedDoc.uploadedAt).toLocaleDateString()
                    : ""
                }
              />
            </View>

            {selectedAction && (
              <>
                <Text style={styles.notesLabel}>
                  {selectedAction === "verified"
                    ? "Verification Notes (optional)"
                    : "Rejection Reason (optional)"}
                </Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Enter notes..."
                  value={verificationNotes}
                  onChangeText={setVerificationNotes}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#999"
                />
              </>
            )}

            {!selectedAction ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButtonLarge, styles.approveButtonLarge]}
                  onPress={() => setSelectedAction("verified")}
                >
                  <Text style={styles.actionButtonLargeText}>✓ Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButtonLarge, styles.rejectButtonLarge]}
                  onPress={() => setSelectedAction("rejected")}
                >
                  <Text style={styles.actionButtonLargeText}>✕ Reject</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.actionButtonLarge,
                    selectedAction === "verified"
                      ? styles.approveButtonLarge
                      : styles.rejectButtonLarge,
                  ]}
                  onPress={() =>
                    selectedDoc && handleVerification(selectedDoc.id, selectedAction)
                  }
                >
                  <Text style={styles.actionButtonLargeText}>
                    Confirm {selectedAction}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButtonLarge, styles.cancelButtonLarge]}
                  onPress={() => setSelectedAction(null)}
                >
                  <Text style={styles.actionButtonLargeTextCancel}>Back</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.actionButtonLarge, styles.cancelButtonLarge]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.actionButtonLargeTextCancel}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#34C759",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  docCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  docHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  docName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  docType: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  docBadge: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  docBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  docUser: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  docUserName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  docUserEmail: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  docFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  docDate: {
    fontSize: 12,
    color: "#999",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  approveButton: {
    backgroundColor: "#34C759",
  },
  rejectButton: {
    backgroundColor: "#FF3B30",
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  loadMoreIndicator: {
    marginVertical: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "85%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
  },
  documentInfo: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    width: 80,
  },
  infoValue: {
    fontSize: 12,
    color: "#000",
    flex: 1,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: "#000",
    marginBottom: 16,
    textAlignVertical: "top",
  },
  actionButtonLarge: {
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 8,
  },
  approveButtonLarge: {
    backgroundColor: "#34C759",
  },
  rejectButtonLarge: {
    backgroundColor: "#FF3B30",
  },
  cancelButtonLarge: {
    backgroundColor: "#f0f0f0",
  },
  actionButtonLargeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  actionButtonLargeTextCancel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
  },
});

export default AdminDocumentsScreen;