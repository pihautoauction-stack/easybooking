import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { masterId, serviceId, clientName, clientPhone, startTime } = await request.json();

    if (!masterId || masterId === "undefined") {
        return NextResponse.json({ error: "Master ID missing" }, { status: 400 });
    }

    // 1. Проверка на занятое время у ОДНОГО мастера
    const { data: existing } = await supabase
      .from("appointments")
      .select("id")
      .eq("master_id", masterId)
      .eq("start_time", startTime)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Это время уже занято" }, { status: 409 });
    }

    // 2. Запись в базу (RLS должен быть выключен или настроен)
    const { data: booking, error: bError } = await supabase
      .from("appointments")
      .insert({ master_id: masterId, service_id: serviceId, client_name: clientName, client_phone: clientPhone, start_time: startTime })
      .select().single();

    if (bError) throw bError;

    // 3. Telegram уведомление
    const { data: m } = await supabase.from("profiles").select("telegram_chat_id, business_name").eq("id", masterId).single();
    const chatId = m?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (chatId && botToken) {
      const msg = `🔔 *НОВАЯ ЗАПИСЬ!*\n\n👤 Клиент: ${clientName}\n📞 Тел: ${clientPhone}\n📅 Время: ${new Date(startTime).toLocaleString('ru-RU')}`;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Critical API Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}