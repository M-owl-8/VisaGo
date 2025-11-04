import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePaymentStore } from "../../store/payments";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../theme/colors";

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export default function PaymentScreen({ navigation, route }: any) {
  const { applicationId, visaFee, countryName, visaTypeName } = route.params || {};
  const { initiatePayment, verifyPayment, isLoading, error, clearError } = usePaymentStore();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  const [verificationInterval, setVerificationInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const paymentMethods: PaymentMethod[] = [
    {
      id: "payme",
      name: "Payme",
      icon: "💳",
      description: "Pay with Payme wallet or card",
    },
    {
      id: "click",
      name: "Click",
      icon: "🏦",
      description: "Central Asian payment system",
    },
    {
      id: "uzum",
      name: "Uzum",
      icon: "📱",
      description: "Mobile payment service",
    },
  ];

  useEffect(() => {
    return () => {
      if (verificationInterval) {
        clearInterval(verificationInterval);
      }
    };
  }, [verificationInterval]);

  const handleInitiatePayment = async (method: PaymentMethod) => {
    if (!applicationId || !visaFee) {
      Alert.alert("Error", "Application ID and visa fee are required");
      return;
    }

    setSelectedMethod(method);

    try {
      const returnUrl = `${Platform.OS === "ios" ? "visabuddy://" : "visabuddy://"}payment/return`;
      // Pass the payment method to the backend
      const paymentLink = await initiatePayment(applicationId, returnUrl, method.id);

      if (paymentLink) {
        setTransactionId(paymentLink.transactionId);
        setPaymentUrl(paymentLink.paymentUrl);

        // Handle different payment gateways
        if (paymentLink.paymentUrl) {
          const canOpen = await Linking.canOpenURL(paymentLink.paymentUrl);
          if (canOpen) {
            await Linking.openURL(paymentLink.paymentUrl);

            // Start polling for payment verification
            startPaymentVerification(paymentLink.transactionId);
          } else {
            Alert.alert("Error", `Cannot open ${method.name} payment link`);
          }
        } else {
          Alert.alert("Error", "No payment URL received from server");
        }
      }
    } catch (err: any) {
      Alert.alert("Payment Error", error || "Failed to initiate payment");
      setSelectedMethod(null);
    }
  };

  const startPaymentVerification = (txId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes with 2-second intervals

    const interval = setInterval(async () => {
      attempts++;

      if (attempts > maxAttempts) {
        clearInterval(interval);
        setVerificationInterval(null);
        return;
      }

      const isVerified = await verifyPayment(txId);

      if (isVerified) {
        setPaymentStatus("completed");
        clearInterval(interval);
        setVerificationInterval(null);

        Alert.alert("Payment Successful", "Your payment has been completed successfully!", [
          {
            text: "OK",
            onPress: () => {
              navigation.goBack();
            },
          },
        ]);
      }
    }, 2000); // Check every 2 seconds

    setVerificationInterval(interval);
  };

  if (paymentStatus === "completed" && transactionId) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={COLORS.BLACK} />
          </View>
          <Text style={styles.successTitle}>Payment Successful</Text>
          <Text style={styles.successSubtitle}>
            Your visa application fee has been paid successfully
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              navigation.goBack();
            }}
          >
            <Text style={styles.primaryButtonText}>Back to Application</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.BLACK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Application Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Country</Text>
            <Text style={styles.detailValue}>{countryName || "N/A"}</Text>
          </View>
          <View style={[styles.detailRow, styles.borderTop]}>
            <Text style={styles.detailLabel}>Visa Type</Text>
            <Text style={styles.detailValue}>{visaTypeName || "N/A"}</Text>
          </View>
          <View style={[styles.detailRow, styles.borderTop, styles.amountRow]}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountValue}>${visaFee?.toFixed(2) || "0.00"}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>

          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod?.id === method.id && styles.methodCardSelected,
              ]}
              onPress={() => handleInitiatePayment(method)}
              disabled={isLoading}
            >
              <View style={styles.methodContent}>
                <Text style={styles.methodIcon}>{method.icon}</Text>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>{method.name}</Text>
                  <Text style={styles.methodDescription}>{method.description}</Text>
                </View>
              </View>
              {selectedMethod?.id === method.id && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.BLACK} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.GRAY_600} />
          <Text style={styles.securityText}>
            All payments are processed securely with encryption. Your financial information is never stored.
          </Text>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={COLORS.BLACK} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Ionicons name="close" size={20} color={COLORS.BLACK} />
            </TouchableOpacity>
          </View>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.BLACK} />
            <Text style={styles.loadingText}>Processing payment...</Text>
          </View>
        )}

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            If you experience any issues with payment, please contact our support team at support@visabuddy.com
          </Text>
        </View>
      </ScrollView>
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

  // Details Card
  detailsCard: {
    marginHorizontal: SPACING.LG,
    marginVertical: SPACING.LG,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.BG_SECONDARY,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  detailValue: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.MEDIUM as any,
    color: COLORS.TEXT_PRIMARY,
  },
  amountRow: {
    backgroundColor: COLORS.GRAY_100,
  },
  amountLabel: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
    color: COLORS.TEXT_PRIMARY,
  },
  amountValue: {
    fontSize: TYPOGRAPHY.SIZES.XL,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD as any,
    color: COLORS.TEXT_PRIMARY,
  },

  // Section
  section: {
    marginHorizontal: SPACING.LG,
    marginVertical: SPACING.LG,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.SIZES.LG,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },

  // Payment Methods
  methodCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    marginBottomY: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.BG_PRIMARY,
  },
  methodCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.BLACK,
    backgroundColor: COLORS.BG_SECONDARY,
  },
  methodContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  methodIcon: {
    fontSize: 32,
    marginRight: SPACING.MD,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  methodDescription: {
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
  },
  securityText: {
    fontSize: TYPOGRAPHY.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.MD,
    flex: 1,
  },

  // Error Container
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.LG,
    marginVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.BG_SECONDARY,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.TEXT_PRIMARY,
  },
  errorText: {
    fontSize: TYPOGRAPHY.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.MD,
    flex: 1,
  },

  // Loading Container
  loadingContainer: {
    marginHorizontal: SPACING.LG,
    marginVertical: SPACING.LG,
    paddingVertical: SPACING.XXL,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginTopY: SPACING.MD,
  },

  // Help Section
  helpSection: {
    marginHorizontal: SPACING.LG,
    marginVertical: SPACING.LG,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.LG,
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.BG_SECONDARY,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  helpTitle: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  helpText: {
    fontSize: TYPOGRAPHY.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },

  // Success Container
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.LG,
  },
  successIcon: {
    marginBottom: SPACING.LG,
  },
  successTitle: {
    fontSize: TYPOGRAPHY.SIZES.TITLE,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD as any,
    color: COLORS.TEXT_PRIMARY,
    textAlign: "center",
    marginBottom: SPACING.SM,
  },
  successSubtitle: {
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
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
    color: COLORS.TEXT_LIGHT,
    textAlign: "center",
  },
});