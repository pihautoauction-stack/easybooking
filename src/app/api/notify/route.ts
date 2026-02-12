import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { masterId, serviceId, clientName, clientPhone, startTime } = body;

    // 1. ПРОВЕРКА НА ПЕРЕКРЫТИЕ (Мастер один!)
    const { data: existing } = await supabase
      .from("appointments")
      .select("id")
      .eq("master_id", masterId)
      .eq("start_time", startTime)
      .eq("status", "confirmed") // Считаем только живые записи
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Это время уже занято другим клиентом" }, { status: 409 });
    }

    // 2. ЗАПИСЬ
    const { data: booking, error: bookingError } = await supabase
      .from("appointments")
      .insert({ master_id: masterId, service_id: serviceId, client_name: clientName, client_phone: clientPhone, start_time: startTime })
      .select().single();

    if (bookingError) throw bookingError;

    // 3. УВЕДОМЛЕНИЕ В ТГ
    const { data: master } = await supabase.from("profiles").select("telegram_chat_id").eq("id", masterId).single();
    const chatId = master?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;
    const cancelLink = `${new URL(request.url).origin}/cancel/${booking.id}`;

    if (chatId && process.env.TELEGRAM_BOT_TOKEN) {
      const msg = `🔔 *Новая запись!*\n\n👤 Клиент: ${clientName}\n📅 Время: ${new Date(startTime).toLocaleString('ru-RU')}\n\n❌ [Отменить запись](${cancelLink})`;
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" }),
      });
    }

    return NextResponse.json({ success: true, booking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}