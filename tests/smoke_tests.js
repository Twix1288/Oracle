const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dijskfbokusyxkcfwkrc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GRAPHRAG_URL = process.env.GRAPHRAG_URL || `${SUPABASE_URL}/functions/v1/graphrag`;
const ORACLE_URL = process.env.ORACLE_URL || `${SUPABASE_URL}/functions/v1/oracle_call`;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Test data
const testUserId = '00000000-0000-0000-0000-000000000001';
const testTeamId = '00000000-0000-0000-0000-000000000002';
const testTargetId = '00000000-0000-0000-0000-000000000003';

async function runTests() {
  console.log('🚀 Starting GraphRAG + pgvector smoke tests...\n');
  
  let totalTests = 0;
  let passedTests = 0;
  
  try {
    // Test 1: Offer Help Flow
    console.log('📝 Test 1: Offer Help Flow');
    totalTests++;
    
    const offerHelpResponse = await fetch(`${GRAPHRAG_URL}/button_action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        action: 'offer_help',
        actor_id: testUserId,
        target_id: testTargetId,
        body: {
          skill: 'React Development',
          availability: '5 hours/week',
          description: 'Can help with React components and hooks'
        }
      })
    });

    if (!offerHelpResponse.ok) {
      const error = await offerHelpResponse.text();
      throw new Error(`Offer help request failed: ${error}`);
    }

    const offerResult = await offerHelpResponse.json();
    console.log('✅ Offer help request successful');

    // Verify skill_offers row exists
    const { data: skillOffers, error: skillOffersError } = await supabase
      .from('skill_offers')
      .select('id, embedding_vector')
      .eq('owner_id', testUserId)
      .eq('skill', 'React Development');

    if (skillOffersError) {
      throw new Error(`Failed to query skill_offers: ${skillOffersError.message}`);
    }

    if (!skillOffers || skillOffers.length === 0) {
      throw new Error('No skill offer found in database');
    }

    if (!skillOffers[0].embedding_vector) {
      console.log('⚠️  Warning: Embedding vector is null (may take time to generate)');
    } else {
      console.log('✅ Embedding vector generated for skill offer');
    }

    // Verify notification created
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', testTargetId)
      .eq('type', 'offer_help');

    if (notificationsError) {
      console.log('⚠️  Warning: Could not verify notification creation');
    } else if (notifications && notifications.length > 0) {
      console.log('✅ Notification created for target user');
    }

    passedTests++;
    console.log('✅ Test 1 PASSED\n');

    // Test 2: Connect Flow
    console.log('📝 Test 2: Connect Flow');
    totalTests++;

    const connectResponse = await fetch(`${GRAPHRAG_URL}/button_action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        action: 'connect',
        actor_id: testUserId,
        target_id: testTargetId,
        body: {
          message: 'Hi! Would love to connect and collaborate.'
        }
      })
    });

    if (!connectResponse.ok) {
      const error = await connectResponse.text();
      throw new Error(`Connect request failed: ${error}`);
    }

    const connectResult = await connectResponse.json();
    console.log('✅ Connect request successful');

    // Verify connection_requests row exists
    const { data: connections, error: connectionsError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('requester_id', testUserId)
      .eq('requested_id', testTargetId);

    if (connectionsError) {
      throw new Error(`Failed to query connection_requests: ${connectionsError.message}`);
    }

    if (!connections || connections.length === 0) {
      throw new Error('No connection request found in database');
    }

    console.log('✅ Connection request stored in database');
    passedTests++;
    console.log('✅ Test 2 PASSED\n');

    // Test 3: Express Interest Flow
    console.log('📝 Test 3: Express Interest Flow');
    totalTests++;

    const interestResponse = await fetch(`${GRAPHRAG_URL}/button_action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        action: 'express_interest',
        actor_id: testUserId,
        target_id: testTeamId,
        body: {
          project_id: testTeamId,
          message: 'Very interested in joining this project!'
        }
      })
    });

    if (!interestResponse.ok) {
      const error = await interestResponse.text();
      throw new Error(`Express interest request failed: ${error}`);
    }

    const interestResult = await interestResponse.json();
    console.log('✅ Express interest request successful');

    // Verify project_interests row exists
    const { data: interests, error: interestsError } = await supabase
      .from('project_interests')
      .select('*')
      .eq('user_id', testUserId)
      .eq('project_id', testTeamId);

    if (interestsError) {
      throw new Error(`Failed to query project_interests: ${interestsError.message}`);
    }

    if (!interests || interests.length === 0) {
      throw new Error('No project interest found in database');
    }

    console.log('✅ Project interest stored in database');
    passedTests++;
    console.log('✅ Test 3 PASSED\n');

    // Test 4: Oracle Suggest
    console.log('📝 Test 4: Oracle Suggest');
    totalTests++;

    const oracleResponse = await fetch(ORACLE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        actor_id: testUserId,
        project: {
          id: testTeamId,
          title: 'Test Project',
          description: 'A test project for building a React application with AI features'
        },
        k: 6
      })
    });

    if (!oracleResponse.ok) {
      const error = await oracleResponse.text();
      throw new Error(`Oracle request failed: ${error}`);
    }

    const oracleResult = await oracleResponse.json();
    console.log('✅ Oracle request successful');

    // Validate response schema
    if (!oracleResult.suggestions || !Array.isArray(oracleResult.suggestions)) {
      throw new Error('Invalid response: suggestions array missing');
    }

    if (!oracleResult.actions || !Array.isArray(oracleResult.actions)) {
      throw new Error('Invalid response: actions array missing');
    }

    if (!oracleResult.meta || !oracleResult.meta.timestamp) {
      throw new Error('Invalid response: meta.timestamp missing');
    }

    console.log(`✅ Response contains ${oracleResult.suggestions.length} suggestions and ${oracleResult.actions.length} actions`);

    // Verify oracle_logs row exists
    const { data: oracleLogs, error: oracleLogsError } = await supabase
      .from('oracle_logs')
      .select('id, response, graph_nodes, embedding_vector')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (oracleLogsError) {
      throw new Error(`Failed to query oracle_logs: ${oracleLogsError.message}`);
    }

    if (!oracleLogs || oracleLogs.length === 0) {
      throw new Error('No oracle log found in database');
    }

    const latestLog = oracleLogs[0];
    if (!latestLog.response) {
      throw new Error('Oracle log missing response field');
    }

    if (!latestLog.graph_nodes) {
      console.log('⚠️  Warning: graph_nodes field is null');
    } else {
      console.log('✅ Graph nodes stored in oracle log');
    }

    if (!latestLog.embedding_vector) {
      console.log('⚠️  Warning: Embedding vector is null (may take time to generate)');
    } else {
      console.log('✅ Embedding vector generated for oracle log');
    }

    console.log('✅ Oracle log stored in database');
    passedTests++;
    console.log('✅ Test 4 PASSED\n');

    // Summary
    console.log('📊 TEST SUMMARY');
    console.log('================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    
    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! GraphRAG + pgvector system is working correctly.');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed. Please check the implementation.');
      process.exit(1);
    }

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests + 1}`);
    process.exit(1);
  }
}

// Cleanup function
async function cleanup() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // Clean up test data
    await supabase.from('skill_offers').delete().eq('owner_id', testUserId);
    await supabase.from('connection_requests').delete().eq('requester_id', testUserId);
    await supabase.from('project_interests').delete().eq('user_id', testUserId);
    await supabase.from('notifications').delete().eq('user_id', testTargetId);
    
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.log('⚠️  Cleanup failed:', error.message);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, cleanup };