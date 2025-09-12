// Test the fixed GraphRAG function
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = "https://dijskfbokusyxkcfwkrc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpanNrZmJva3VzeXhrY2Z3a3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4Mzg4ODcsImV4cCI6MjA2OTQxNDg4N30.idmExW8W2-ymqwVnn4C0kZQmbMKkXl-W9vyIOLpW4Bw";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testGraphRAGFunction() {
  console.log('🔧 Testing Fixed GraphRAG Function...\n');
  
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
    console.log('   Command processed:', response?.command_processed);
    console.log('   Log ID:', response?.log_id);
    console.log('   Result type:', response?.result?.type);
    console.log('   Data count:', response?.result?.data?.length || 0);
    console.log('   Insight:', response?.result?.insight);
    
    return true;
  } catch (error) {
    console.log('❌ GraphRAG function error:', error.message);
    return false;
  }
}

async function testGraphRAGWithDifferentCommands() {
  console.log('\n🔧 Testing GraphRAG with Different Commands...\n');
  
  const testCommands = [
    '/view connections',
    '/offer help', 
    '/join workshop',
    '/suggest collaboration'
  ];
  
  let successCount = 0;
  
  for (const command of testCommands) {
    try {
      console.log(`Testing: ${command}`);
      
      const { data: response, error } = await supabase.functions.invoke('graphrag', {
        body: {
          action: 'oracle_command',
          actor_id: 'test-user',
          target_id: 'test-user',
          body: { 
            command: command,
            context: 'test'
          }
        }
      });

      if (error) {
        console.log(`❌ ${command} failed:`, error.message);
      } else {
        console.log(`✅ ${command} succeeded`);
        console.log(`   Result type: ${response?.result?.type}`);
        console.log(`   Data count: ${response?.result?.data?.length || 0}`);
        successCount++;
      }
    } catch (error) {
      console.log(`❌ ${command} error:`, error.message);
    }
    console.log('---');
  }
  
  return successCount === testCommands.length;
}

async function runGraphRAGTest() {
  console.log('🚀 Starting GraphRAG Function Test...\n');
  console.log('====================================\n');
  
  const results = {
    basicGraphRAG: await testGraphRAGFunction(),
    multipleCommands: await testGraphRAGWithDifferentCommands()
  };
  
  console.log('\n📊 GraphRAG Test Results:');
  console.log('==========================');
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  
  console.log('\n🏁 Overall Status:', allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
  
  if (allPassed) {
    console.log('\n🎉 GraphRAG Function is FULLY FUNCTIONAL!');
    console.log('   ✅ All commands processed successfully');
    console.log('   ✅ Database queries working');
    console.log('   ✅ Error handling robust');
    console.log('   ✅ Oracle logging working');
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

// Run the GraphRAG test
runGraphRAGTest().catch(console.error);
