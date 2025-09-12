// Deep test of Oracle commands functionality
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testMessageCommand() {
  console.log('🧪 Testing /message command...');
  
  try {
    // Test message creation with exact schema
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert({
        content: 'Test message from deep verification',
        sender_id: 'test-user-id',
        team_id: null
      })
      .select()
      .single();

    if (messageError) {
      console.log('❌ Message creation failed:', messageError);
      return false;
    } else {
      console.log('✅ Message created successfully:', messageData.id);
      return true;
    }
  } catch (error) {
    console.log('❌ Message creation error:', error.message);
    return false;
  }
}

async function testUpdateCommand() {
  console.log('🧪 Testing /update command...');
  
  try {
    // Test update creation with exact schema
    const { data: updateData, error: updateError } = await supabase
      .from('updates')
      .insert({
        title: 'Test Update - Deep Verification',
        content: 'Test update content from deep verification',
        type: 'general',
        user_id: 'test-user-id'
      })
      .select()
      .single();

    if (updateError) {
      console.log('❌ Update creation failed:', updateError);
      return false;
    } else {
      console.log('✅ Update created successfully:', updateData.id);
      return true;
    }
  } catch (error) {
    console.log('❌ Update creation error:', error.message);
    return false;
  }
}

async function testSuperOracleFunction() {
  console.log('🧪 Testing Super Oracle function...');
  
  try {
    const { data: oracleResponse, error: oracleError } = await supabase.functions.invoke('super-oracle', {
      body: {
        query: 'Test query for deep verification',
        type: 'chat',
        role: 'builder',
        userId: 'test-user-id',
        context: { test: true }
      }
    });

    if (oracleError) {
      console.log('❌ Super Oracle failed:', oracleError);
      return false;
    } else {
      console.log('✅ Super Oracle response received');
      console.log('   Answer length:', oracleResponse.answer?.length || 0);
      console.log('   Sources:', oracleResponse.sources || 0);
      console.log('   Confidence:', oracleResponse.confidence || 0);
      return true;
    }
  } catch (error) {
    console.log('❌ Super Oracle error:', error.message);
    return false;
  }
}

async function testGraphRAGFunction() {
  console.log('🧪 Testing GraphRAG function...');
  
  try {
    const { data: graphRagResponse, error: graphRagError } = await supabase.functions.invoke('graphrag', {
      body: {
        action: 'oracle_command',
        actor_id: 'test-user-id',
        target_id: 'test-user-id',
        body: { 
          command: '/view connections',
          context: 'test'
        }
      }
    });

    if (graphRagError) {
      console.log('❌ GraphRAG failed:', graphRagError);
      return false;
    } else {
      console.log('✅ GraphRAG response received');
      console.log('   Result:', graphRagResponse.result ? 'Present' : 'Missing');
      console.log('   Log ID:', graphRagResponse.log_id || 'Missing');
      return true;
    }
  } catch (error) {
    console.log('❌ GraphRAG error:', error.message);
    return false;
  }
}

async function testOracleLogsInsertion() {
  console.log('🧪 Testing oracle_logs insertion...');
  
  try {
    const { data: logData, error: logError } = await supabase
      .from('oracle_logs')
      .insert({
        user_id: 'test-user-id',
        query: 'Test query for deep verification',
        response: JSON.stringify({ test: 'response' }),
        query_type: 'test',
        model_used: 'test-model',
        confidence: 0.95,
        sources: 1,
        context_used: true
      })
      .select()
      .single();

    if (logError) {
      console.log('❌ Oracle logs insertion failed:', logError);
      return false;
    } else {
      console.log('✅ Oracle log created successfully:', logData.id);
      return true;
    }
  } catch (error) {
    console.log('❌ Oracle logs error:', error.message);
    return false;
  }
}

async function testCommandDetection() {
  console.log('🧪 Testing command detection logic...');
  
  // Test message command detection
  const messageCommand = '/message team: Hello everyone!';
  const messageMatch = messageCommand.match(/^\/message\s+([^:]+):\s*(.+)$/);
  
  if (!messageMatch) {
    console.log('❌ Message command detection failed');
    return false;
  }
  
  console.log('✅ Message command detection works');
  console.log('   Recipient:', messageMatch[1]);
  console.log('   Message:', messageMatch[2]);
  
  // Test update command detection
  const updateCommand = '/update Just completed the authentication system';
  const updateContent = updateCommand.substring(8);
  
  if (!updateContent) {
    console.log('❌ Update command detection failed');
    return false;
  }
  
  console.log('✅ Update command detection works');
  console.log('   Content:', updateContent);
  
  return true;
}

async function runDeepVerification() {
  console.log('🔍 Starting Deep Oracle Commands Verification...\n');
  
  const results = {
    messageCommand: await testMessageCommand(),
    updateCommand: await testUpdateCommand(),
    superOracle: await testSuperOracleFunction(),
    graphRAG: await testGraphRAGFunction(),
    oracleLogs: await testOracleLogsInsertion(),
    commandDetection: await testCommandDetection()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  
  console.log('\n🏁 Overall Status:', allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
  
  if (!allPassed) {
    console.log('\n⚠️  Issues found that need to be fixed:');
    Object.entries(results).forEach(([test, passed]) => {
      if (!passed) {
        console.log(`   - ${test} needs attention`);
      }
    });
  }
  
  return allPassed;
}

// Run the deep verification
runDeepVerification().catch(console.error);
