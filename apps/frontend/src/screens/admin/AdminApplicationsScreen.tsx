import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
} from "react-native";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";

interface Application {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  countryName: string;
  visaTypeName: string;
  status: string;
  progressPercentage: number;
  documentCount: number;
  verifiedDocuments: number;
  paymentStatus: string;
  paymentAmount: number;
  submissionDate: string | null;
  createdAt: string;
}

const AdminApplicationsScreen: React.FC<any> = ({ navigation }) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");

  useFocusEffect(
    React.useCallback(() => {
      setPage(0);
      setApplications([]);
      fetchApplications(0);
    }, [])
  );

  const fetchApplications = async (pageNum: number) => {
    try {
      if (pageNum === 0) {
        setLoading(true);
      }
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://localhost:3000"}/api/admin/applications?skip=${pageNum * 20}&take=20`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (pageNum === 0) {
        setApplications(response.data.data);
      } else {
        setApplications((prev) => [...prev, ...response.data.data]);
      }
      setHasMore(response.data.data.length === 20);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    setApplications([]);
    await fetchApplications(0);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchApplications(nextPage);
    }
  };

  const handleStatusChange = async (appId: string, status: string) => {
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_URL || "http://localhost:3000"}/api/admin/applications/${appId}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status } : a))
      );
      setModalVisible(false);
    } catch (error) {
      console.error("Error updating application status:", error);
    }
  };

  if (loading && applications.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading applications...</Text>
      </View>
    );
  }

  const renderAppItem = ({ item }: { item: Application }) => (
    <TouchableOpacity
      style={styles.appCard}
      onPress={() => {
        setSelectedApp(item);
        setNewStatus(item.status);
        setModalVisible(true);
      }}
    >
      <View style={styles.appHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.appCountry}>{item.countryName}</Text>
          <Text style={styles.appType}>{item.visaTypeName}</Text>
          <Text style={styles.appUser}>{item.userEmail}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.appProgress}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${item.progressPercentage}%`,
                backgroundColor: getProgressColor(item.progressPercentage),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{item.progressPercentage}% Complete</Text>
      </View>

      <View style={styles.appStats}>
        <StatItem
          label={`Documents (${item.verifiedDocuments}/${item.documentCount})`}
          value={`${item.verifiedDocuments} verified`}
        />
        <StatItem
          label="Payment"
          value={`${item.paymentStatus === "no_payment" ? "Not Paid" : item.paymentStatus} - $${item.paymentAmount.toFixed(2)}`}
        />
      </View>

      <Text style={styles.appDate}>
        Created: {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Applications</Text>
        <Text style={styles.subtitle}>{applications.length} total</Text>
      </View>

      <FlatList
        data={applications}
        keyExtractor={(item) => item.id}
        renderItem={renderAppItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={() =>
          loading && applications.length > 0 ? (
            <ActivityIndicator size="small" color="#007AFF" style={styles.loadMoreIndicator} />
          ) : null
        }
      />

      {/* Status Change Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Application Status</Text>
            <Text style={styles.modalSubtitle}>
              {selectedApp?.countryName} - {selectedApp?.visaTypeName}
            </Text>

            {["draft", "submitted", "approved", "rejected", "expired"].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusOption,
                  newStatus === status && styles.statusOptionSelected,
                ]}
                onPress={() => setNewStatus(status)}
              >
                <View
                  style={[
                    styles.statusRadio,
                    newStatus === status && styles.statusRadioSelected,
                  ]}
                />
                <View style={styles.statusOptionContent}>
                  <Text style={styles.statusOptionText}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                  <View
                    style={[
                      styles.miniStatusBadge,
                      { backgroundColor: getStatusColor(status) },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() =>
                selectedApp && handleStatusChange(selectedApp.id, newStatus)
              }
            >
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonTextCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const StatItem = ({ label, value }: { label: string; value: string | number }) => (
  <View style={styles.statItem}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const getStatusColor = (status: string) => {
  switch (status) {
    case "draft":
      return "#999";
    case "submitted":
      return "#007AFF";
    case "approved":
      return "#34C759";
    case "rejected":
      return "#FF3B30";
    case "expired":
      return "#FF9500";
    default:
      return "#999";
  }
};

const getProgressColor = (progress: number) => {
  if (progress < 33) return "#FF3B30";
  if (progress < 66) return "#FF9500";
  return "#34C759";
};

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
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  appCard: {
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
  appHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  appCountry: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  appType: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  appUser: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  appProgress: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
  },
  appStats: {
    flexDirection: "row",
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    marginRight: 8,
  },
  statLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
  },
  appDate: {
    fontSize: 12,
    color: "#999",
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
    width: "80%",
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
    marginBottom: 16,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  statusOptionSelected: {
    backgroundColor: "#e3f2fd",
  },
  statusRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#999",
    marginRight: 12,
  },
  statusRadioSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#007AFF",
  },
  statusOptionContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusOptionText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
  },
  miniStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniStatusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  modalButton: {
    backgroundColor: "#007AFF",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 12,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#f0f0f0",
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
  },
});

export default AdminApplicationsScreen;