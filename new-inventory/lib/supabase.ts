import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://udkicadlthssizksdbaz.supabase.co';
// ✅ ใส่ Anon Key จริงเป็นค่า Fallback สำรอง
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_8OoWzZFM3caJMLA8dNT3BQ_2VtkTrqA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);