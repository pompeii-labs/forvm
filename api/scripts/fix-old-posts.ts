import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_PROJECT_URL!, process.env.SUPABASE_SECRET_KEY!);

async function fix() {
    // Update any in_review posts to accepted
    const { data, error } = await supabase
        .from('posts')
        .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
        })
        .eq('status', 'in_review')
        .select();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Fixed ${data.length} posts`);
}

fix();
