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
} from "react-native";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";

interface Payment {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  countryName: string;
  paidAt: string | null;
  createdAt: string;
}

const AdminPaymentsScreen: React.FC<any> = ({ navigation }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [stats, setStats] = useState({
    completed: 0,
    pending: 0,
    failed: 0,
    refunded: 0,
  });

  useFocusEffect(
    React.useCallback(() => {
      setPage(0);
      setPayments([]);
      fetchPayments(0);
    }, [])
  );

  const fetchPayments = async (pageNum: number) => {
    try {
      if (pageNum === 0) {
        setLoading(true);
      }
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://localhost:3000"}/api/admin/payments?skip=${pageNum * 20}&take=20`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const paymentData = response.data.data;

      if (pageNum === 0) {
        setPayments(paymentData);
      } else {
        setPayments((prev) => [...prev, ...paymentData]);
      }

      // Calculate stats
      const completedAmount = paymentData
        .filter((p: Payment) => p.status === "completed")
        .reduce((sum: number, p: Payment) => sum + p.amount, 0);

      if (pageNum === 0) {
        setTotalRevenue(completedAmount);
        const statusCounts = {
          completed: paymentData.filter((p: Payment) => p.status === "completed").length,
          pending: paymentData.filter((p: Payment) => p.status === "pending").length,
          failed: paymentData.filter((p: Payment) => p.status === "failed").length,
          refunded: paymentData.filter((p: Payment) => p.status === "refunded").length,
        };
        setStats(statusCounts);
      }

      setHasMore(paymentData.length === 20);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    setPayments([]);
    await fetchPayments(0);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPayments(nextPage);
    }
  };

  if (loading && payments.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading payments...</Text>
      </View>
    );
  }

  const renderPaymentItem = ({ item }: { item: Payment }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.paymentCountry}>{item.countryName}</Text>
          <Text style={styles.paymentEmail}>{item.userEmail}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.paymentAmount}>
        <Text style={styles.amountValue}>
          {item.currency} {item.amount.toFixed(2)}
        </Text>
      </View>

      <View style={styles.paymentDetails}>
        <DetailItem
          label="Payment Method"
          value={item.paymentMethod.toUpperCase()}
        />
        <DetailItem
          label="Created"
          value={new Date(item.createdAt).toLocaleDateString()}
        />
        {item.paidAt && (
          <DetailItem
            label="Paid"
            value={new Date(item.paidAt).toLocaleDateString()}
          />
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payments</Text>
        <Text style={styles.subtitle}>Revenue Tracking</Text>
      </View>

      {/* Summary Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.summaryScroll}
        contentContainerStyle={styles.summaryContent}
      >
        <SummaryCard label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} color="#34C759" />
        <SummaryCard label="Completed" value={stats.completed} color="#34C759" />
        <SummaryCard label="Pending" value={stats.pending} color="#FF9500" />
        <SummaryCard label="Failed" value={stats.failed} color="#FF3B30" />
        <SummaryCard label="Refunded" value={stats.refunded} color="#5856D6" />
      </ScrollView>

      {/* Payments List */}
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        renderItem={renderPaymentItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={() =>
          loading && payments.length > 0 ? (
            <ActivityIndicator size="small" color="#007AFF" style={styles.loadMoreIndicator} />
          ) : null
        }
      />
    </View>
  );
};

const SummaryCard = ({ label, value, color }: any) => (
  <View style={styles.summaryCard}>
    <View style={[styles.summaryColorBar, { backgroundColor: color }]} />
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailItem}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "#FF9500";
    case "completed":
      return "#34C759";
    case "failed":
      return "#FF3B30";
    case "refunded":
      return "#5856D6";
    default:
      return "#999";
  }
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
  summaryScroll: {
    maxHeight: 140,
  },
  summaryContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    width: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryColorBar: {
    height: 3,
    borderRadius: 1.5,
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  paymentCard: {
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
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  paymentCountry: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  paymentEmail: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
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
  paymentAmount: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  amountValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#34C759",
  },
  paymentDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  detailItem: {
    width: "50%",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },
  loadMoreIndicator: {
    marginVertical: 16,
  },
});

export default AdminPaymentsScreen;