import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dijskfbokusyxkcfwkrc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpanNrZmJva3VzeXhrY2Z3a3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4Mzg4ODcsImV4cCI6MjA2OTQxNDg4N30.example';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGraphRAGWithAuth() {
  console.log('🔍 Testing GraphRAG with Authentication...\n');

  try {
    // First, let's try to sign in as a user to get a proper JWT
    console.log('Step 1: Attempting to sign in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123'
    });

    if (authError) {
      console.log('❌ Auth error (expected):', authError.message);
      console.log('This is expected - we need to create a test user or use service role');
    } else {
      console.log('✅ Auth successful:', authData.user?.id);
    }

    console.log('\nStep 2: Testing with service role key...');
    
    // Create a client with service role key
    const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpanNrZmJva3VzeXhrY2Z3a3JjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzgzODg4NywiZXhwIjoyMDY5NDE0ODg3fQ.example';
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { data, error } = await serviceClient.functions.invoke('graphrag', {
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
      console.log('❌ Service role error:', error);
    } else {
      console.log('✅ Service role success:', data);
    }

  } catch (err) {
    console.log('❌ Exception:', err.message);
  }
}

testGraphRAGWithAuth();
