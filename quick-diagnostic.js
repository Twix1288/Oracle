// Quick diagnostic test for all Oracle components
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://dijskfbokusyxkcfwkrc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpanNrZmJva3VzeXhrY2Z3a3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4Mzg4ODcsImV4cCI6MjA2OTQxNDg4N30.idmExW8W2-ymqwVnn4C0kZQmbMKkXl-W9vyIOLpW4Bw";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSuperOracle() {
  console.log('🔧 Testing Super Oracle...');
  try {
    const { data, error } = await supabase.functions.invoke('super-oracle', {
      body: { query: 'Test', type: 'chat', role: 'builder', userId: 'test' }
    });
    return !error;
  } catch (e) {
    return false;
  }
}

async function testGraphRAG() {
  console.log('🔧 Testing GraphRAG...');
  try {
    const { data, error } = await supabase.functions.invoke('graphrag', {
      body: { action: 'oracle_command', actor_id: 'test', target_id: 'test', body: { command: '/test' } }
    });
    return !error;
  } catch (e) {
    return false;
  }
}

async function testDatabase() {
  console.log('🔧 Testing Database...');
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    return !error;
  } catch (e) {
    return false;
  }
}

async function runDiagnostic() {
  console.log('🚀 Oracle System Diagnostic\n');
  
  const results = {
    superOracle: await testSuperOracle(),
    graphRAG: await testGraphRAG(),
    database: await testDatabase()
  };
  
  console.log('\n📊 Results:');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'WORKING' : 'FAILED'}`);
  });
  
  return results;
}

runDiagnostic().catch(console.error);
