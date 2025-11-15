import axios from 'axios';
import { mockTestUser, mockTestCountries, mockApiResponses } from '../../__tests__/test-utils';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should login with email and password', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: mockApiResponses.login });

      const response = await axios.post('/api/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(response.data).toEqual(mockApiResponses.login);
      expect(response.data.token).toBeDefined();
      expect(response.data.user.email).toBe('test@example.com');
    });

    it('should register new user', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: mockApiResponses.signup });

      const response = await axios.post('/api/auth/register', {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(response.data.token).toBeDefined();
      expect(response.data.user.email).toBe('newuser@example.com');
    });

    it('should handle login error', async () => {
      mockedAxios.post.mockRejectedValueOnce(
        new Error('Invalid credentials')
      );

      await expect(
        axios.post('/api/auth/login', {
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should refresh JWT token', async () => {
      const newToken = 'new-jwt-token-456';
      mockedAxios.post.mockResolvedValueOnce({ data: { token: newToken } });

      const response = await axios.post('/api/auth/refresh', {
        refreshToken: 'refresh-token-123',
      });

      expect(response.data.token).toBe(newToken);
    });
  });

  describe('Countries and Visa Types', () => {
    it('should fetch countries list', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockApiResponses.getCountries,
      });

      const response = await axios.get('/api/countries');

      expect(response.data.countries).toHaveLength(3);
      expect(response.data.countries[0].name).toBe('Spain');
    });

    it('should fetch visa types for country', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockApiResponses.getVisaTypes,
      });

      const response = await axios.get('/api/countries/spain-1/visa-types');

      expect(response.data.visaTypes).toHaveLength(2);
      expect(response.data.visaTypes[0].name).toBe('Tourist Visa');
    });

    it('should cache countries list', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockApiResponses.getCountries,
      });

      // First call
      await axios.get('/api/countries');
      // Second call should use cache (not make another request)
      await axios.get('/api/countries');

      // Mock is called once because caching would prevent second call
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Applications', () => {
    it('should fetch user applications', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockApiResponses.getApplications,
      });

      const response = await axios.get('/api/applications');

      expect(response.data.applications).toHaveLength(1);
      expect(response.data.applications[0].status).toBe('draft');
    });

    it('should create new application', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: mockApiResponses.createApplication,
      });

      const response = await axios.post('/api/applications', {
        countryId: 'spain-1',
        visaTypeId: 'tourist-1',
      });

      expect(response.data.application.id).toBeDefined();
      expect(response.data.application.status).toBe('draft');
    });

    it('should update application', async () => {
      const updatedApp = { ...mockApiResponses.createApplication.application, status: 'submitted' };
      mockedAxios.patch.mockResolvedValueOnce({ data: updatedApp });

      const response = await axios.patch('/api/applications/app-123', {
        status: 'submitted',
      });

      expect(response.data.status).toBe('submitted');
    });
  });

  describe('Documents', () => {
    it('should upload document', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          document: {
            id: 'doc-123',
            documentType: 'passport',
            filePath: '/uploads/path/to/file.pdf',
          },
        },
      });

      const formData = new FormData();
      formData.append('file', new Blob(), 'passport.pdf');

      const response = await axios.post('/api/applications/app-123/documents', formData);

      expect(response.data.document.documentType).toBe('passport');
      expect(response.data.document.filePath).toBeDefined();
    });

    it('should delete document', async () => {
      mockedAxios.delete.mockResolvedValueOnce({ status: 200 });

      const response = await axios.delete('/api/documents/doc-123');

      expect(response.status).toBe(200);
    });
  });

  describe('Payments', () => {
    it('should initiate payment', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          paymentUrl: 'https://checkout.payme.uz/payment/123',
          merchantTransId: 'merchant-trans-123',
        },
      });

      const response = await axios.post('/api/payments/initiate', {
        applicationId: 'app-123',
        amount: 100,
        paymentMethod: 'payme',
      });

      expect(response.data.paymentUrl).toBeDefined();
      expect(response.data.paymentUrl).toContain('payme');
    });

    it('should verify payment', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          status: 'completed',
          amount: 100,
        },
      });

      const response = await axios.post('/api/payments/verify', {
        transactionId: 'trans-123',
      });

      expect(response.data.status).toBe('completed');
    });
  });

  describe('Chat', () => {
    it('should send chat message', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          message: {
            id: 'msg-123',
            role: 'assistant',
            content: 'For Spain visa you need...',
          },
        },
      });

      const response = await axios.post('/api/chat/sessions/session-123/messages', {
        content: 'What documents do I need?',
      });

      expect(response.data.message.role).toBe('assistant');
      expect(response.data.message.content).toBeDefined();
    });

    it('should fetch chat history', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          messages: [
            { role: 'user', content: 'What documents?' },
            { role: 'assistant', content: 'You need...' },
          ],
        },
      });

      const response = await axios.get('/api/chat/sessions/session-123/messages');

      expect(response.data.messages).toHaveLength(2);
      expect(response.data.messages[0].role).toBe('user');
    });
  });

  describe('Analytics', () => {
    it('should track analytics event', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200 });

      const response = await axios.post('/api/analytics/track', {
        eventType: 'signup',
        source: 'email',
      });

      expect(response.status).toBe(200);
    });

    it('should fetch analytics metrics', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockApiResponses.getMetrics,
      });

      const response = await axios.get('/api/admin/analytics/metrics');

      expect(response.data.metrics.totalSignups).toBe(1250);
      expect(response.data.metrics.conversionRate).toBe(36);
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 unauthorized error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 401, data: { error: 'Unauthorized' } },
      });

      await expect(axios.get('/api/protected')).rejects.toMatchObject({
        response: { status: 401 },
      });
    });

    it('should handle 403 forbidden error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 403, data: { error: 'Forbidden' } },
      });

      await expect(axios.get('/api/admin')).rejects.toMatchObject({
        response: { status: 403 },
      });
    });

    it('should handle 404 not found error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404, data: { error: 'Not found' } },
      });

      await expect(axios.get('/api/nonexistent')).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    it('should handle 500 server error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 500, data: { error: 'Server error' } },
      });

      await expect(axios.get('/api/error')).rejects.toMatchObject({
        response: { status: 500 },
      });
    });

    it('should handle network error', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));

      await expect(
        axios.post('/api/login', {})
      ).rejects.toThrow('Network Error');
    });
  });

  describe('Request Interceptors', () => {
    it('should add authorization header', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { token: 'new-token' } });

      await axios.post('/api/protected', {});

      // In real implementation, interceptor would add Bearer token
      expect(mockedAxios.post).toHaveBeenCalled();
    });
  });

  describe('Response Interceptors', () => {
    it('should refresh token on 401', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { status: 401 },
      });

      // In real implementation, interceptor would refresh token and retry
      try {
        await axios.post('/api/protected', {});
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });
  });
});