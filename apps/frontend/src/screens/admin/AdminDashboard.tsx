import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";

interface DashboardMetrics {
  totalUsers: number;
  totalApplications: number;
  totalRevenue: number;
  totalDocumentsVerified: number;
  applicationsBreakdown: {
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
    expired: number;
  };
  paymentBreakdown: {
    pending: number;
    completed: number;
    failed: number;
    refunded: number;
  };
  revenueByCountry: Array<{
    country: string;
    revenue: number;
    applicationCount: number;
  }>;
  documentStats: {
    pendingVerification: number;
    verificationRate: number;
    averageUploadTime: number;
  };
}

const AdminDashboard: React.FC<any> = ({ navigation }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchMetrics();
    }, [])
  );

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_API_URL || "http://localhost:3000"}/api/admin/dashboard`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setMetrics(response.data);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const StatCard = ({ label, value, subtext, color = "#007AFF" }: any) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {subtext && <Text style={styles.statSubtext}>{subtext}</Text>}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>System Overview & Analytics</Text>
      </View>

      {/* Key Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          <StatCard label="Total Users" value={metrics?.totalUsers || 0} color="#007AFF" />
          <StatCard label="Total Applications" value={metrics?.totalApplications || 0} color="#34C759" />
          <StatCard label="Total Revenue" value={`$${(metrics?.totalRevenue || 0).toFixed(2)}`} color="#FF9500" />
          <StatCard label="Verified Documents" value={metrics?.totalDocumentsVerified || 0} color="#5856D6" />
        </View>
      </View>

      {/* Application Status Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Application Status</Text>
        <View style={styles.breakdownContainer}>
          <BreakdownItem
            label="Draft"
            value={metrics?.applicationsBreakdown.draft || 0}
            color="#999"
          />
          <BreakdownItem
            label="Submitted"
            value={metrics?.applicationsBreakdown.submitted || 0}
            color="#007AFF"
          />
          <BreakdownItem
            label="Approved"
            value={metrics?.applicationsBreakdown.approved || 0}
            color="#34C759"
          />
          <BreakdownItem
            label="Rejected"
            value={metrics?.applicationsBreakdown.rejected || 0}
            color="#FF3B30"
          />
          <BreakdownItem
            label="Expired"
            value={metrics?.applicationsBreakdown.expired || 0}
            color="#FF9500"
          />
        </View>
      </View>

      {/* Payment Status Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Status</Text>
        <View style={styles.breakdownContainer}>
          <BreakdownItem
            label="Pending"
            value={metrics?.paymentBreakdown.pending || 0}
            color="#FF9500"
          />
          <BreakdownItem
            label="Completed"
            value={metrics?.paymentBreakdown.completed || 0}
            color="#34C759"
          />
          <BreakdownItem
            label="Failed"
            value={metrics?.paymentBreakdown.failed || 0}
            color="#FF3B30"
          />
          <BreakdownItem
            label="Refunded"
            value={metrics?.paymentBreakdown.refunded || 0}
            color="#5856D6"
          />
        </View>
      </View>

      {/* Document Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Document Statistics</Text>
        <View style={styles.breakdownContainer}>
          <BreakdownItem
            label="Pending Verification"
            value={metrics?.documentStats.pendingVerification || 0}
            color="#FF9500"
          />
          <BreakdownItem
            label="Verification Rate"
            value={`${(metrics?.documentStats.verificationRate || 0).toFixed(1)}%`}
            color="#34C759"
          />
        </View>
      </View>

      {/* Top Countries by Revenue */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Countries by Revenue</Text>
        <View style={styles.listContainer}>
          {metrics?.revenueByCountry.map((country, index) => (
            <View key={index} style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <Text style={styles.listItemTitle}>{country.country}</Text>
                <Text style={styles.listItemSubtext}>{country.applicationCount} applications</Text>
              </View>
              <Text style={styles.listItemValue}>${country.revenue.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Management</Text>
        <AdminButton
          title="👥 Users Management"
          onPress={() => navigation.navigate("AdminUsers")}
        />
        <AdminButton
          title="📋 Applications"
          onPress={() => navigation.navigate("AdminApplications")}
        />
        <AdminButton
          title="💳 Payments"
          onPress={() => navigation.navigate("AdminPayments")}
        />
        <AdminButton
          title="📄 Document Verification"
          onPress={() => navigation.navigate("AdminDocuments")}
        />
        <AdminButton
          title="📊 Analytics & Tracking"
          onPress={() => navigation.navigate("AdminAnalytics")}
        />
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const BreakdownItem = ({ label, value, color }: any) => (
  <View style={styles.breakdownItem}>
    <View style={[styles.colorBadge, { backgroundColor: color }]} />
    <View style={styles.breakdownItemContent}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
  </View>
);

const AdminButton = ({ title, onPress }: any) => (
  <TouchableOpacity style={styles.adminButton} onPress={onPress}>
    <Text style={styles.adminButtonText}>{title}</Text>
  </TouchableOpacity>
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
    paddingBottom: 8,
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
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 11,
    color: "#999",
  },
  breakdownContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    overflow: "hidden",
  },
  breakdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  colorBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  breakdownItemContent: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 14,
    color: "#000",
    fontWeight: "500",
  },
  breakdownValue: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  listContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  listItemLeft: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  listItemSubtext: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  listItemValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF9500",
  },
  adminButton: {
    backgroundColor: "#007AFF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  adminButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  bottomSpacer: {
    height: 40,
  },
});

export default AdminDashboard;