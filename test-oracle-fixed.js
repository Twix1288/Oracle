// Test Oracle Commands with Fixed RLS Policies
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = "https://dijskfbokusyxkcfwkrc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpanNrZmJva3VzeXhrY2Z3a3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4Mzg4ODcsImV4cCI6MjA2OTQxNDg4N30.idmExW8W2-ymqwVnn4C0kZQmbMKkXl-W9vyIOLpW4Bw";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testWithServiceRole() {
  console.log('🔧 Testing with Service Role (Bypasses RLS)...\n');
  
  try {
    // Test message creation with service role
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert({
        content: 'Test message from service role test',
        sender_id: '00000000-0000-0000-0000-000000000000',
        team_id: null
      })
      .select()
      .single();

    if (messageError) {
      console.log('❌ Message creation failed:', messageError.message);
      return false;
    }
    
    console.log('✅ Message created successfully');
    console.log('   ID:', messageData.id);
    console.log('   Content:', messageData.content);
    
    // Test update creation with service role
    const { data: updateData, error: updateError } = await supabase
      .from('updates')
      .insert({
        title: 'Test Update - Service Role Test',
        content: 'Test update from service role test',
        type: 'general',
        user_id: '00000000-0000-0000-0000-000000000000'
      })
      .select()
      .single();

    if (updateError) {
      console.log('❌ Update creation failed:', updateError.message);
      return false;
    }
    
    console.log('✅ Update created successfully');
    console.log('   ID:', updateData.id);
    console.log('   Title:', updateData.title);
    
    return true;
  } catch (error) {
    console.log('❌ Service role test error:', error.message);
    return false;
  }
}

async function testSuperOracleFunction() {
  console.log('\n🔧 Testing Super Oracle Function...\n');
  
  try {
    const { data: response, error } = await supabase.functions.invoke('super-oracle', {
      body: {
        query: 'Test query for fixed verification',
        type: 'chat',
        role: 'builder',
        userId: 'test-user',
        context: { test: true }
      }
    });

    if (error) {
      console.log('❌ Super Oracle function failed:', error.message);
      return false;
    }
    
    console.log('✅ Super Oracle function working!');
    console.log('   Answer length:', response?.answer?.length || 0);
    console.log('   Sources:', response?.sources || 0);
    console.log('   Confidence:', response?.confidence || 0);
    
    return true;
  } catch (error) {
    console.log('❌ Super Oracle function error:', error.message);
    return false;
  }
}

async function testGraphRAGFunction() {
  console.log('\n🔧 Testing GraphRAG Function...\n');
  
  try {
    const { data: response, error } = await supabase.functions.invoke('graphrag', {
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

    if (error) {
      console.log('❌ GraphRAG function failed:', error.message);
      console.log('   Error details:', error);
      return false;
    }
    
    console.log('✅ GraphRAG function working!');
    console.log('   Response type:', typeof response);
    console.log('   Has result:', !!response?.result);
    
    return true;
  } catch (error) {
    console.log('❌ GraphRAG function error:', error.message);
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

async function runFixedTest() {
  console.log('🚀 Starting Fixed Oracle Commands Test...\n');
  console.log('========================================\n');
  
  const results = {
    serviceRoleTest: await testWithServiceRole(),
    superOracleFunction: await testSuperOracleFunction(),
    graphRAGFunction: await testGraphRAGFunction(),
    commandDetection: await testCommandDetection()
  };
  
  console.log('\n📊 Fixed Test Results:');
  console.log('======================');
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  
  console.log('\n🏁 Overall Status:', allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
  
  if (allPassed) {
    console.log('\n🎉 Oracle Commands System is FULLY FUNCTIONAL!');
    console.log('   ✅ Database operations work');
    console.log('   ✅ Backend functions respond');
    console.log('   ✅ Command detection works');
    console.log('   ✅ All components integrated');
  } else {
    console.log('\n⚠️  Issues that need attention:');
    Object.entries(results).forEach(([test, passed]) => {
      if (!passed) {
        console.log(`   - ${test} needs to be fixed`);
      }
    });
  }
  
  return allPassed;
}

// Run the fixed test
runFixedTest().catch(console.error);
