/**
 * Test script to verify chat system functionality
 * Tests the complete flow from API call to response
 */

const axios = require('axios');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

let authToken = null;
let userId = null;

async function testChatSystem() {
  console.log('🧪 Testing Chat System...\n');
  console.log(`API URL: ${API_URL}\n`);

  try {
    // Step 1: Login to get auth token
    console.log('📝 Step 1: Logging in...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + JSON.stringify(loginResponse.data.error));
    }

    authToken = loginResponse.data.data.token;
    userId = loginResponse.data.data.user.id;
    console.log('✅ Login successful');
    console.log(`   User ID: ${userId}\n`);

    // Step 2: Test sending a message
    console.log('💬 Step 2: Sending test message...');
    const testMessage = 'Hello, can you help me with visa requirements?';
    
    const chatResponse = await axios.post(
      `${API_URL}/api/chat/send`,
      {
        content: testMessage,
        conversationHistory: [],
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('📥 Chat Response:', {
      success: chatResponse.data.success,
      hasMessage: !!chatResponse.data.data?.message,
      messageLength: chatResponse.data.data?.message?.length || 0,
      model: chatResponse.data.data?.model,
      hasId: !!chatResponse.data.data?.id,
    });

    if (!chatResponse.data.success) {
      throw new Error('Chat failed: ' + JSON.stringify(chatResponse.data.error));
    }

    if (!chatResponse.data.data?.message) {
      throw new Error('Chat response missing message');
    }

    console.log('✅ Message sent successfully');
    console.log(`   Response: ${chatResponse.data.data.message.substring(0, 100)}...\n`);

    // Step 3: Test getting chat history
    console.log('📚 Step 3: Fetching chat history...');
    const historyResponse = await axios.get(
      `${API_URL}/api/chat/history`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!historyResponse.data.success) {
      throw new Error('History fetch failed: ' + JSON.stringify(historyResponse.data.error));
    }

    console.log('✅ Chat history retrieved');
    console.log(`   Messages: ${historyResponse.data.data?.messages?.length || 0}\n`);

    // Step 4: Test sending a follow-up message
    console.log('💬 Step 4: Sending follow-up message...');
    const followUpResponse = await axios.post(
      `${API_URL}/api/chat/send`,
      {
        content: 'What documents do I need?',
        conversationHistory: [
          { role: 'user', content: testMessage },
          { role: 'assistant', content: chatResponse.data.data.message },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!followUpResponse.data.success) {
      throw new Error('Follow-up failed: ' + JSON.stringify(followUpResponse.data.error));
    }

    console.log('✅ Follow-up message sent successfully');
    console.log(`   Response: ${followUpResponse.data.data.message.substring(0, 100)}...\n`);

    // Summary
    console.log('🎉 All tests passed!');
    console.log('\n✅ Chat system is working correctly:');
    console.log('   - Authentication ✓');
    console.log('   - Message sending ✓');
    console.log('   - AI response generation ✓');
    console.log('   - Chat history retrieval ✓');
    console.log('   - Conversation context ✓');

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

// Run tests
testChatSystem();


















