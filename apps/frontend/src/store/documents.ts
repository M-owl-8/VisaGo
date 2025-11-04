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
  requiredDocuments: Record<string, string[]>;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadDocuments: () => Promise<void>;
  loadApplicationDocuments: (applicationId: string) => Promise<void>;
  getRequiredDocuments: (applicationId: string) => Promise<string[]>;
  getDocument: (documentId: string) => Promise<void>;
  uploadDocument: (
    applicationId: string,
    documentType: string,
    file: any
  ) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  updateDocumentStatus: (
    documentId: string,
    status: "pending" | "verified" | "rejected",
    verificationNotes?: string
  ) => Promise<void>;
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
      requiredDocuments: {},
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

      // Get required documents for an application
      getRequiredDocuments: async (applicationId: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await apiClient.getRequiredDocuments(applicationId);

          if (response.success) {
            const requiredDocs = response.data?.requiredDocuments || [];
            set((state) => ({
              requiredDocuments: {
                ...state.requiredDocuments,
                [applicationId]: requiredDocs,
              },
              isLoading: false,
            }));
            return requiredDocs;
          } else {
            set({ error: response.error?.message || "Failed to load required documents" });
            return [];
          }
        } catch (error: any) {
          set({
            error: error.message || "Failed to load required documents",
            isLoading: false,
          });
          return [];
        }
      },

      // Update document status
      updateDocumentStatus: async (
        documentId: string,
        status: "pending" | "verified" | "rejected",
        verificationNotes?: string
      ) => {
        try {
          set({ isLoading: true, error: null });
          const response = await apiClient.updateDocumentStatus(
            documentId,
            status,
            verificationNotes
          );

          if (response.success) {
            set((state) => ({
              documents: state.documents.map((d) =>
                d.id === documentId ? { ...d, status, verificationNotes } : d
              ),
              isLoading: false,
            }));
          } else {
            set({ error: response.error?.message || "Failed to update document status" });
          }
        } catch (error: any) {
          set({
            error: error.message || "Failed to update document status",
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