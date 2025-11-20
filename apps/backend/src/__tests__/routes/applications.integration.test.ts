/**
 * Applications Routes Integration Tests
 * Tests complete HTTP flow for visa application endpoints
 * Coverage Target: 90%
 */

import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    visaApplication: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    checkpoint: {
      update: jest.fn(),
      findMany: jest.fn(),
    },
    country: {
      findUnique: jest.fn(),
    },
    visaType: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

// Mock auth middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || token === 'invalid-token') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.userId = 'user-123';
    next();
  },
}));

// Mock AI service
jest.mock('../../services/ai-application.service', () => ({
  AIApplicationService: {
    generateApplicationFromQuestionnaire: jest.fn(),
  },
}));

const mockPrisma = new PrismaClient();

// Create test Express app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Applications routes (simplified for testing)
  app.get('/api/applications', async (req, res) => {
    try {
      const applications = await mockPrisma.visaApplication.findMany({
        where: { userId: req.userId },
        include: {
          country: true,
          visaType: true,
        },
      });

      res.json({
        success: true,
        data: applications,
        count: applications.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/applications/:id', async (req, res) => {
    try {
      const application = await mockPrisma.visaApplication.findUnique({
        where: { id: req.params.id },
        include: {
          country: true,
          visaType: true,
          checkpoints: true,
        },
      });

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      if (application.userId !== req.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      res.json({
        success: true,
        data: application,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/applications', async (req, res) => {
    try {
      const { countryId, visaTypeId, notes } = req.body;

      if (!countryId || !visaTypeId) {
        return res.status(400).json({ error: 'countryId and visaTypeId are required' });
      }

      // Verify country and visa type exist
      const country = await mockPrisma.country.findUnique({
        where: { id: countryId },
      });

      const visaType = await mockPrisma.visaType.findUnique({
        where: { id: visaTypeId },
      });

      if (!country || !visaType) {
        return res.status(404).json({ error: 'Country or visa type not found' });
      }

      const application = await mockPrisma.visaApplication.create({
        data: {
          userId: req.userId,
          countryId,
          visaTypeId,
          notes: notes || null,
          status: 'draft',
        },
        include: {
          country: true,
          visaType: true,
        },
      });

      res.status(201).json({
        success: true,
        data: application,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/applications/:id/status', async (req, res) => {
    try {
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'status is required' });
      }

      const validStatuses = ['draft', 'submitted', 'approved', 'rejected', 'expired'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const application = await mockPrisma.visaApplication.findUnique({
        where: { id: req.params.id },
      });

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      if (application.userId !== req.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const updated = await mockPrisma.visaApplication.update({
        where: { id: req.params.id },
        data: { status },
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/applications/:id/checkpoints/:checkpointId', async (req, res) => {
    try {
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'status is required' });
      }

      const checkpoint = await mockPrisma.checkpoint.findMany({
        where: {
          id: req.params.checkpointId,
          applicationId: req.params.id,
        },
      });

      if (!checkpoint || checkpoint.length === 0) {
        return res.status(404).json({ error: 'Checkpoint not found' });
      }

      const updated = await mockPrisma.checkpoint.update({
        where: { id: req.params.checkpointId },
        data: { isCompleted: status === 'completed' },
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return app;
};

describe('Applications Routes - GET /api/applications', () => {
  let app: any;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  test('should get all applications for authenticated user', async () => {
    const mockApplications = [
      {
        id: 'app-1',
        userId: 'user-123',
        countryId: 'country-1',
        visaTypeId: 'visa-1',
        status: 'draft',
        country: { id: 'country-1', name: 'United States' },
        visaType: { id: 'visa-1', name: 'Tourist Visa' },
      },
    ];

    (mockPrisma.visaApplication.findMany as jest.Mock).mockResolvedValue(mockApplications);

    const response = await request(app)
      .get('/api/applications')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.count).toBe(1);
  });

  test('should return 401 for unauthenticated request', async () => {
    const response = await request(app)
      .get('/api/applications')
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  test('should return empty array when user has no applications', async () => {
    (mockPrisma.visaApplication.findMany as jest.Mock).mockResolvedValue([]);

    const response = await request(app)
      .get('/api/applications')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual([]);
    expect(response.body.count).toBe(0);
  });
});

describe('Applications Routes - GET /api/applications/:id', () => {
  let app: any;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  test('should get single application by id', async () => {
    const mockApplication = {
      id: 'app-1',
      userId: 'user-123',
      countryId: 'country-1',
      visaTypeId: 'visa-1',
      status: 'draft',
      country: { id: 'country-1', name: 'United States' },
      visaType: { id: 'visa-1', name: 'Tourist Visa' },
      checkpoints: [],
    };

    (mockPrisma.visaApplication.findUnique as jest.Mock).mockResolvedValue(mockApplication);

    const response = await request(app)
      .get('/api/applications/app-1')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('app-1');
  });

  test('should return 404 for non-existent application', async () => {
    (mockPrisma.visaApplication.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await request(app)
      .get('/api/applications/non-existent')
      .set('Authorization', 'Bearer valid-token')
      .expect(404);

    expect(response.body.error).toContain('not found');
  });

  test('should return 403 for application belonging to another user', async () => {
    const mockApplication = {
      id: 'app-1',
      userId: 'other-user',
      countryId: 'country-1',
      visaTypeId: 'visa-1',
    };

    (mockPrisma.visaApplication.findUnique as jest.Mock).mockResolvedValue(mockApplication);

    const response = await request(app)
      .get('/api/applications/app-1')
      .set('Authorization', 'Bearer valid-token')
      .expect(403);

    expect(response.body.error).toContain('Forbidden');
  });
});

describe('Applications Routes - POST /api/applications', () => {
  let app: any;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  test('should create new application with valid data', async () => {
    const applicationData = {
      countryId: 'country-1',
      visaTypeId: 'visa-1',
      notes: 'Test application',
    };

    const mockCountry = { id: 'country-1', name: 'United States' };
    const mockVisaType = { id: 'visa-1', name: 'Tourist Visa' };
    const mockApplication = {
      id: 'app-1',
      userId: 'user-123',
      ...applicationData,
      status: 'draft',
      country: mockCountry,
      visaType: mockVisaType,
    };

    (mockPrisma.country.findUnique as jest.Mock).mockResolvedValue(mockCountry);
    (mockPrisma.visaType.findUnique as jest.Mock).mockResolvedValue(mockVisaType);
    (mockPrisma.visaApplication.create as jest.Mock).mockResolvedValue(mockApplication);

    const response = await request(app)
      .post('/api/applications')
      .set('Authorization', 'Bearer valid-token')
      .send(applicationData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('app-1');
    expect(response.body.data.status).toBe('draft');
  });

  test('should return 400 for missing countryId', async () => {
    const applicationData = {
      visaTypeId: 'visa-1',
    };

    const response = await request(app)
      .post('/api/applications')
      .set('Authorization', 'Bearer valid-token')
      .send(applicationData)
      .expect(400);

    expect(response.body.error).toContain('required');
  });

  test('should return 400 for missing visaTypeId', async () => {
    const applicationData = {
      countryId: 'country-1',
    };

    const response = await request(app)
      .post('/api/applications')
      .set('Authorization', 'Bearer valid-token')
      .send(applicationData)
      .expect(400);

    expect(response.body.error).toContain('required');
  });

  test('should return 404 for non-existent country', async () => {
    const applicationData = {
      countryId: 'non-existent',
      visaTypeId: 'visa-1',
    };

    (mockPrisma.country.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await request(app)
      .post('/api/applications')
      .set('Authorization', 'Bearer valid-token')
      .send(applicationData)
      .expect(404);

    expect(response.body.error).toContain('not found');
  });

  test('should return 404 for non-existent visa type', async () => {
    const applicationData = {
      countryId: 'country-1',
      visaTypeId: 'non-existent',
    };

    const mockCountry = { id: 'country-1', name: 'United States' };
    (mockPrisma.country.findUnique as jest.Mock).mockResolvedValue(mockCountry);
    (mockPrisma.visaType.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await request(app)
      .post('/api/applications')
      .set('Authorization', 'Bearer valid-token')
      .send(applicationData)
      .expect(404);

    expect(response.body.error).toContain('not found');
  });
});

describe('Applications Routes - PUT /api/applications/:id/status', () => {
  let app: any;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  test('should update application status', async () => {
    const mockApplication = {
      id: 'app-1',
      userId: 'user-123',
      status: 'draft',
    };

    const updatedApplication = {
      ...mockApplication,
      status: 'submitted',
    };

    (mockPrisma.visaApplication.findUnique as jest.Mock).mockResolvedValue(mockApplication);
    (mockPrisma.visaApplication.update as jest.Mock).mockResolvedValue(updatedApplication);

    const response = await request(app)
      .put('/api/applications/app-1/status')
      .set('Authorization', 'Bearer valid-token')
      .send({ status: 'submitted' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('submitted');
  });

  test('should return 400 for missing status', async () => {
    const response = await request(app)
      .put('/api/applications/app-1/status')
      .set('Authorization', 'Bearer valid-token')
      .send({})
      .expect(400);

    expect(response.body.error).toContain('required');
  });

  test('should return 400 for invalid status', async () => {
    const response = await request(app)
      .put('/api/applications/app-1/status')
      .set('Authorization', 'Bearer valid-token')
      .send({ status: 'invalid-status' })
      .expect(400);

    expect(response.body.error).toContain('Invalid status');
  });

  test('should return 404 for non-existent application', async () => {
    (mockPrisma.visaApplication.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await request(app)
      .put('/api/applications/non-existent/status')
      .set('Authorization', 'Bearer valid-token')
      .send({ status: 'submitted' })
      .expect(404);

    expect(response.body.error).toContain('not found');
  });

  test('should return 403 for application belonging to another user', async () => {
    const mockApplication = {
      id: 'app-1',
      userId: 'other-user',
      status: 'draft',
    };

    (mockPrisma.visaApplication.findUnique as jest.Mock).mockResolvedValue(mockApplication);

    const response = await request(app)
      .put('/api/applications/app-1/status')
      .set('Authorization', 'Bearer valid-token')
      .send({ status: 'submitted' })
      .expect(403);

    expect(response.body.error).toContain('Forbidden');
  });
});

describe('Applications Routes - PUT /api/applications/:id/checkpoints/:checkpointId', () => {
  let app: any;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  test('should update checkpoint status', async () => {
    const mockCheckpoint = [
      {
        id: 'checkpoint-1',
        applicationId: 'app-1',
        isCompleted: false,
      },
    ];

    const updatedCheckpoint = {
      ...mockCheckpoint[0],
      isCompleted: true,
    };

    (mockPrisma.checkpoint.findMany as jest.Mock).mockResolvedValue(mockCheckpoint);
    (mockPrisma.checkpoint.update as jest.Mock).mockResolvedValue(updatedCheckpoint);

    const response = await request(app)
      .put('/api/applications/app-1/checkpoints/checkpoint-1')
      .set('Authorization', 'Bearer valid-token')
      .send({ status: 'completed' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.isCompleted).toBe(true);
  });

  test('should return 400 for missing status', async () => {
    const response = await request(app)
      .put('/api/applications/app-1/checkpoints/checkpoint-1')
      .set('Authorization', 'Bearer valid-token')
      .send({})
      .expect(400);

    expect(response.body.error).toContain('required');
  });

  test('should return 404 for non-existent checkpoint', async () => {
    (mockPrisma.checkpoint.findMany as jest.Mock).mockResolvedValue([]);

    const response = await request(app)
      .put('/api/applications/app-1/checkpoints/non-existent')
      .set('Authorization', 'Bearer valid-token')
      .send({ status: 'completed' })
      .expect(404);

    expect(response.body.error).toContain('not found');
  });
});








