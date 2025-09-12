import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dijskfbokusyxkcfwkrc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpanNrZmJva3VzeXhrY2Z3a3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4Mzg4ODcsImV4cCI6MjA2OTQxNDg4N30.idmExW8W2-ymqwVnn4C0kZQmbMKkXl-W9vyIOLpW4Bw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGraphRAG() {
  console.log('🔍 Testing GraphRAG Function...\n');

  try {
    const { data, error } = await supabase.functions.invoke('graphrag', {
      body: {
        action: 'oracle_command',
        actor_id: 'test-user-123',
        body: {
          command: 'view connections',
          context: 'test'
        }
      }
    });

    if (error) {
      console.log('❌ GraphRAG Error:', error.message);
      console.log('Status:', error.context?.status);
    } else {
      console.log('✅ GraphRAG Working!');
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }
}

testGraphRAG();
