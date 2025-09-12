// Real Oracle Commands Test - Works with actual RLS policies
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with real credentials
const supabaseUrl = "https://dijskfbokusyxkcfwkrc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpanNrZmJva3VzeXhrY2Z3a3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4Mzg4ODcsImV4cCI6MjA2OTQxNDg4N30.idmExW8W2-ymqwVnn4C0kZQmbMKkXl-W9vyIOLpW4Bw";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...\n');
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.log('❌ Database connection error:', error.message);
    return false;
  }
}

async function testUpdatesTable() {
  console.log('\n📊 Testing Updates Table (No RLS restrictions)...\n');
  
  try {
    // First, let's see what's in the updates table
    const { data: existingUpdates, error: selectError } = await supabase
      .from('updates')
      .select('*')
      .limit(5);
    
    if (selectError) {
      console.log('❌ Updates table select failed:', selectError.message);
      return false;
    }
    
    console.log('✅ Updates table accessible');
    console.log('   Existing updates count:', existingUpdates.length);
    
    // Test the schema by checking the structure
    if (existingUpdates.length > 0) {
      const sample = existingUpdates[0];
      console.log('   Sample update structure:');
      console.log('     ID:', sample.id);
      console.log('     Title:', sample.title);
      console.log('     Content:', sample.content);
      console.log('     Type:', sample.type);
      console.log('     User ID:', sample.user_id);
      console.log('     Created At:', sample.created_at);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Updates table test error:', error.message);
    return false;
  }
}

async function testMessagesTable() {
  console.log('\n📝 Testing Messages Table (RLS restricted)...\n');
  
  try {
    // Try to select from messages table
    const { data: existingMessages, error: selectError } = await supabase
      .from('messages')
      .select('*')
      .limit(5);
    
    if (selectError) {
      console.log('❌ Messages table select failed:', selectError.message);
      console.log('   Error details:', selectError);
      return false;
    }
    
    console.log('✅ Messages table accessible');
    console.log('   Existing messages count:', existingMessages.length);
    
    // Test the schema by checking the structure
    if (existingMessages.length > 0) {
      const sample = existingMessages[0];
      console.log('   Sample message structure:');
      console.log('     ID:', sample.id);
      console.log('     Content:', sample.content);
      console.log('     Sender ID:', sample.sender_id);
      console.log('     Team ID:', sample.team_id);
      console.log('     Created At:', sample.created_at);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Messages table test error:', error.message);
    return false;
  }
}

async function testOracleLogsTable() {
  console.log('\n📋 Testing Oracle Logs Table...\n');
  
  try {
    // Try to select from oracle_logs table
    const { data: existingLogs, error: selectError } = await supabase
      .from('oracle_logs')
      .select('*')
      .limit(5);
    
    if (selectError) {
      console.log('❌ Oracle logs table select failed:', selectError.message);
      return false;
    }
    
    console.log('✅ Oracle logs table accessible');
    console.log('   Existing logs count:', existingLogs.length);
    
    // Test the schema by checking the structure
    if (existingLogs.length > 0) {
      const sample = existingLogs[0];
      console.log('   Sample log structure:');
      console.log('     ID:', sample.id);
      console.log('     Query:', sample.query);
      console.log('     Response type:', typeof sample.response);
      console.log('     Query Type:', sample.query_type);
      console.log('     Model Used:', sample.model_used);
      console.log('     User ID:', sample.user_id);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Oracle logs table test error:', error.message);
    return false;
  }
}

async function testBackendFunctions() {
  console.log('\n🔧 Testing Backend Functions...\n');
  
  try {
    // Test Super Oracle function
    console.log('Testing Super Oracle function...');
    const { data: superOracleResponse, error: superOracleError } = await supabase.functions.invoke('super-oracle', {
      body: {
        query: 'Test query for real verification',
        type: 'chat',
        role: 'builder',
        userId: 'test-user',
        context: { test: true }
      }
    });

    if (superOracleError) {
      console.log('❌ Super Oracle function failed:', superOracleError.message);
      console.log('   Error details:', superOracleError);
    } else {
      console.log('✅ Super Oracle function working');
      console.log('   Response type:', typeof superOracleResponse);
      console.log('   Has answer:', !!superOracleResponse?.answer);
    }
    
    // Test GraphRAG function
    console.log('\nTesting GraphRAG function...');
    const { data: graphRagResponse, error: graphRagError } = await supabase.functions.invoke('graphrag', {
      body: {
        action: 'oracle_command',
        actor_id: 'test-user',
        target_id: 'test-user',
        body: { 
          command: '/view connections',
          context: 'test'
        }
      }
    });

    if (graphRagError) {
      console.log('❌ GraphRAG function failed:', graphRagError.message);
      console.log('   Error details:', graphRagError);
    } else {
      console.log('✅ GraphRAG function working');
      console.log('   Response type:', typeof graphRagResponse);
      console.log('   Has result:', !!graphRagResponse?.result);
    }
    
    return !superOracleError && !graphRagError;
  } catch (error) {
    console.log('❌ Backend functions error:', error.message);
    return false;
  }
}

async function testCommandDetection() {
  console.log('\n🎯 Testing Command Detection Logic...\n');
  
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

async function runRealTest() {
  console.log('🚀 Starting Real Oracle Commands Test...\n');
  console.log('========================================\n');
  
  const results = {
    databaseConnection: await testDatabaseConnection(),
    updatesTable: await testUpdatesTable(),
    messagesTable: await testMessagesTable(),
    oracleLogsTable: await testOracleLogsTable(),
    backendFunctions: await testBackendFunctions(),
    commandDetection: await testCommandDetection()
  };
  
  console.log('\n📊 Real Test Results:');
  console.log('=====================');
  
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
    console.log('\n🎉 Oracle Commands System is WORKING!');
    console.log('   Database connection is successful');
    console.log('   All tables are accessible');
    console.log('   Backend functions are responding');
    console.log('   Command detection is working');
  }
  
  return allPassed;
}

// Run the real test
runRealTest().catch(console.error);
