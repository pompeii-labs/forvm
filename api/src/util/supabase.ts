import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_PROJECT_URL!, process.env.SUPABASE_SECRET_KEY!);

export default supabase;
