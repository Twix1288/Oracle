# 🚀 Super Oracle Migration Guide

## Overview
The Oracle system has been **consolidated** into a single, powerful **Super Oracle** function that handles all AI needs with deep personalization and RAG capabilities.

## 🎯 What Changed

### **BEFORE (Old System):**
- `super-oracle` - Basic AI assistant
- `unified-oracle` - Team management + basic RAG
- `rag-query` - Simple search only
- `journey-assistant` - Journey tracking only

### **AFTER (New System):**
- **`super-oracle`** - **EVERYTHING** in one place! 🎉

## 🔄 How to Migrate

### **1. Journey Analysis (was `journey-assistant`)**
```typescript
// OLD: POST /functions/v1/journey-assistant
// NEW: POST /functions/v1/super-oracle

{
  "type": "journey",
  "query": "Our team has built an MVP and we're getting user feedback",
  "role": "builder",
  "teamId": "your-team-id",
  "userId": "your-user-id"
}
```

### **2. Team Management (was `unified-oracle`)**
```typescript
// OLD: POST /functions/v1/unified-oracle
// NEW: POST /functions/v1/super-oracle

{
  "type": "team",
  "query": "Create an update about our progress",
  "role": "builder",
  "teamId": "your-team-id",
  "userId": "your-user-id"
}
```

### **3. Stage Analysis (was `unified-oracle`)**
```typescript
// OLD: POST /functions/v1/unified-oracle
// NEW: POST /functions/v1/super-oracle

{
  "type": "stage",
  "query": "What stage is our team in?",
  "role": "builder",
  "teamId": "your-team-id",
  "userId": "your-user-id"
}
```

### **4. Intent Parsing (was `unified-oracle`)**
```typescript
// OLD: POST /functions/v1/unified-oracle
// NEW: POST /functions/v1/super-oracle

{
  "type": "intent",
  "query": "Send a message to the team about our progress",
  "role": "builder",
  "teamId": "your-team-id",
  "userId": "your-user-id"
}
```

### **5. RAG Search (was `rag-query`)**
```typescript
// OLD: POST /functions/v1/rag-query
// NEW: POST /functions/v1/super-oracle

{
  "type": "rag_search",
  "query": "Find information about user testing",
  "role": "builder",
  "teamId": "your-team-id",
  "userId": "your-user-id"
}
```

## 🌟 New Features You Get

### **✅ Deep Personalization**
- Every response is tailored to your onboarding data
- User skills, experience, goals, and team context
- Personalized AI model selection

### **✅ Enhanced RAG**
- Multi-model AI (OpenAI, Gemini, Claude)
- Knowledge graphs and vector search
- External resource integration (YouTube, LinkedIn, GitHub)

### **✅ Unified Experience**
- Single endpoint for all Oracle needs
- Consistent response format
- Better performance and reliability

## 📝 Response Format

All responses now include:
```typescript
{
  "answer": "The main response",
  "model_used": "openai|gemini|claude",
  "confidence": 0.95,
  "search_strategy": "journey_analysis|team_management|enhanced_rag_search|...",
  // Plus specific fields based on type:
  "detected_stage": "development", // for journey
  "stage_analysis": {...}, // for stage
  "intent_parsed": {...}, // for intent
  "documents": [...], // for rag_search
  // ... and more!
}
```

## 🚨 Important Notes

1. **Old functions are deprecated** - Use Super Oracle for everything
2. **All requests need `userId`** for personalization
3. **Team context is required** for team-related operations
4. **Response format is unified** across all types

## 🔧 Testing

Test the new system with:
```bash
# Test journey analysis
curl -X POST https://your-project.supabase.co/functions/v1/super-oracle \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "journey",
    "query": "We finished our prototype",
    "role": "builder",
    "teamId": "test-team-id",
    "userId": "test-user-id"
  }'
```

## 🎉 Benefits

- **🎯 Better Personalization** - Every response tailored to you
- **🚀 Improved Performance** - Single optimized system
- **🔧 Easier Maintenance** - One codebase to rule them all
- **📊 Unified Analytics** - Better insights across all Oracle usage
- **🔄 Consistent Experience** - Same interface for everything

## ❓ Need Help?

If you encounter issues:
1. Check the response format matches the new interface
2. Ensure all required fields are provided
3. Verify your Supabase function is updated
4. Check the logs for detailed error information

---

**Welcome to the future of Oracle! 🚀✨**
