import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dijskfbokusyxkcfwkrc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpanNrZmJva3VzeXhrY2Z3a3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4Mzg4ODcsImV4cCI6MjA2OTQxNDg4N30.example';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugGraphRAG() {
  console.log('🔍 Debugging GraphRAG Function...\n');

  try {
    // Test 1: Simple button action
    console.log('Test 1: Simple button action');
    const { data, error } = await supabase.functions.invoke('graphrag', {
      body: {
        action: 'oracle_command',
        actor_id: 'test-user-123',
        body: {
          command: 'view connections',
          context: 'debug test'
        }
      }
    });

    if (error) {
      console.log('❌ Error:', error);
      console.log('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Success:', data);
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
    console.log('Exception details:', err);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  try {
    // Test 2: Different endpoint
    console.log('Test 2: Different endpoint');
    const { data, error } = await supabase.functions.invoke('graphrag', {
      body: {
        action: 'oracle_command',
        actor_id: 'test-user-123',
        body: {
          command: 'help',
          context: 'debug test'
        }
      }
    });

    if (error) {
      console.log('❌ Error:', error);
      console.log('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Success:', data);
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
    console.log('Exception details:', err);
  }
}

debugGraphRAG();
