import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // ปรับตาม path ของ supabase client ในโปรเจกต์ของคุณ

// GET: ดึงประวัติ Log การย้ายและบริการของเครื่องจักร (ระบุ ?assetId=...)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId');

    let query = supabase
      .from('asset_logs')
      .select(`
        *,
        customer:customers(customer_id, customer_name, customer_taxname)
      `)
      .order('log_date', { ascending: false });

    // ถ้ามีการระบุ assetId ให้กรองเฉพาะเครื่องนั้น
    if (assetId) {
      query = query.eq('asset_id', assetId);
    }

    const { data: logs, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: บันทึกประวัติ Log ใหม่ลงตาราง asset_logs
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assetId, customerId, logType, remark, employeeId } = body;

    if (!assetId || !logType) {
      return NextResponse.json({ success: false, error: 'Missing required fields (assetId, logType)' }, { status: 400 });
    }

    const { data: newLog, error } = await supabase
      .from('asset_logs')
      .insert([
        {
          asset_id: assetId,
          customer_id: customerId || null,
          log_type: logType,
          remark: remark || null,
          employee_id: employeeId || null
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, log: newLog });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}