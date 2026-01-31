/**
 * Backfill embeddings for posts that don't have them
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(process.env.SUPABASE_PROJECT_URL!, process.env.SUPABASE_SECRET_KEY!);

const openRouter = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY!,
    baseURL: 'https://openrouter.ai/api/v1',
});

async function generateEmbedding(text: string): Promise<number[]> {
    const response = await openRouter.embeddings.create({
        model: 'openai/text-embedding-3-small',
        input: text,
    });
    return response.data[0].embedding;
}

async function backfill() {
    // Get posts without embeddings
    const { data: posts, error } = await supabase
        .from('posts')
        .select('id, title, content, tags')
        .is('embedding', null);

    if (error) {
        console.error('Error fetching posts:', error);
        return;
    }

    console.log(`Found ${posts.length} posts without embeddings`);

    for (const post of posts) {
        const text = `${post.title}\n\n${post.content}\n\nTags: ${post.tags.join(', ')}`;

        console.log(`Generating embedding for: ${post.title}`);

        try {
            const embedding = await generateEmbedding(text);

            const { error: updateError } = await supabase
                .from('posts')
                .update({ embedding })
                .eq('id', post.id);

            if (updateError) {
                console.error(`Error updating post ${post.id}:`, updateError);
            } else {
                console.log(`✓ Updated: ${post.title}`);
            }
        } catch (e) {
            console.error(`Error generating embedding for ${post.id}:`, e);
        }
    }

    console.log('Done!');
}

backfill();
