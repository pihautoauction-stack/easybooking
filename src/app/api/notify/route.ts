import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { masterId, serviceId, clientName, clientPhone, startTime } = await request.json();

    // 1. Проверка на занятое время
    const { data: existing } = await supabase
      .from("appointments")
      .select("id")
      .eq("master_id", masterId)
      .eq("start_time", startTime)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Это время уже занято" }, { status: 409 });
    }

    // 2. Запись в базу
    const { data: booking, error: bookingError } = await supabase
      .from("appointments")
      .insert({ master_id: masterId, service_id: serviceId, client_name: clientName, client_phone: clientPhone, start_time: startTime })
      .select().single();

    if (bookingError) throw bookingError;

    // 3. Отправка в Telegram
    const { data: master } = await supabase.from("profiles").select("telegram_chat_id").eq("id", masterId).single();
    const chatId = master?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (chatId && botToken) {
      const cancelLink = `${new URL(request.url).origin}/cancel/${booking.id}`;
      const msg = `🔔 *НОВАЯ ЗАПИСЬ!*\n\n👤 Клиент: ${clientName}\n📞 Тел: ${clientPhone}\n📅 Время: ${new Date(startTime).toLocaleString('ru-RU')}\n\n❌ [ОТМЕНИТЬ ЗАПИСЬ](${cancelLink})`;
      
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" }),
      });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}