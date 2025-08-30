import { createClient } from '@supabase/supabase-js';

interface Document {
  id: string;
  content: string;
  metadata: any;
  source_type: string;
  role_visibility: string[];
  team_visibility: string[];
  embedding?: number[];
}

interface EmbeddingResponse {
  data: {
    embedding: number[];
  }[];
}

interface RAGRequest {
  query: string;
  role: string;
  teamId?: string;
  limit?: number;
  threshold?: number;
}

interface RAGResult {
  documents: Document[];
  relevanceScores: number[];
  combinedContext: string;
}

export async function processDocument(
  supabase: ReturnType<typeof createClient>,
  openaiKey: string,
  document: Omit<Document, 'id' | 'embedding'>
): Promise<Document> {
  try {
    // Generate embedding for the document
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: document.content
      })
    });

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate embedding');
    }

    const embeddingData: EmbeddingResponse = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    // Insert document with embedding
    const { data, error } = await supabase
      .from('documents')
      .insert({
        ...document,
        embedding
      })
      .select()
      .single();

    if (error) throw error;
    return data;

  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
}

export async function searchSimilarDocuments(
  supabase: ReturnType<typeof createClient>,
  openaiKey: string,
  request: RAGRequest
): Promise<RAGResult> {
  const { query, role, teamId, limit = 5, threshold = 0.7 } = request;

  try {
    // Generate query embedding
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: query
      })
    });

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate query embedding');
    }

    const embeddingData: EmbeddingResponse = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Search for similar documents
    let documentsQuery = supabase
      .rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit
      });

    // Apply role and team visibility filters
    documentsQuery = documentsQuery
      .contains('role_visibility', [role]);

    if (teamId) {
      documentsQuery = documentsQuery
        .or(`team_visibility.is.null,team_visibility.cs.{${teamId}}`);
    }

    const { data: documents, error } = await documentsQuery;

    if (error) throw error;

    // Calculate relevance scores
    const relevanceScores = documents.map((doc: any) => doc.similarity);

    // Generate combined context
    const combinedContext = documents
      .map((doc: any, idx: number) => {
        const relevancePercent = Math.round(relevanceScores[idx] * 100);
        return `[${relevancePercent}% relevant] ${doc.content}`;
      })
      .join('\n\n');

    return {
      documents,
      relevanceScores,
      combinedContext
    };

  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
}

export async function updateDocumentVisibility(
  supabase: ReturnType<typeof createClient>,
  documentId: string,
  roles?: string[],
  teams?: string[]
): Promise<void> {
  try {
    const updates: any = {};
    if (roles) updates.role_visibility = roles;
    if (teams) updates.team_visibility = teams;

    const { error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', documentId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating document visibility:', error);
    throw error;
  }
}

export async function deleteDocument(
  supabase: ReturnType<typeof createClient>,
  documentId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

// Helper function to chunk text for embedding
export function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  const sentences = text.split(/[.!?]+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    if (currentChunk.length + trimmedSentence.length + 1 <= maxChunkSize) {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    } else {
      if (currentChunk) chunks.push(currentChunk + '.');
      currentChunk = trimmedSentence;
    }
  }

  if (currentChunk) chunks.push(currentChunk + '.');
  return chunks;
}

// Helper function to process and embed multiple documents
export async function batchProcessDocuments(
  supabase: ReturnType<typeof createClient>,
  openaiKey: string,
  documents: Omit<Document, 'id' | 'embedding'>[],
  chunkSize: number = 1000
): Promise<Document[]> {
  const processedDocs: Document[] = [];

  for (const doc of documents) {
    // Split document into chunks if needed
    const chunks = chunkText(doc.content, chunkSize);

    // Process each chunk as a separate document
    for (const [idx, chunk] of chunks.entries()) {
      const chunkDoc = {
        ...doc,
        content: chunk,
        metadata: {
          ...doc.metadata,
          chunk_index: idx,
          total_chunks: chunks.length
        }
      };

      const processedChunk = await processDocument(supabase, openaiKey, chunkDoc);
      processedDocs.push(processedChunk);
    }
  }

  return processedDocs;
}
