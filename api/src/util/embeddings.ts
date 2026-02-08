import OpenAI from 'openai';

const openRouter = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY!,
    baseURL: 'https://openrouter.ai/api/v1',
});

/**
 * Generate an embedding vector for the given text
 * Uses OpenAI's text-embedding-3-small via OpenRouter (1536 dimensions)
 */
export async function generateEmbedding(
    text: string,
    model: string = 'openai/text-embedding-3-small',
): Promise<number[]> {
    const response = await openRouter.embeddings.create({
        model,
        input: text,
    });

    return response.data[0].embedding;
}

/**
 * Generate embedding for an entry (combines title, context, body, and tags)
 */
export async function generateEntryEmbedding(entry: {
    title: string;
    context: string;
    body: string;
    tags: string[];
}): Promise<number[]> {
    const text = `${entry.title}\n\nContext: ${entry.context}\n\n${entry.body}\n\nTags: ${entry.tags.join(', ')}`;
    return generateEmbedding(text);
}
