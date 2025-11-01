import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../services/api";

interface Payment {
  id: string;
  applicationId: string;
  amount: number;
  status: "pending" | "completed" | "failed" | "refunded";
  paymentMethod: string;
  transactionId?: string;
  orderId?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentLink {
  paymentUrl: string;
  merchantTransId: string;
  transactionId: string;
}

interface PaymentStore {
  payments: Payment[];
  currentPayment: Payment | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadUserPayments: () => Promise<void>;
  setCurrentPayment: (payment: Payment | null) => void;
  initiatePayment: (applicationId: string, returnUrl: string) => Promise<PaymentLink | null>;
  verifyPayment: (transactionId: string) => Promise<boolean>;
  getPaymentDetails: (transactionId: string) => Promise<Payment | null>;
  cancelPayment: (transactionId: string) => Promise<boolean>;
  clearError: () => void;
}

export const usePaymentStore = create<PaymentStore>()(
  persist(
    (set, _get) => ({
      payments: [],
      currentPayment: null,
      isLoading: false,
      error: null,

      loadUserPayments: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.getUserPayments();
          if (response.success && response.data) {
            set({ payments: response.data });
          }
        } catch (error: any) {
          const message = error.response?.data?.error?.message || "Failed to load payments";
          set({ error: message });
          console.error("Load payments error:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      setCurrentPayment: (payment) => {
        set({ currentPayment: payment });
      },

      initiatePayment: async (applicationId, returnUrl) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.initiatePayment(applicationId, returnUrl);
          if (response.success && response.data) {
            return response.data as PaymentLink;
          } else {
            throw new Error(response.error?.message || "Failed to initiate payment");
          }
        } catch (error: any) {
          const message = error.response?.data?.error?.message || "Failed to initiate payment";
          set({ error: message });
          console.error("Initiate payment error:", error);
          return null;
        } finally {
          set({ isLoading: false });
        }
      },

      verifyPayment: async (transactionId) => {
        try {
          const response = await apiClient.verifyPayment(transactionId);
          if (response.success && response.data) {
            const { verified } = response.data;
            
            if (verified) {
              // Update the current payment status
              const currentPayment = get().currentPayment;
              if (currentPayment && currentPayment.id === transactionId) {
                set({
                  currentPayment: {
                    ...currentPayment,
                    status: "completed",
                    paidAt: new Date().toISOString(),
                  },
                });
              }
              
              // Reload payments
              await get().loadUserPayments();
            }
            
            return verified;
          }
          return false;
        } catch (error: any) {
          console.error("Verify payment error:", error);
          return false;
        }
      },

      getPaymentDetails: async (transactionId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.getPayment(transactionId);
          if (response.success && response.data) {
            const payment = response.data;
            set({ currentPayment: payment });
            return payment;
          }
          return null;
        } catch (error: any) {
          const message = error.response?.data?.error?.message || "Failed to fetch payment details";
          set({ error: message });
          console.error("Get payment error:", error);
          return null;
        } finally {
          set({ isLoading: false });
        }
      },

      cancelPayment: async (transactionId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.cancelPayment(transactionId);
          if (response.success) {
            // Update payment in the store
            const payments = get().payments.map((p) =>
              p.id === transactionId ? { ...p, status: "failed" as const } : p
            );
            set({ payments });
            
            if (get().currentPayment?.id === transactionId) {
              set({
                currentPayment: {
                  ...get().currentPayment!,
                  status: "failed",
                },
              });
            }
            
            return true;
          }
          return false;
        } catch (error: any) {
          const message = error.response?.data?.error?.message || "Failed to cancel payment";
          set({ error: message });
          console.error("Cancel payment error:", error);
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "@payment-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        payments: state.payments,
      }),
    }
  )
);