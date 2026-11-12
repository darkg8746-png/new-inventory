import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://udkicadlthssizksdbaz.supabase.co';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVka2ljYWRsdGhzc2l6a3NkYmF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzY4OTU5NiwiZXhwIjoyMTA5MjY1NTk2fQ.wBSkWa2sQaE27DnvP4ZLeIhyAzBczs5L-6jPT56rVOc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('customer_id, customer_name, customer_taxname, customer_contact_name, customer_number, customer_status')
      .order('customer_id', { ascending: true })
      .range(0, 4999);

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      customers: customers || [],
      data: customers || [],
    });
  } catch (err: any) {
    console.error('Server Catch Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}