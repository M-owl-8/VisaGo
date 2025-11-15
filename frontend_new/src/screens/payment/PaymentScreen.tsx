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
  ProgressBar,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { usePaymentStore } from "../../store/payments";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../theme/colors";
import { paymentGatewayService, PaymentGatewayConfig } from "../../services/payment-api";

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export default function PaymentScreen({ navigation, route }: any) {
  const { applicationId, visaFee, countryName, visaTypeName } = route.params || {};
  const { 
    initiatePayment, 
    verifyPayment, 
    isLoading, 
    error, 
    clearError,
    loadAvailableMethods,
    loadFreezeStatus,
    availableMethods,
    freezeStatus,
  } = usePaymentStore();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  const [verificationInterval, setVerificationInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [pollProgress, setPollProgress] = useState(0);

  const paymentMethods: PaymentMethod[] = [
    {
      id: "payme",
      name: "Payme",
      icon: "💳",
      description: "Pay with Payme wallet or card - UZS/USD",
    },
    {
      id: "click",
      name: "Click",
      icon: "🏦",
      description: "Central Asian payment system - UZS/USD",
    },
    {
      id: "uzum",
      name: "Uzum",
      icon: "📱",
      description: "Mobile payment service - UZS only",
    },
    {
      id: "stripe",
      name: "Stripe",
      icon: "💰",
      description: "International payment processor - Multiple currencies",
    },
  ];

  useEffect(() => {
    // Load payment methods and freeze status on mount
    loadAvailableMethods();
    loadFreezeStatus();
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup polling when component unmounts
      if (verificationInterval) {
        clearInterval(verificationInterval);
      }
      if (pollingId) {
        paymentGatewayService.stopPaymentPolling(pollingId);
      }
      paymentGatewayService.stopAllPolling();
    };
  }, [verificationInterval, pollingId]);

  const handleInitiatePayment = async (method: PaymentMethod) => {
    if (!applicationId || !visaFee) {
      Alert.alert("Error", "Application ID and visa fee are required");
      return;
    }

    setSelectedMethod(method);

    try {
      // Validate payment request
      const validation = paymentGatewayService.validatePaymentRequest({
        applicationId,
        amount: visaFee,
        currency: "USD",
        paymentMethod: method.id as any,
        returnUrl: `${Platform.OS === "ios" ? "visabuddy://" : "visabuddy://"}payment/return`,
      });

      if (!validation.valid) {
        Alert.alert("Validation Error", validation.error);
        setSelectedMethod(null);
        return;
      }

      // Initiate payment via payment gateway service
      const returnUrl = `${Platform.OS === "ios" ? "visabuddy://" : "visabuddy://"}payment/return`;
      const paymentLink = await initiatePayment(applicationId, returnUrl, method.id);

      if (paymentLink) {
        setTransactionId(paymentLink.transactionId);
        setPaymentUrl(paymentLink.paymentUrl);
        setPaymentStatus("processing");

        // Handle different payment gateways
        if (paymentLink.paymentUrl) {
          const canOpen = await Linking.canOpenURL(paymentLink.paymentUrl);
          if (canOpen) {
            // Open payment gateway in external browser/app
            await Linking.openURL(paymentLink.paymentUrl);

            // Start polling for payment verification with new service
            startPaymentVerification(paymentLink.transactionId, method.id);
          } else {
            Alert.alert(
              "Cannot Open Payment",
              `Your device cannot open the ${method.name} payment link. Please install the required app or try a different payment method.`
            );
            setPaymentStatus("failed");
          }
        } else {
          Alert.alert("Error", "No payment URL received from server");
          setPaymentStatus("failed");
        }
      }
    } catch (err: any) {
      console.error("Payment initiation error:", err);
      Alert.alert("Payment Error", error || "Failed to initiate payment");
      setSelectedMethod(null);
      setPaymentStatus("failed");
    }
  };

  const startPaymentVerification = (txId: string, gateway: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes with 2-second intervals

    const pollId = paymentGatewayService.startPaymentPolling(
      txId,
      gateway,
      (status) => {
        // Update progress
        const progress = ((attempts + 1) / maxAttempts) * 100;
        setPollProgress(progress);
        attempts++;

        // Update payment status
        if (status.status === "completed") {
          setPaymentStatus("completed");
          paymentGatewayService.stopPaymentPolling(pollId);
          setPollingId(null);

          // Show success alert
          Alert.alert(
            "Payment Successful! 🎉",
            `Your visa application fee has been paid successfully via ${gateway.toUpperCase()}. Transaction ID: ${txId}`,
            [
              {
                text: "View Receipt",
                onPress: () => {
                  navigation.navigate("PaymentSuccess", {
                    transactionId: txId,
                    applicationId,
                  });
                },
              },
              {
                text: "Back to Application",
                onPress: () => {
                  navigation.goBack();
                },
              },
            ]
          );
        } else if (status.status === "failed") {
          setPaymentStatus("failed");
          paymentGatewayService.stopPaymentPolling(pollId);
          setPollingId(null);

          Alert.alert(
            "Payment Failed",
            `Your payment via ${gateway.toUpperCase()} failed. ${status.verificationData?.message || "Please try again."}`,
            [
              {
                text: "Try Another Method",
                onPress: () => {
                  setPaymentStatus("pending");
                  setSelectedMethod(null);
                  setTransactionId(null);
                  setPaymentUrl(null);
                  setPollProgress(0);
                },
              },
              {
                text: "Back",
                onPress: () => {
                  navigation.goBack();
                },
              },
            ]
          );
        }
      },
      () => {
        // Timeout handler - payment verification timed out after 2 minutes
        setPaymentStatus("timeout");
        setPollingId(null);

        Alert.alert(
          "Payment Verification Timeout",
          "We could not verify your payment within 2 minutes. The payment may still be processing. Please check your payment status.",
          [
            {
              text: "Check Status",
              onPress: () => {
                // Navigate to payment history
                navigation.navigate("PaymentHistory");
              },
            },
            {
              text: "Try Again",
              onPress: () => {
                setPaymentStatus("pending");
                setSelectedMethod(null);
                setTransactionId(null);
                setPaymentUrl(null);
                setPollProgress(0);
              },
            },
          ]
        );
      }
    );

    setPollingId(pollId);
  };

  if (paymentStatus === "completed" && transactionId) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={COLORS.GREEN} />
          </View>
          <Text style={styles.successTitle}>Payment Successful! 🎉</Text>
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

  if (paymentStatus === "processing" && transactionId && selectedMethod) {
    return (
      <View style={styles.container}>
        <View style={styles.processingContainer}>
          <View style={styles.processingIcon}>
            <Ionicons name="hourglass-outline" size={80} color={COLORS.BLACK} />
          </View>
          <Text style={styles.processingTitle}>Processing Payment...</Text>
          <Text style={styles.processingSubtitle}>
            Verifying your payment with {selectedMethod.name}
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${pollProgress}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(pollProgress)}%</Text>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={COLORS.BLACK} />
            <Text style={styles.infoText}>
              This usually takes 30-60 seconds. Do not close this screen.
            </Text>
          </View>

          {/* Transaction Details */}
          <View style={styles.transactionDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Gateway</Text>
              <Text style={styles.detailValue}>{selectedMethod.name}</Text>
            </View>
            <View style={[styles.detailItem, styles.borderTop]}>
              <Text style={styles.detailLabel}>Transaction ID</Text>
              <Text style={[styles.detailValue, styles.transactionId]}>
                {transactionId.slice(0, 8)}...
              </Text>
            </View>
            <View style={[styles.detailItem, styles.borderTop]}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.detailValue}>${visaFee?.toFixed(2)}</Text>
            </View>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              paymentGatewayService.stopAllPolling();
              setPaymentStatus("pending");
              setSelectedMethod(null);
              setTransactionId(null);
              setPaymentUrl(null);
              setPollProgress(0);
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel Payment</Text>
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

        {/* Payment Freeze Banner */}
        {freezeStatus?.isFrozen && (
          <View style={styles.freezeBanner}>
            <Ionicons name="gift" size={24} color={COLORS.GREEN} />
            <View style={styles.freezeContent}>
              <Text style={styles.freezeTitle}>🎉 Free Trial Period Active!</Text>
              <Text style={styles.freezeMessage}>
                {freezeStatus.message || "Payments are currently free during our launch period!"}
              </Text>
              {freezeStatus.daysRemaining !== undefined && freezeStatus.daysRemaining > 0 && (
                <Text style={styles.freezeDays}>
                  {freezeStatus.daysRemaining} days remaining
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {freezeStatus?.isFrozen ? "Payment Information" : "Select Payment Method"}
          </Text>

          {freezeStatus?.isFrozen ? (
            <View style={styles.freePaymentCard}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.GREEN} />
              <Text style={styles.freePaymentTitle}>No Payment Required</Text>
              <Text style={styles.freePaymentText}>
                Your visa application will proceed without payment during the free trial period.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  // Mark as completed without payment
                  Alert.alert(
                    "Application Proceeding",
                    "Your application will proceed without payment. You can continue with your visa application process.",
                    [
                      {
                        text: "Continue",
                        onPress: () => navigation.goBack(),
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.primaryButtonText}>Continue Application</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
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
            </>
          )}
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

  // Processing Container
  processingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.LG,
  },
  processingIcon: {
    marginBottom: SPACING.LG,
  },
  processingTitle: {
    fontSize: TYPOGRAPHY.SIZES.TITLE,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD as any,
    color: COLORS.TEXT_PRIMARY,
    textAlign: "center",
    marginBottom: SPACING.SM,
  },
  processingSubtitle: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: "center",
    marginBottom: SPACING.XL,
  },

  // Progress Bar
  progressContainer: {
    width: "100%",
    height: 8,
    backgroundColor: COLORS.BORDER,
    borderRadius: RADIUS.SM,
    overflow: "hidden",
    marginVertical: SPACING.LG,
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.BLACK,
  },
  progressText: {
    fontSize: TYPOGRAPHY.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.SM,
  },

  // Info Box
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.BG_SECONDARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: RADIUS.MD,
    marginVertical: SPACING.LG,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.BLACK,
  },
  infoText: {
    fontSize: TYPOGRAPHY.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.MD,
    flex: 1,
  },

  // Freeze Banner
  freezeBanner: {
    flexDirection: "row",
    marginHorizontal: SPACING.LG,
    marginVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.LG,
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.GREEN + "15",
    borderWidth: 2,
    borderColor: COLORS.GREEN,
  },
  freezeContent: {
    flex: 1,
    marginLeft: SPACING.MD,
  },
  freezeTitle: {
    fontSize: TYPOGRAPHY.SIZES.LG,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD as any,
    color: COLORS.GREEN,
    marginBottom: SPACING.XS,
  },
  freezeMessage: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  freezeDays: {
    fontSize: TYPOGRAPHY.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: "italic",
  },
  // Free Payment Card
  freePaymentCard: {
    alignItems: "center",
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.XXL,
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.BG_SECONDARY,
    borderWidth: 2,
    borderColor: COLORS.GREEN,
    marginTop: SPACING.MD,
  },
  freePaymentTitle: {
    fontSize: TYPOGRAPHY.SIZES.XL,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD as any,
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  freePaymentText: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: "center",
    marginBottom: SPACING.XL,
    lineHeight: 22,
  },

  // Transaction Details
  transactionDetails: {
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.BG_SECONDARY,
    marginVertical: SPACING.LG,
    overflow: "hidden",
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
  },
  transactionId: {
    fontFamily: "monospace",
  },

  // Cancel Button
  cancelButton: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.BG_SECONDARY,
    marginTop: SPACING.MD,
  },
  cancelButtonText: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.SEMIBOLD as any,
    color: COLORS.BLACK,
    textAlign: "center",
  },
});