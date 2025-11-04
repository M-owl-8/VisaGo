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
import { Ionicons } from "@expo/vector-icons";
import { usePaymentStore } from "../../store/payments";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../theme/colors";

interface ErrorDetails {
  code?: string;
  reason?: string;
  timestamp?: string;
  supportCode?: string;
}

export default function PaymentFailedScreen({ navigation, route }: any) {
  const { transactionId, applicationId, errorMessage, errorCode } = route.params || {};
  const { getPaymentDetails, currentPayment, isLoading } = usePaymentStore();
  const [errorDetails, setErrorDetails] = useState<ErrorDetails>({
    code: errorCode || "PAYMENT_FAILED",
    reason: errorMessage || "Your payment could not be processed",
    timestamp: new Date().toISOString(),
    supportCode: `ERR-${Date.now()}`,
  });

  useEffect(() => {
    if (transactionId) {
      loadPaymentDetails();
    }
  }, [transactionId]);

  const loadPaymentDetails = async () => {
    const payment = await getPaymentDetails(transactionId);
    if (payment) {
      console.log("Payment details:", payment);
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

  const getErrorMessage = (code: string) => {
    const messages: { [key: string]: string } = {
      PAYMENT_FAILED: "Your payment could not be processed. Please try again.",
      INSUFFICIENT_FUNDS: "Insufficient funds in your account or payment method.",
      CARD_DECLINED: "Your card was declined. Please check your card details.",
      INVALID_CARD: "Invalid card information. Please verify your payment details.",
      EXPIRED_CARD: "Your card has expired. Please use a different card.",
      TRANSACTION_TIMEOUT: "The payment process timed out. Please try again.",
      INVALID_CVV: "Invalid CVV. Please check your card security code.",
      USER_CANCELLED: "You cancelled the payment process.",
      NETWORK_ERROR: "Network connection error. Please check your connection.",
      INVALID_AMOUNT: "Invalid payment amount. Please try again.",
    };
    return messages[code] || "An error occurred during payment processing.";
  };

  const handleRetry = () => {
    // Return to PaymentScreen with retry flag
    navigation.navigate("Payment", {
      applicationId,
      retry: true,
    });
  };

  const handleContactSupport = () => {
    Alert.alert(
      "Contact Support",
      "Our support team will assist you with your payment issue.",
      [
        {
          text: "Email Support",
          onPress: () => {
            // In real app, would open email client
            Alert.alert("Support", "Email: support@visabuddy.com");
          },
        },
        {
          text: "Call Support",
          onPress: () => {
            Alert.alert("Support", "Phone: +1-234-567-8900");
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handleGoHome = () => {
    navigation.navigate("Home");
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.BLACK} />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Error Header */}
        <View style={styles.errorHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="close-circle" size={80} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Payment Failed</Text>
          <Text style={styles.errorSubtitle}>
            {getErrorMessage(errorDetails.code || "")}
          </Text>
        </View>

        {/* Error Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Error Details</Text>

          <DetailRow label="Error Code" value={errorDetails.code || "N/A"} />
          <DetailRow label="Support Code" value={errorDetails.supportCode || "N/A"} copyable />
          <DetailRow label="Timestamp" value={formatDate(errorDetails.timestamp || "")} />
          {transactionId && <DetailRow label="Transaction ID" value={transactionId} copyable />}
        </View>

        {/* Common Solutions */}
        <View style={styles.solutionsSection}>
          <Text style={styles.solutionsTitle}>Common Solutions</Text>

          <SolutionItem
            icon="card-outline"
            title="Check Your Payment Method"
            description="Verify that your card/account details are correct and not expired"
          />

          <SolutionItem
            icon="checkmark-circle-outline"
            title="Verify Account Balance"
            description="Ensure you have sufficient funds for the transaction"
          />

          <SolutionItem
            icon="refresh-outline"
            title="Try Again"
            description="Retry the payment with the same or different payment method"
          />

          <SolutionItem
            icon="information-circle-outline"
            title="Contact Your Bank"
            description="Your bank might be blocking the transaction for security reasons"
          />
        </View>

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.securityText}>
            Your payment information is safe. No charges have been made to your account.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Ionicons name="refresh-outline" size={20} color={COLORS.WHITE} />
            <Text style={styles.retryButtonText}>Retry Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleContactSupport}>
            <Ionicons name="help-circle-outline" size={20} color={COLORS.TEXT_PRIMARY} />
            <Text style={styles.secondaryButtonText}>Contact Support</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tertiaryButton} onPress={handleGoHome}>
            <Text style={styles.tertiaryButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Why Did This Happen?</Text>
          <Text style={styles.helpText}>
            Payment failures can occur due to various reasons including insufficient funds,
            incorrect card details, expired cards, network issues, or security blocks from your
            bank. Please review the error code and try again.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  copyable?: boolean;
}

function DetailRow({ label, value, copyable }: DetailRowProps) {
  const handleCopy = () => {
    Alert.alert("Copied", `${label}: ${value}`);
  };

  return (
    <TouchableOpacity
      style={styles.detailRow}
      onPress={copyable ? handleCopy : undefined}
    >
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={styles.detailValue}>{value}</Text>
        {copyable && <Ionicons name="copy" size={16} color={COLORS.TEXT_SECONDARY} style={{ marginLeft: SPACING.SM }} />}
      </View>
    </TouchableOpacity>
  );
}

interface SolutionItemProps {
  icon: string;
  title: string;
  description: string;
}

function SolutionItem({ icon, title, description }: SolutionItemProps) {
  return (
    <View style={styles.solutionItem}>
      <View style={styles.solutionIcon}>
        <Ionicons name={icon as any} size={24} color={COLORS.TEXT_PRIMARY} />
      </View>
      <View style={styles.solutionContent}>
        <Text style={styles.solutionTitle}>{title}</Text>
        <Text style={styles.solutionDescription}>{description}</Text>
      </View>
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

  // Error Header
  errorHeader: {
    alignItems: "center",
    paddingVertical: SPACING.XXL,
    paddingHorizontal: SPACING.LG,
  },
  iconContainer: {
    marginBottom: SPACING.LG,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.SIZES.XXL,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD as any,
    color: "#EF4444",
    marginBottom: SPACING.SM,
  },
  errorSubtitle: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 22,
  },

  // Details Card
  detailsCard: {
    marginHorizontal: SPACING.LG,
    marginVertical: SPACING.LG,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.LG,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.BG_SECONDARY,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.SIZES.LG,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.LG,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  detailValue: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
    color: COLORS.TEXT_PRIMARY,
  },

  // Solutions Section
  solutionsSection: {
    marginHorizontal: SPACING.LG,
    marginVertical: SPACING.LG,
  },
  solutionsTitle: {
    fontSize: TYPOGRAPHY.SIZES.LG,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.LG,
  },
  solutionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.LG,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.BG_SECONDARY,
  },
  solutionIcon: {
    marginRight: SPACING.LG,
  },
  solutionContent: {
    flex: 1,
  },
  solutionTitle: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  solutionDescription: {
    fontSize: TYPOGRAPHY.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },

  // Security Info
  securityInfo: {
    flexDirection: "row",
    marginHorizontal: SPACING.LG,
    marginVertical: SPACING.LG,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.BG_SECONDARY,
    alignItems: "center",
  },
  securityText: {
    fontSize: TYPOGRAPHY.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.MD,
    flex: 1,
  },

  // Buttons
  buttonContainer: {
    marginHorizontal: SPACING.LG,
    marginVertical: SPACING.LG,
    gap: SPACING.MD,
  },
  retryButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.BLACK,
    paddingVertical: SPACING.LG,
    borderRadius: RADIUS.MD,
  },
  retryButtonText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
    marginLeft: SPACING.MD,
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
  tertiaryButton: {
    paddingVertical: SPACING.LG,
    alignItems: "center",
  },
  tertiaryButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
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
    lineHeight: 20,
  },
});