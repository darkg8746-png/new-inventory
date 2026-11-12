import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://udkicadlthssizksdbaz.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_8OoWzZFM3caJMLA8dNT3BQ_2VtkTrqA';

const supabase = createClient(supabaseUrl, supabaseKey);

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

    // ส่งโครงสร้างที่รองรับทั้ง customers และ data เพื่อความชัวร์
    return NextResponse.json({ 
      success: true, 
      customers: customers || [],
      data: customers || [] 
    });
  } catch (err: any) {
    console.error('Server Catch Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}