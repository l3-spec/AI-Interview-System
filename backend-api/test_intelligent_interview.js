const axios = require('axios');
const colors = require('colors');

const API_BASE = 'http://localhost:3001/api';

async function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  switch (type) {
    case 'success': console.log(`[${timestamp}] ✅ ${message}`.green); break;
    case 'error': console.log(`[${timestamp}] ❌ ${message}`.red); break;
    case 'warning': console.log(`[${timestamp}] ⚠️  ${message}`.yellow); break;
    default: console.log(`[${timestamp}] ℹ️  ${message}`.blue);
  }
}

async function testIntelligentFlow() {
  try {
    // 1. Test Opening (First Time)
    await log('🚀 Testing Opening (First Time)...');
    const startResponse1 = await axios.post(`${API_BASE}/interview/start`, {
      userId: 'test_user_flow_1',
      userName: 'FlowTester',
      isFirstTime: true
    });
    await log(`Start Response: ${JSON.stringify(startResponse1.data, null, 2)}`, 'info');
    const sessionId = startResponse1.data.session_id;
    await log(`Session started: ${sessionId}`, 'success');

    // 2. Setup Info & Start Phase 2
    await axios.post(`${API_BASE}/interview/${sessionId}/info`, {
      targetJob: 'Java Developer',
      background: '3 years experience',
      skills: ['Java', 'Spring']
    });
    await axios.post(`${API_BASE}/interview/${sessionId}/phase`);
    await log('Phase 2 started', 'success');

    // 3. Test Flow Control (Trigger Follow-up)
    await log('Testing Flow Control (Trigger Follow-up)...');
    // Get first question
    let nextResponse = await axios.post(`${API_BASE}/interview/${sessionId}/next`);
    let currentRound = nextResponse.data.data;
    await log(`Q1: ${currentRound.question}`, 'info');

    // Answer vaguely to trigger follow-up
    await log('Answering vaguely...');
    let answerResponse = await axios.post(`${API_BASE}/interview/${sessionId}/response`, {
      response: 'I know Java.',
      duration: 10
    });

    await log(`Feedback: ${answerResponse.data.data.feedback}`, 'info');

    // Check if next question is a follow-up (we can't easily check internal flag, but we can check if question changed)
    nextResponse = await axios.post(`${API_BASE}/interview/${sessionId}/next`);
    let nextRound = nextResponse.data.data;
    await log(`Next Question: ${nextRound.question}`, 'info');

    if (nextRound.question !== currentRound.question) {
      await log('Got a new question (likely follow-up or next)', 'success');
    }

    // 4. Test Closing
    await log('Testing Closing...');
    const endResponse = await axios.post(`${API_BASE}/interview/${sessionId}/end`);
    await log(`Summary: ${endResponse.data.data.summary}`, 'info');
    // We can't easily verify the closing text sent to avatar without checking logs or mocking avatarService, 
    // but if the API returns success, it means generateClosing executed.
    await log('Interview ended successfully', 'success');

  } catch (error) {
    if (error.response) {
      await log(`Test failed: ${error.message}`, 'error');
      await log(`Response Data: ${JSON.stringify(error.response.data, null, 2)}`, 'error');
    } else {
      await log(`Test failed: ${error.message}`, 'error');
    }
  }
}

testIntelligentFlow();