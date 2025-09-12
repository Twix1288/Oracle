// Test script to verify Oracle commands work with backend
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testOracleCommands() {
  console.log('🧪 Testing Oracle Commands...\n');

  // Test 1: Test message creation
  console.log('1. Testing /message command...');
  try {
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert({
        content: 'Test message from Oracle command',
        sender_id: 'test-user-id',
        team_id: null
      })
      .select()
      .single();

    if (messageError) {
      console.log('❌ Message creation failed:', messageError.message);
    } else {
      console.log('✅ Message created successfully:', messageData.id);
    }
  } catch (error) {
    console.log('❌ Message creation error:', error.message);
  }

  // Test 2: Test update creation
  console.log('\n2. Testing /update command...');
  try {
    const { data: updateData, error: updateError } = await supabase
      .from('updates')
      .insert({
        title: 'Test Update - Oracle Command',
        content: 'Test update content from Oracle command',
        type: 'general',
        user_id: 'test-user-id'
      })
      .select()
      .single();

    if (updateError) {
      console.log('❌ Update creation failed:', updateError.message);
    } else {
      console.log('✅ Update created successfully:', updateData.id);
    }
  } catch (error) {
    console.log('❌ Update creation error:', error.message);
  }

  // Test 3: Test Super Oracle function
  console.log('\n3. Testing Super Oracle function...');
  try {
    const { data: oracleResponse, error: oracleError } = await supabase.functions.invoke('super-oracle', {
      body: {
        query: 'Test query for Oracle',
        type: 'chat',
        role: 'builder',
        userId: 'test-user-id',
        context: { test: true }
      }
    });

    if (oracleError) {
      console.log('❌ Super Oracle failed:', oracleError.message);
    } else {
      console.log('✅ Super Oracle response received:', oracleResponse.answer?.substring(0, 100) + '...');
    }
  } catch (error) {
    console.log('❌ Super Oracle error:', error.message);
  }

  // Test 4: Test GraphRAG function
  console.log('\n4. Testing GraphRAG function...');
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
      console.log('❌ GraphRAG failed:', graphRagError.message);
    } else {
      console.log('✅ GraphRAG response received:', graphRagResponse);
    }
  } catch (error) {
    console.log('❌ GraphRAG error:', error.message);
  }

  // Test 5: Test oracle_logs insertion
  console.log('\n5. Testing oracle_logs insertion...');
  try {
    const { data: logData, error: logError } = await supabase
      .from('oracle_logs')
      .insert({
        user_id: 'test-user-id',
        query: 'Test query',
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
      console.log('❌ Oracle logs insertion failed:', logError.message);
    } else {
      console.log('✅ Oracle log created successfully:', logData.id);
    }
  } catch (error) {
    console.log('❌ Oracle logs error:', error.message);
  }

  console.log('\n🏁 Test completed!');
}

// Run the test
testOracleCommands().catch(console.error);
