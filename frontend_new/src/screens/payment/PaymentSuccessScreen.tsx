import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { usePaymentStore } from "../../store/payments";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../theme/colors";

interface ReceiptItem {
  label: string;
  value: string;
}

export default function PaymentSuccessScreen({ navigation, route }: any) {
  const { transactionId, applicationId } = route.params || {};
  const { getPaymentDetails, currentPayment, isLoading } = usePaymentStore();
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    if (transactionId) {
      loadPaymentDetails();
    }
  }, [transactionId]);

  const loadPaymentDetails = async () => {
    const payment = await getPaymentDetails(transactionId);
    if (payment) {
      setReceipt({
        transactionId: payment.transactionId || payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.paymentMethod,
        status: payment.status,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
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

  const handleContinue = () => {
    // Navigate to checkpoint or next step
    navigation.navigate("Checkpoint", { applicationId });
  };

  const handleDownloadReceipt = () => {
    Alert.alert(
      "Receipt",
      `Receipt for transaction ${receipt?.transactionId || "N/A"} will be sent to your email.`,
      [{ text: "OK" }]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.BLACK} />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSubtitle}>
            Your payment has been processed successfully
          </Text>
        </View>

        {/* Receipt Card */}
        {receipt && (
          <View style={styles.receiptCard}>
            <Text style={styles.receiptTitle}>Receipt Details</Text>

            <ReceiptRow
              label="Transaction ID"
              value={receipt.transactionId || "N/A"}
              copyable
            />
            <ReceiptRow label="Order ID" value={receipt.orderId || "N/A"} />
            <ReceiptRow
              label="Amount"
              value={`${receipt.currency} ${receipt.amount?.toFixed(2) || "0.00"}`}
              highlight
            />
            <ReceiptRow
              label="Payment Method"
              value={receipt.method?.charAt(0).toUpperCase() + receipt.method?.slice(1) || "N/A"}
            />
            <ReceiptRow label="Status" value="Completed" />
            <ReceiptRow label="Date & Time" value={formatDate(receipt.paidAt || receipt.createdAt)} />
          </View>
        )}

        {/* Information Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={24} color={COLORS.BLACK} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Receipt Email</Text>
              <Text style={styles.infoDescription}>
                A detailed receipt has been sent to your registered email address
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="lock-closed-outline" size={24} color={COLORS.BLACK} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Secure Payment</Text>
              <Text style={styles.infoDescription}>
                Your transaction is protected with industry-standard encryption
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={24} color={COLORS.BLACK} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Processing Time</Text>
              <Text style={styles.infoDescription}>
                Your visa application is now active. You can start uploading documents
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleContinue}
          >
            <Text style={styles.primaryButtonText}>Continue to Checkpoint</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleDownloadReceipt}
          >
            <Ionicons name="download-outline" size={20} color={COLORS.BLACK} />
            <Text style={styles.secondaryButtonText}>Download Receipt</Text>
          </TouchableOpacity>
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            If you have any questions about your payment, please contact our support team.
          </Text>
          <TouchableOpacity>
            <Text style={styles.helpLink}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

interface ReceiptRowProps {
  label: string;
  value: string;
  copyable?: boolean;
  highlight?: boolean;
}

function ReceiptRow({ label, value, copyable, highlight }: ReceiptRowProps) {
  const handleCopy = () => {
    Alert.alert("Copied", `${label}: ${value} copied to clipboard`);
  };

  return (
    <View style={[styles.receiptRow, highlight && styles.receiptRowHighlight]}>
      <Text style={[styles.receiptLabel, highlight && styles.receiptLabelHighlight]}>
        {label}
      </Text>
      <TouchableOpacity onPress={copyable ? handleCopy : undefined}>
        <Text
          style={[
            styles.receiptValue,
            highlight && styles.receiptValueHighlight,
          ]}
        >
          {value}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BG_PRIMARY,
  },
  scrollContainer: {
    paddingBottom: SPACING.XXL,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: TYPOGRAPHY.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },

  // Success Header
  successHeader: {
    alignItems: "center",
    paddingVertical: SPACING.XXL,
    paddingHorizontal: SPACING.LG,
  },
  iconContainer: {
    marginBottom: SPACING.LG,
  },
  successTitle: {
    fontSize: TYPOGRAPHY.SIZES.XXL,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  successSubtitle: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: "center",
  },

  // Receipt Card
  receiptCard: {
    marginHorizontal: SPACING.LG,
    marginVertical: SPACING.LG,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.LG,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.BG_SECONDARY,
  },
  receiptTitle: {
    fontSize: TYPOGRAPHY.SIZES.LG,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.LG,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  receiptRowHighlight: {
    backgroundColor: COLORS.GRAY_100,
    paddingHorizontal: SPACING.MD,
    marginHorizontal: -SPACING.LG,
    paddingLeft: SPACING.LG,
    paddingRight: SPACING.LG,
    borderRadius: RADIUS.SM,
    borderBottomWidth: 0,
  },
  receiptLabel: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  receiptLabelHighlight: {
    color: COLORS.TEXT_PRIMARY,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
  },
  receiptValue: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
    color: COLORS.TEXT_PRIMARY,
  },
  receiptValueHighlight: {
    fontSize: TYPOGRAPHY.SIZES.LG,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD as any,
    color: COLORS.BLACK,
  },

  // Info Section
  infoSection: {
    marginHorizontal: SPACING.LG,
    marginVertical: SPACING.LG,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.LG,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.BG_SECONDARY,
  },
  infoContent: {
    flex: 1,
    marginLeft: SPACING.LG,
  },
  infoTitle: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  infoDescription: {
    fontSize: TYPOGRAPHY.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },

  // Buttons
  buttonContainer: {
    marginHorizontal: SPACING.LG,
    marginVertical: SPACING.LG,
  },
  primaryButton: {
    backgroundColor: COLORS.BLACK,
    paddingVertical: SPACING.LG,
    borderRadius: RADIUS.MD,
    alignItems: "center",
    marginBottom: SPACING.MD,
  },
  primaryButtonText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
  },
  secondaryButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.BG_SECONDARY,
    paddingVertical: SPACING.LG,
    borderRadius: RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  secondaryButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
    marginLeft: SPACING.MD,
  },

  // Help Section
  helpSection: {
    marginHorizontal: SPACING.LG,
    marginVertical: SPACING.LG,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.LG,
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.BG_SECONDARY,
  },
  helpTitle: {
    fontSize: TYPOGRAPHY.SIZES.LG,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  helpText: {
    fontSize: TYPOGRAPHY.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.MD,
    lineHeight: 20,
  },
  helpLink: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
    color: COLORS.BLACK,
  },
});