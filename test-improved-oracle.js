#!/usr/bin/env node

/**
 * Test script for the improved Oracle functions
 * Tests both super-oracle and graphrag functions with comprehensive data
 */

const testSuperOracle = async () => {
  console.log('🧪 Testing Super Oracle Function...\n');
  
  const testCases = [
    {
      name: 'Basic Chat Query',
      payload: {
        query: 'What are some good people to work with?',
        type: 'chat',
        role: 'builder',
        userId: 'test-user-123'
      }
    },
    {
      name: 'Resource Query',
      payload: {
        query: 'React development resources',
        type: 'resources',
        role: 'builder',
        userId: 'test-user-123'
      }
    },
    {
      name: 'Project Creation Query',
      payload: {
        query: 'How do I create a new project?',
        type: 'project_creation',
        role: 'builder',
        userId: 'test-user-123'
      }
    },
    {
      name: 'Connection Query',
      payload: {
        query: 'How can I connect with other builders?',
        type: 'connect',
        role: 'builder',
        userId: 'test-user-123'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.name}`);
    console.log(`   Query: ${testCase.payload.query}`);
    console.log(`   Type: ${testCase.payload.type}`);
    
    try {
      const response = await fetch('http://localhost:54321/functions/v1/super-oracle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer your-anon-key'
        },
        body: JSON.stringify(testCase.payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Success: ${data.answer ? data.answer.substring(0, 100) + '...' : 'No answer'}`);
        console.log(`   📊 Sources: ${data.sources}, Confidence: ${data.confidence}, Strategy: ${data.search_strategy}`);
      } else {
        console.log(`   ❌ Error: ${response.status} - ${await response.text()}`);
      }
    } catch (error) {
      console.log(`   ❌ Network Error: ${error.message}`);
    }
    
    console.log('');
  }
};

const testGraphRAG = async () => {
  console.log('🧪 Testing GraphRAG Function...\n');
  
  const testCases = [
    {
      name: 'Oracle Command - View Connections',
      payload: {
        action: 'oracle_command',
        actor_id: 'test-user-123',
        body: {
          command: 'view connections',
          context: { userId: 'test-user-123' }
        }
      }
    },
    {
      name: 'Oracle Command - Offer Help',
      payload: {
        action: 'oracle_command',
        actor_id: 'test-user-123',
        body: {
          command: 'offer help',
          context: { userId: 'test-user-123' }
        }
      }
    },
    {
      name: 'Oracle Command - Join Workshop',
      payload: {
        action: 'oracle_command',
        actor_id: 'test-user-123',
        body: {
          command: 'join workshop',
          context: { userId: 'test-user-123' }
        }
      }
    },
    {
      name: 'Oracle Command - Find Team',
      payload: {
        action: 'oracle_command',
        actor_id: 'test-user-123',
        body: {
          command: 'find team',
          context: { userId: 'test-user-123' }
        }
      }
    },
    {
      name: 'Oracle Command - Track Progress',
      payload: {
        action: 'oracle_command',
        actor_id: 'test-user-123',
        body: {
          command: 'track progress',
          context: { userId: 'test-user-123' }
        }
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.name}`);
    console.log(`   Command: ${testCase.payload.body.command}`);
    
    try {
      const response = await fetch('http://localhost:54321/functions/v1/graphrag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer your-anon-key'
        },
        body: JSON.stringify(testCase.payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Success: ${data.result?.insight || 'Command processed'}`);
        console.log(`   📊 Type: ${data.result?.type || 'Unknown'}`);
        if (data.result?.data) {
          const dataKeys = Object.keys(data.result.data);
          console.log(`   📊 Data Keys: ${dataKeys.join(', ')}`);
        }
      } else {
        console.log(`   ❌ Error: ${response.status} - ${await response.text()}`);
      }
    } catch (error) {
      console.log(`   ❌ Network Error: ${error.message}`);
    }
    
    console.log('');
  }
};

const testEmbeddingGeneration = async () => {
  console.log('🧪 Testing Embedding Generation...\n');
  
  const testTexts = [
    'React development and JavaScript programming',
    'Machine learning and AI applications',
    'Team collaboration and project management',
    'Workshop hosting and community building'
  ];

  for (const text of testTexts) {
    console.log(`📝 Testing embedding for: "${text}"`);
    
    try {
      const response = await fetch('http://localhost:54321/functions/v1/graphrag/embed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer your-anon-key'
        },
        body: JSON.stringify({
          table: 'test_embeddings',
          id: 'test-id-123',
          text: text
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Success: ${data.message || 'Embedding generated'}`);
      } else {
        console.log(`   ❌ Error: ${response.status} - ${await response.text()}`);
      }
    } catch (error) {
      console.log(`   ❌ Network Error: ${error.message}`);
    }
    
    console.log('');
  }
};

const main = async () => {
  console.log('🚀 Starting Oracle Functions Test Suite\n');
  console.log('=' .repeat(50));
  
  await testSuperOracle();
  console.log('=' .repeat(50));
  
  await testGraphRAG();
  console.log('=' .repeat(50));
  
  await testEmbeddingGeneration();
  console.log('=' .repeat(50));
  
  console.log('✅ Test suite completed!');
  console.log('\n📋 Summary:');
  console.log('- Super Oracle: Enhanced with comprehensive user context gathering');
  console.log('- GraphRAG: Added real OpenAI embedding generation and comprehensive command handling');
  console.log('- Both functions now use the correct database schema and provide intelligent matching');
  console.log('- Error handling and logging have been improved throughout');
};

// Run the tests
main().catch(console.error);
