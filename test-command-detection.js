// Test command detection logic
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
  
  // Legacy commands for backward compatibility
  if (trimmed.startsWith('/help')) {
    return { type: 'help', query: 'help with Oracle commands and features' };
  }
  
  return null;
}

// Test cases
const testCases = [
  '/message team: Hello everyone!',
  '/message john: How are you doing?',
  '/update Just completed the authentication system',
  '/update Working on the new feature',
  '/help',
  '/ask oracle What should I work on next?',
  '/view connections',
  '/offer help',
  '/join workshop',
  '/suggest collaboration'
];

console.log('🧪 Testing Command Detection Logic...\n');

testCases.forEach((testCase, index) => {
  const result = detectSlashCommand(testCase);
  console.log(`Test ${index + 1}: "${testCase}"`);
  console.log(`Result:`, result);
  console.log('---');
});

// Test specific edge cases
console.log('\n🔍 Testing Edge Cases...\n');

const edgeCases = [
  '/message team:',  // No message content
  '/message : Hello',  // No recipient
  '/update',  // No content
  '/message team: Hello: world',  // Multiple colons
  '/update   ',  // Whitespace only
  'message team: Hello',  // Missing slash
  '/MESSAGE TEAM: HELLO',  // Different case
];

edgeCases.forEach((testCase, index) => {
  const result = detectSlashCommand(testCase);
  console.log(`Edge Case ${index + 1}: "${testCase}"`);
  console.log(`Result:`, result);
  console.log('---');
});
