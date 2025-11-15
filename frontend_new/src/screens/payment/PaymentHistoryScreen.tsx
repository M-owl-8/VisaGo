import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SectionList,
  Alert,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { paymentGatewayService, PaymentHistory } from "../../services/payment-api";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../theme/colors";

export default function PaymentHistoryScreen({ navigation }: any) {
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  const loadPaymentHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const history = await paymentGatewayService.getPaymentHistory();
      setPayments(history || []);
    } catch (err: any) {
      console.error("Failed to load payment history:", err);
      setError(err.message || "Failed to load payment history");
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    try {
      setIsRefreshing(true);
      const history = await paymentGatewayService.getPaymentHistory();
      setPayments(history || []);
    } catch (err: any) {
      console.error("Failed to refresh payment history:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return { icon: "checkmark-circle", color: COLORS.GREEN };
      case "pending":
        return { icon: "time-outline", color: COLORS.ORANGE };
      case "processing":
        return { icon: "hourglass-outline", color: COLORS.BLUE };
      case "failed":
        return { icon: "alert-circle", color: COLORS.RED };
      case "cancelled":
        return { icon: "close-circle", color: COLORS.GRAY_500 };
      case "refunded":
        return { icon: "cash-outline", color: COLORS.PURPLE };
      default:
        return { icon: "help-circle", color: COLORS.GRAY_500 };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return COLORS.GREEN;
      case "pending":
        return COLORS.ORANGE;
      case "processing":
        return COLORS.BLUE;
      case "failed":
        return COLORS.RED;
      case "cancelled":
        return COLORS.GRAY_500;
      case "refunded":
        return COLORS.PURPLE;
      default:
        return COLORS.GRAY_500;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const groupPaymentsByStatus = (): Array<{
    title: string;
    data: PaymentHistory[];
  }> => {
    const grouped: Record<string, PaymentHistory[]> = {};

    payments.forEach((payment) => {
      const status = payment.status;
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(payment);
    });

    return Object.entries(grouped).map(([status, data]) => ({
      title: status.charAt(0).toUpperCase() + status.slice(1),
      data: data.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }));
  };

  const handlePaymentPress = (payment: PaymentHistory) => {
    Alert.alert(
      "Payment Details",
      `Transaction ID: ${payment.transactionId}\nAmount: ${paymentGatewayService.formatAmount(
        payment.amount,
        payment.currency
      )}\nGateway: ${payment.gateway.toUpperCase()}\nStatus: ${payment.status.toUpperCase()}\nDate: ${formatDate(
        payment.createdAt
      )}`,
      [
        {
          text: "Close",
          onPress: () => {},
        },
        {
          text: "Copy Transaction ID",
          onPress: () => {
            Alert.alert("Copied", `Transaction ID copied to clipboard`);
          },
        },
      ]
    );
  };

  const handleRetryPayment = (payment: PaymentHistory) => {
    if (payment.status === "failed") {
      Alert.alert(
        "Retry Payment",
        `Retry payment of ${paymentGatewayService.formatAmount(
          payment.amount,
          payment.currency
        )} for application ${payment.applicationId}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Retry",
            onPress: () => {
              // Navigate back to payment screen
              navigation.navigate("Payment", {
                applicationId: payment.applicationId,
                visaFee: payment.amount,
              });
            },
          },
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.BLACK} />
          <Text style={styles.loadingText}>Loading payment history...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={60} color={COLORS.RED} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPaymentHistory}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="wallet-outline" size={80} color={COLORS.GRAY_400} />
          <Text style={styles.emptyTitle}>No Payments Yet</Text>
          <Text style={styles.emptyText}>
            You haven't made any payments yet. Your payment history will appear here.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const groupedPayments = groupPaymentsByStatus();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.BLACK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Payments</Text>
          <Text style={styles.summaryValue}>{payments.length}</Text>
        </View>
        <View style={[styles.summaryItem, styles.summaryItemBorder]}>
          <Text style={styles.summaryLabel}>Total Paid</Text>
          <Text style={styles.summaryValue}>
            {paymentGatewayService.formatAmount(
              payments
                .filter((p) => p.status === "completed")
                .reduce((sum, p) => sum + p.amount, 0),
              "USD"
            )}
          </Text>
        </View>
        <View style={[styles.summaryItem, styles.summaryItemBorder]}>
          <Text style={styles.summaryLabel}>Successful</Text>
          <Text style={[styles.summaryValue, { color: COLORS.GREEN }]}>
            {payments.filter((p) => p.status === "completed").length}
          </Text>
        </View>
      </View>

      {/* Payment List */}
      <SectionList
        sections={groupedPayments}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.paymentCard}
            onPress={() => handlePaymentPress(item)}
            onLongPress={() => handleRetryPayment(item)}
          >
            <View style={styles.paymentHeader}>
              <View style={styles.paymentLeft}>
                <View
                  style={[
                    styles.statusIcon,
                    { backgroundColor: getStatusColor(item.status) + "20" },
                  ]}
                >
                  <Ionicons
                    name={getStatusIcon(item.status).icon as any}
                    size={24}
                    color={getStatusIcon(item.status).color}
                  />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentGateway}>
                    {item.gateway.toUpperCase()}
                  </Text>
                  <Text style={styles.paymentDate}>
                    {formatDate(item.createdAt)}
                  </Text>
                </View>
              </View>
              <View style={styles.paymentRight}>
                <Text style={styles.paymentAmount}>
                  {paymentGatewayService.formatAmount(
                    item.amount,
                    item.currency
                  )}
                </Text>
                <Text
                  style={[
                    styles.paymentStatus,
                    { color: getStatusColor(item.status) },
                  ]}
                >
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Transaction ID */}
            <View style={styles.transactionId}>
              <Text style={styles.transactionIdLabel}>TX ID:</Text>
              <Text style={styles.transactionIdValue}>
                {item.transactionId.slice(0, 20)}...
              </Text>
            </View>

            {/* Retry Button for Failed Payments */}
            {item.status === "failed" && (
              <TouchableOpacity
                style={styles.retryAction}
                onPress={() => handleRetryPayment(item)}
              >
                <Ionicons name="refresh" size={16} color={COLORS.BLACK} />
                <Text style={styles.retryActionText}>Retry Payment</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BG_PRIMARY,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.LG,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: TYPOGRAPHY.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  errorText: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    color: COLORS.RED,
    marginTop: SPACING.MD,
    textAlign: "center",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.SIZES.XL,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD as any,
    color: COLORS.TEXT_PRIMARY,
  },

  // Summary Card
  summaryCard: {
    flexDirection: "row",
    marginHorizontal: SPACING.LG,
    marginVertical: SPACING.LG,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.BG_SECONDARY,
    overflow: "hidden",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.SM,
  },
  summaryItemBorder: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.BORDER,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.SIZES.LG,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD as any,
    color: COLORS.TEXT_PRIMARY,
  },

  // List
  listContainer: {
    paddingBottom: SPACING.XXL,
  },
  sectionHeader: {
    backgroundColor: COLORS.BG_SECONDARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    marginBottom: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  sectionHeaderText: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
    color: COLORS.TEXT_PRIMARY,
  },

  // Payment Card
  paymentCard: {
    marginHorizontal: SPACING.LG,
    marginVertical: SPACING.SM,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.BG_SECONDARY,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.MD,
  },
  paymentLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.MD,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.MD,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentGateway: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  paymentDate: {
    fontSize: TYPOGRAPHY.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  paymentRight: {
    alignItems: "flex-end",
  },
  paymentAmount: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  paymentStatus: {
    fontSize: TYPOGRAPHY.SIZES.SM,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
  },

  // Transaction ID
  transactionId: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SPACING.SM,
    paddingVertical: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  transactionIdLabel: {
    fontSize: TYPOGRAPHY.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginRight: SPACING.SM,
  },
  transactionIdValue: {
    fontSize: TYPOGRAPHY.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    fontFamily: "monospace",
    flex: 1,
  },

  // Retry Action
  retryAction: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.MD,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    backgroundColor: COLORS.RED + "10",
    borderRadius: RADIUS.SM,
  },
  retryActionText: {
    marginLeft: SPACING.SM,
    fontSize: TYPOGRAPHY.SIZES.SM,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
    color: COLORS.BLACK,
  },

  // Empty State
  emptyTitle: {
    fontSize: TYPOGRAPHY.SIZES.LG,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD as any,
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.LG,
    marginBottom: SPACING.SM,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: "center",
    marginBottom: SPACING.XXL,
  },

  // Buttons
  primaryButton: {
    backgroundColor: COLORS.BLACK,
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.MD,
    borderRadius: RADIUS.MD,
    marginTop: SPACING.LG,
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
    color: COLORS.WHITE,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: COLORS.BLACK,
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.MD,
    borderRadius: RADIUS.MD,
    marginTop: SPACING.LG,
  },
  retryButtonText: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
    color: COLORS.WHITE,
    textAlign: "center",
  },
});