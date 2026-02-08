/**
 * Backfill embeddings for entries that do not have them yet.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const openRouterKey = process.env.OPENROUTER_API_KEY;

if (!supabaseUrl || !supabaseKey || !openRouterKey) {
    throw new Error('Missing required env: SUPABASE_PROJECT_URL, SUPABASE_SECRET_KEY, OPENROUTER_API_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const openRouter = new OpenAI({
    apiKey: openRouterKey,
    baseURL: 'https://openrouter.ai/api/v1',
});

async function generateEmbedding(text: string): Promise<number[]> {
    const response = await openRouter.embeddings.create({
        model: 'openai/text-embedding-3-small',
        input: text,
    });

    return response.data[0].embedding;
}

function buildEmbeddingText(entry: {
    title: string;
    context: string;
    body: string;
    tags: string[];
}): string {
    return `${entry.title}\n\nContext: ${entry.context}\n\n${entry.body}\n\nTags: ${entry.tags.join(', ')}`;
}

async function backfill() {
    const { data: entries, error } = await supabase
        .from('entries')
        .select('id, title, context, body, tags')
        .is('embedding', null);

    if (error) {
        throw error;
    }

    const records = entries || [];
    console.log(`Found ${records.length} entries without embeddings`);

    for (const entry of records) {
        const text = buildEmbeddingText(entry);

        try {
            const embedding = await generateEmbedding(text);

            const { error: updateError } = await supabase
                .from('entries')
                .update({ embedding })
                .eq('id', entry.id);

            if (updateError) {
                console.error(`Failed updating entry ${entry.id}:`, updateError.message);
            } else {
                console.log(`Updated entry ${entry.id}`);
            }
        } catch (entryError) {
            console.error(`Failed generating embedding for entry ${entry.id}:`, entryError);
        }
    }

    console.log('Backfill complete');
}

backfill().catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
});
