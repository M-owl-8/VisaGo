import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../services/api";

export interface Document {
  id: string;
  userId: string;
  applicationId: string;
  documentName: string;
  documentType: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  status: "pending" | "verified" | "rejected";
  verificationNotes?: string;
  expiryDate?: string;
}

export interface DocumentStats {
  total: number;
  byStatus: {
    pending: number;
    verified: number;
    rejected: number;
  };
  totalSize: number;
}

interface DocumentStore {
  // State
  documents: Document[];
  applicationDocuments: Record<string, Document[]>;
  currentDocument: Document | null;
  stats: DocumentStats | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadDocuments: () => Promise<void>;
  loadApplicationDocuments: (applicationId: string) => Promise<void>;
  getDocument: (documentId: string) => Promise<void>;
  uploadDocument: (
    applicationId: string,
    documentType: string,
    file: any
  ) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  loadStats: () => Promise<void>;
  clearError: () => void;
}

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set, _get) => ({
      // Initial state
      documents: [],
      applicationDocuments: {},
      currentDocument: null,
      stats: null,
      isLoading: false,
      error: null,

      // Load all documents
      loadDocuments: async () => {
        try {
          set({ isLoading: true, error: null });
          const response = await apiClient.getDocuments();

          if (response.success) {
            set({ documents: response.data || [], isLoading: false });
          } else {
            set({ error: response.error?.message || "Failed to load documents" });
          }
        } catch (error: any) {
          set({
            error: error.message || "Failed to load documents",
            isLoading: false,
          });
        }
      },

      // Load documents for a specific application
      loadApplicationDocuments: async (applicationId: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await apiClient.getApplicationDocuments(
            applicationId
          );

          if (response.success) {
            set((state) => ({
              applicationDocuments: {
                ...state.applicationDocuments,
                [applicationId]: response.data || [],
              },
              isLoading: false,
            }));
          } else {
            set({ error: response.error?.message || "Failed to load documents" });
          }
        } catch (error: any) {
          set({
            error: error.message || "Failed to load documents",
            isLoading: false,
          });
        }
      },

      // Get a specific document
      getDocument: async (documentId: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await apiClient.getDocument(documentId);

          if (response.success) {
            set({ currentDocument: response.data, isLoading: false });
          } else {
            set({ error: response.error?.message || "Failed to load document" });
          }
        } catch (error: any) {
          set({
            error: error.message || "Failed to load document",
            isLoading: false,
          });
        }
      },

      // Upload a document
      uploadDocument: async (
        applicationId: string,
        documentType: string,
        file: any
      ) => {
        try {
          set({ isLoading: true, error: null });
          const response = await apiClient.uploadDocument(
            applicationId,
            documentType,
            file
          );

          if (response.success) {
            set((state) => {
              const docs = state.applicationDocuments[applicationId] || [];
              return {
                applicationDocuments: {
                  ...state.applicationDocuments,
                  [applicationId]: [...docs, response.data],
                },
                documents: [...state.documents, response.data],
                isLoading: false,
              };
            });
          } else {
            set({ error: response.error?.message || "Failed to upload document" });
          }
        } catch (error: any) {
          set({
            error: error.message || "Failed to upload document",
            isLoading: false,
          });
        }
      },

      // Delete a document
      deleteDocument: async (documentId: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await apiClient.deleteDocument(documentId);

          if (response.success) {
            set((state) => ({
              documents: state.documents.filter((d) => d.id !== documentId),
              isLoading: false,
            }));
          } else {
            set({ error: response.error?.message || "Failed to delete document" });
          }
        } catch (error: any) {
          set({
            error: error.message || "Failed to delete document",
            isLoading: false,
          });
        }
      },

      // Load statistics
      loadStats: async () => {
        try {
          const response = await apiClient.getDocumentStats();

          if (response.success) {
            set({ stats: response.data });
          }
        } catch (error: any) {
          console.error("Failed to load document stats:", error);
        }
      },

      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: "@visabuddy_documents",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        documents: state.documents,
        applicationDocuments: state.applicationDocuments,
      }),
    }
  )
);