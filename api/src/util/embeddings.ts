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
 * Generate embedding for a post (combines title, content, and tags)
 */
export async function generatePostEmbedding(post: {
    title: string;
    content: string;
    tags: string[];
}): Promise<number[]> {
    const text = `${post.title}\n\n${post.content}\n\nTags: ${post.tags.join(', ')}`;
    return generateEmbedding(text);
}
