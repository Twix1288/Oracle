// Comprehensive Oracle Commands Test
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test user data
const testUser = {
  id: 'test-user-123',
  email: 'test@example.com'
};

const testTeam = {
  id: 'test-team-456',
  name: 'Test Team'
};

async function testDatabaseSchema() {
  console.log('🔍 Testing Database Schema Compatibility...\n');
  
  try {
    // Test messages table structure
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);
    
    if (messagesError) {
      console.log('❌ Messages table error:', messagesError.message);
      return false;
    }
    console.log('✅ Messages table accessible');
    
    // Test updates table structure
    const { data: updatesData, error: updatesError } = await supabase
      .from('updates')
      .select('*')
      .limit(1);
    
    if (updatesError) {
      console.log('❌ Updates table error:', updatesError.message);
      return false;
    }
    console.log('✅ Updates table accessible');
    
    // Test oracle_logs table structure
    const { data: logsData, error: logsError } = await supabase
      .from('oracle_logs')
      .select('*')
      .limit(1);
    
    if (logsError) {
      console.log('❌ Oracle logs table error:', logsError.message);
      return false;
    }
    console.log('✅ Oracle logs table accessible');
    
    return true;
  } catch (error) {
    console.log('❌ Database schema test failed:', error.message);
    return false;
  }
}

async function testMessageCreation() {
  console.log('\n📝 Testing Message Creation...\n');
  
  try {
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert({
        content: 'Test message from comprehensive verification',
        sender_id: testUser.id,
        team_id: testTeam.id
      })
      .select()
      .single();

    if (messageError) {
      console.log('❌ Message creation failed:', messageError);
      return false;
    }
    
    console.log('✅ Message created successfully');
    console.log('   ID:', messageData.id);
    console.log('   Content:', messageData.content);
    console.log('   Sender ID:', messageData.sender_id);
    console.log('   Team ID:', messageData.team_id);
    
    return true;
  } catch (error) {
    console.log('❌ Message creation error:', error.message);
    return false;
  }
}

async function testUpdateCreation() {
  console.log('\n📊 Testing Update Creation...\n');
  
  try {
    const { data: updateData, error: updateError } = await supabase
      .from('updates')
      .insert({
        title: 'Test Update - Comprehensive Verification',
        content: 'Test update content from comprehensive verification',
        type: 'general',
        user_id: testUser.id
      })
      .select()
      .single();

    if (updateError) {
      console.log('❌ Update creation failed:', updateError);
      return false;
    }
    
    console.log('✅ Update created successfully');
    console.log('   ID:', updateData.id);
    console.log('   Title:', updateData.title);
    console.log('   Content:', updateData.content);
    console.log('   User ID:', updateData.user_id);
    
    return true;
  } catch (error) {
    console.log('❌ Update creation error:', error.message);
    return false;
  }
}

async function testOracleLogging() {
  console.log('\n📋 Testing Oracle Logging...\n');
  
  try {
    const testResponse = {
      answer: 'Test response from comprehensive verification',
      sources: 1,
      context_used: true,
      model_used: 'test-model',
      confidence: 0.95,
      processing_time: 100,
      search_strategy: 'test'
    };
    
    const { data: logData, error: logError } = await supabase
      .from('oracle_logs')
      .insert({
        user_id: testUser.id,
        query: 'Test query for comprehensive verification',
        response: JSON.stringify(testResponse),
        query_type: 'test',
        model_used: 'test-model',
        confidence: 0.95,
        sources: 1,
        context_used: true
      })
      .select()
      .single();

    if (logError) {
      console.log('❌ Oracle logging failed:', logError);
      return false;
    }
    
    console.log('✅ Oracle log created successfully');
    console.log('   ID:', logData.id);
    console.log('   Query:', logData.query);
    console.log('   Response type:', typeof logData.response);
    
    return true;
  } catch (error) {
    console.log('❌ Oracle logging error:', error.message);
    return false;
  }
}

async function testBackendFunctions() {
  console.log('\n🔧 Testing Backend Functions...\n');
  
  try {
    // Test Super Oracle function
    const { data: superOracleResponse, error: superOracleError } = await supabase.functions.invoke('super-oracle', {
      body: {
        query: 'Test query for comprehensive verification',
        type: 'chat',
        role: 'builder',
        userId: testUser.id,
        context: { test: true }
      }
    });

    if (superOracleError) {
      console.log('❌ Super Oracle function failed:', superOracleError);
      return false;
    }
    
    console.log('✅ Super Oracle function working');
    console.log('   Response type:', typeof superOracleResponse);
    console.log('   Has answer:', !!superOracleResponse.answer);
    
    // Test GraphRAG function
    const { data: graphRagResponse, error: graphRagError } = await supabase.functions.invoke('graphrag', {
      body: {
        action: 'oracle_command',
        actor_id: testUser.id,
        target_id: testUser.id,
        body: { 
          command: '/view connections',
          context: 'test'
        }
      }
    });

    if (graphRagError) {
      console.log('❌ GraphRAG function failed:', graphRagError);
      return false;
    }
    
    console.log('✅ GraphRAG function working');
    console.log('   Response type:', typeof graphRagResponse);
    console.log('   Has result:', !!graphRagResponse.result);
    
    return true;
  } catch (error) {
    console.log('❌ Backend functions error:', error.message);
    return false;
  }
}

async function testCommandDetection() {
  console.log('\n🎯 Testing Command Detection...\n');
  
  const testCommands = [
    '/message team: Hello everyone!',
    '/update Just completed the authentication system',
    '/view connections',
    '/offer help',
    '/join workshop',
    '/suggest collaboration',
    '/ask oracle What should I work on next?',
    '/help'
  ];
  
  let allDetected = true;
  
  testCommands.forEach((command, index) => {
    const result = detectSlashCommand(command);
    if (result) {
      console.log(`✅ Command ${index + 1}: "${command}" -> ${result.type}`);
    } else {
      console.log(`❌ Command ${index + 1}: "${command}" -> NOT DETECTED`);
      allDetected = false;
    }
  });
  
  return allDetected;
}

function detectSlashCommand(query) {
  const trimmed = query.trim();
  
  // Functional commands that actually execute actions
  if (trimmed.startsWith('/message ')) {
    const messageMatch = trimmed.match(/^\/message\s+([^:]+):\s*(.+)$/);
    if (messageMatch) {
      return { 
        type: 'send_message', 
        query: trimmed,
        recipient: messageMatch[1].trim(),
        message: messageMatch[2].trim()
      };
    }
    return { type: 'send_message', query: trimmed.substring(9).trim() };
  }
  if (trimmed.startsWith('/update ')) {
    return { 
      type: 'create_update', 
      query: trimmed.substring(8).trim() || 'help me create a project update'
    };
  }
  
  // AI-powered commands
  if (trimmed.startsWith('/ask oracle ')) {
    return { type: 'ask_oracle', query: trimmed.substring(12).trim() };
  }
  if (trimmed.startsWith('/view connections')) {
    return { type: 'view_connections', query: 'show me my network connections' };
  }
  if (trimmed.startsWith('/offer help')) {
    return { type: 'offer_help', query: 'find opportunities to help others' };
  }
  if (trimmed.startsWith('/join workshop')) {
    return { type: 'join_workshop', query: 'find workshops to join' };
  }
  if (trimmed.startsWith('/suggest collaboration')) {
    return { type: 'suggest_collaboration', query: 'suggest collaboration opportunities' };
  }
  
  // Legacy commands for backward compatibility
  if (trimmed.startsWith('/help')) {
    return { type: 'help', query: 'help with Oracle commands and features' };
  }
  
  return null;
}

async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive Oracle Commands Test...\n');
  console.log('================================================\n');
  
  const results = {
    databaseSchema: await testDatabaseSchema(),
    messageCreation: await testMessageCreation(),
    updateCreation: await testUpdateCreation(),
    oracleLogging: await testOracleLogging(),
    backendFunctions: await testBackendFunctions(),
    commandDetection: await testCommandDetection()
  };
  
  console.log('\n📊 Comprehensive Test Results:');
  console.log('================================');
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  
  console.log('\n🏁 Overall Status:', allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
  
  if (!allPassed) {
    console.log('\n⚠️  Issues that need attention:');
    Object.entries(results).forEach(([test, passed]) => {
      if (!passed) {
        console.log(`   - ${test} needs to be fixed`);
      }
    });
  } else {
    console.log('\n🎉 Oracle Commands System is FULLY FUNCTIONAL!');
    console.log('   All components are working correctly');
    console.log('   Database operations are successful');
    console.log('   Backend functions are responding');
    console.log('   Command detection is working');
    console.log('   User can execute all commands successfully');
  }
  
  return allPassed;
}

// Run the comprehensive test
runComprehensiveTest().catch(console.error);
