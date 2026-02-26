import { createClient } from '@supabase/supabase-js';

// Во время статики (npm run build) переменные могут быть недоступны, 
// подставляем заглушку, чтобы билд не падал с ошибкой "supabaseUrl is required"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
