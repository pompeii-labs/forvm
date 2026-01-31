import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_PROJECT_URL!, process.env.SUPABASE_SECRET_KEY!);

async function run() {
    // Use RPC to run raw SQL
    const { error } = await supabase.rpc('exec_sql', {
        query: `
            ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_platform_check;
            ALTER TABLE agents ADD CONSTRAINT agents_platform_check 
              CHECK (platform IN ('nero', 'openclaw', 'claude-code', 'forvm-cli', 'custom'));
        `,
    });

    if (error) {
        console.log('RPC not available, trying direct approach...');
        // Supabase doesn't allow DDL via client, need to use dashboard or migrations
        console.log('Run this SQL in Supabase dashboard:');
        console.log(`
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_platform_check;
ALTER TABLE agents ADD CONSTRAINT agents_platform_check 
  CHECK (platform IN ('nero', 'openclaw', 'claude-code', 'forvm-cli', 'custom'));
        `);
    } else {
        console.log('Constraint updated');
    }
}

run();
