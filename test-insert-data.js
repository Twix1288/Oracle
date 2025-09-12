// Test actual data insertion with real database
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with real credentials
const supabaseUrl = "https://dijskfbokusyxkcfwkrc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpanNrZmJva3VzeXhrY2Z3a3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4Mzg4ODcsImV4cCI6MjA2OTQxNDg4N30.idmExW8W2-ymqwVnn4C0kZQmbMKkXl-W9vyIOLpW4Bw";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdateInsertion() {
  console.log('📊 Testing Update Insertion (Should work - no RLS restrictions)...\n');
  
  try {
    const { data: updateData, error: updateError } = await supabase
      .from('updates')
      .insert({
        title: 'Test Update - Real Database Test',
        content: 'This is a test update to verify the Oracle system works',
        type: 'general',
        user_id: '00000000-0000-0000-0000-000000000000' // Use a fake UUID
      })
      .select()
      .single();

    if (updateError) {
      console.log('❌ Update insertion failed:', updateError.message);
      console.log('   Error details:', updateError);
      return false;
    }
    
    console.log('✅ Update inserted successfully!');
    console.log('   ID:', updateData.id);
    console.log('   Title:', updateData.title);
    console.log('   Content:', updateData.content);
    console.log('   User ID:', updateData.user_id);
    console.log('   Created At:', updateData.created_at);
    
    return true;
  } catch (error) {
    console.log('❌ Update insertion error:', error.message);
    return false;
  }
}

async function testMessageInsertion() {
  console.log('\n📝 Testing Message Insertion (May fail due to RLS)...\n');
  
  try {
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert({
        content: 'Test message from real database test',
        sender_id: '00000000-0000-0000-0000-000000000000', // Use a fake UUID
        team_id: null
      })
      .select()
      .single();

    if (messageError) {
      console.log('❌ Message insertion failed:', messageError.message);
      console.log('   Error details:', messageError);
      console.log('   This is expected due to RLS policies requiring authentication');
      return false;
    }
    
    console.log('✅ Message inserted successfully!');
    console.log('   ID:', messageData.id);
    console.log('   Content:', messageData.content);
    console.log('   Sender ID:', messageData.sender_id);
    console.log('   Team ID:', messageData.team_id);
    console.log('   Created At:', messageData.created_at);
    
    return true;
  } catch (error) {
    console.log('❌ Message insertion error:', error.message);
    return false;
  }
}

async function testOracleLogInsertion() {
  console.log('\n📋 Testing Oracle Log Insertion...\n');
  
  try {
    const testResponse = {
      answer: 'Test response from real database test',
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
        user_id: '00000000-0000-0000-0000-000000000000', // Use a fake UUID
        query: 'Test query from real database test',
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
      console.log('❌ Oracle log insertion failed:', logError.message);
      console.log('   Error details:', logError);
      return false;
    }
    
    console.log('✅ Oracle log inserted successfully!');
    console.log('   ID:', logData.id);
    console.log('   Query:', logData.query);
    console.log('   Response type:', typeof logData.response);
    console.log('   User ID:', logData.user_id);
    console.log('   Created At:', logData.created_at);
    
    return true;
  } catch (error) {
    console.log('❌ Oracle log insertion error:', error.message);
    return false;
  }
}

async function testSuperOracleFunction() {
  console.log('\n🔧 Testing Super Oracle Function...\n');
  
  try {
    const { data: response, error } = await supabase.functions.invoke('super-oracle', {
      body: {
        query: 'Test query for real database verification',
        type: 'chat',
        role: 'builder',
        userId: 'test-user',
        context: { test: true }
      }
    });

    if (error) {
      console.log('❌ Super Oracle function failed:', error.message);
      console.log('   Error details:', error);
      return false;
    }
    
    console.log('✅ Super Oracle function working!');
    console.log('   Response type:', typeof response);
    console.log('   Answer length:', response?.answer?.length || 0);
    console.log('   Sources:', response?.sources || 0);
    console.log('   Confidence:', response?.confidence || 0);
    console.log('   Model used:', response?.model_used || 'unknown');
    
    return true;
  } catch (error) {
    console.log('❌ Super Oracle function error:', error.message);
    return false;
  }
}

async function runInsertionTest() {
  console.log('🚀 Starting Real Data Insertion Test...\n');
  console.log('=====================================\n');
  
  const results = {
    updateInsertion: await testUpdateInsertion(),
    messageInsertion: await testMessageInsertion(),
    oracleLogInsertion: await testOracleLogInsertion(),
    superOracleFunction: await testSuperOracleFunction()
  };
  
  console.log('\n📊 Insertion Test Results:');
  console.log('===========================');
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const criticalTests = ['updateInsertion', 'oracleLogInsertion', 'superOracleFunction'];
  const criticalPassed = criticalTests.every(test => results[test]);
  
  console.log('\n🏁 Overall Status:', criticalPassed ? 'CORE FUNCTIONALITY WORKS' : 'SOME CORE ISSUES');
  
  if (criticalPassed) {
    console.log('\n🎉 Oracle Commands System is FUNCTIONAL!');
    console.log('   ✅ Updates can be created');
    console.log('   ✅ Oracle logs are working');
    console.log('   ✅ Super Oracle function is responding');
    console.log('   ⚠️  Messages require authentication (expected)');
  } else {
    console.log('\n⚠️  Core issues that need attention:');
    criticalTests.forEach(test => {
      if (!results[test]) {
        console.log(`   - ${test} needs to be fixed`);
      }
    });
  }
  
  return criticalPassed;
}

// Run the insertion test
runInsertionTest().catch(console.error);
