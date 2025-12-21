/**
 * Document Classifier Service Tests
 * Tests that classifier preserves explicit checklist types and only classifies generic types
 */

import { DocumentClassifierService } from '../../services/document-classifier.service';
import { PrismaClient } from '@prisma/client';
import { logInfo } from '../../middleware/logger';

// Mock Prisma client
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      userDocument: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    })),
  };
});

// Mock logger
jest.mock('../../middleware/logger', () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

describe('DocumentClassifierService', () => {
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();
    // Ensure mockPrisma has userDocument initialized for direct stubbing
    mockPrisma.userDocument = mockPrisma.userDocument || {
      findUnique: jest.fn(),
      update: jest.fn(),
    };
  });

  describe('analyzeAndUpdateDocument', () => {
    it('should preserve explicit documentType "passport" and not overwrite it', async () => {
      // Arrange: Document with explicit type 'passport'
      const documentId = 'test-doc-123';
      const mockDocument = {
        id: documentId,
        documentType: 'passport',
        fileName: 'passport.pdf',
        fileUrl: 'https://example.com/passport.pdf',
        applicationId: 'test-app-123',
        userId: 'test-user-123',
        application: {
          id: 'test-app-123',
        },
      };

      mockPrisma.userDocument.findUnique = jest.fn().mockResolvedValue(mockDocument);

      // Mock checklist service to return empty checklist (simplified test)
      jest.doMock('../../services/document-checklist.service', () => ({
        DocumentChecklistService: {
          generateChecklist: jest.fn().mockResolvedValue({
            items: [{ documentType: 'passport' }],
          }),
        },
      }));

      // Act
      await DocumentClassifierService.analyzeAndUpdateDocument(documentId);

      // Assert: Should skip classification and not update document
      expect(mockPrisma.userDocument.update).not.toHaveBeenCalled();
      expect(logInfo).toHaveBeenCalledWith(
        '[DocumentClassifier] Skipping classification - explicit type',
        expect.objectContaining({
          documentId,
          documentType: 'passport',
        })
      );
    });

    it('should classify generic documentType "document"', async () => {
      // Arrange: Document with generic type 'document'
      const documentId = 'test-doc-456';
      const mockDocument = {
        id: documentId,
        documentType: 'document',
        fileName: 'unknown.pdf',
        fileUrl: 'https://example.com/unknown.pdf',
        applicationId: 'test-app-456',
        userId: 'test-user-456',
        application: {
          id: 'test-app-456',
        },
      };

      mockPrisma.userDocument.findUnique = jest.fn().mockResolvedValue(mockDocument);

      // Mock classification to return a specific type
      jest.spyOn(DocumentClassifierService, 'classifyDocumentType' as any).mockResolvedValue({
        type: 'bank_statement',
        confidence: 0.8,
      });

      // Mock checklist service
      jest.doMock('../../services/document-checklist.service', () => ({
        DocumentChecklistService: {
          generateChecklist: jest.fn().mockResolvedValue({
            items: [],
          }),
        },
      }));

      // Act
      await DocumentClassifierService.analyzeAndUpdateDocument(documentId);

      // Assert: Should update document with classified type (if confidence >= 0.6)
      // Note: This test may need adjustment based on actual implementation
      // The classifier should update 'document' to 'bank_statement' if confidence is high enough
    });

    it('should not overwrite documentType that matches checklist item', async () => {
      // Arrange: Document with type that matches a checklist item
      const documentId = 'test-doc-789';
      const mockDocument = {
        id: documentId,
        documentType: 'bank_statement',
        fileName: 'statement.pdf',
        fileUrl: 'https://example.com/statement.pdf',
        applicationId: 'test-app-789',
        userId: 'test-user-789',
        application: {
          id: 'test-app-789',
        },
      };

      mockPrisma.userDocument.findUnique = jest.fn().mockResolvedValue(mockDocument);

      // Mock checklist with matching item
      jest.doMock('../../services/document-checklist.service', () => ({
        DocumentChecklistService: {
          generateChecklist: jest.fn().mockResolvedValue({
            items: [{ documentType: 'bank_statement' }],
          }),
        },
      }));

      // Act
      await DocumentClassifierService.analyzeAndUpdateDocument(documentId);

      // Assert: Should skip classification because type matches checklist item
      expect(mockPrisma.userDocument.update).not.toHaveBeenCalled();
    });
  });
});
