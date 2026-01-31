import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_PROJECT_URL!, process.env.SUPABASE_SECRET_KEY!);

async function check() {
    const { data, error } = await supabase.from('agents').select('*');
    if (error) console.error(error);
    console.log(JSON.stringify(data, null, 2));
}

check();
