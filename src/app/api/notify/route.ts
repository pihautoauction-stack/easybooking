// src/app/api/notify/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Добавляем поле isTest для проверки связи
    const { masterId, serviceId, clientName, clientPhone, startTime, isTest } = body;

    if (!masterId) return NextResponse.json({ error: "Master ID Error" }, { status: 400 });

    // --- ЛОГИКА ТЕСТА СВЯЗИ ---
    if (isTest) {
      const { data: m } = await supabase.from("profiles").select("telegram_chat_id").eq("id", masterId).single();
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      if (m?.telegram_chat_id && botToken) {
        const msg = `✅ *Связь установлена!*\n\nАнтон, это тестовое сообщение. Теперь я буду присылать сюда уведомления о новых записях твоих клиентов.`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: m.telegram_chat_id, text: msg, parse_mode: "Markdown" })
        });
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: "Chat ID not found" }, { status: 404 });
    }

    // --- ОБЫЧНАЯ ЛОГИКА ЗАПИСИ (оставляем без изменений) ---
    const { data: busy } = await supabase.from("appointments").select("id")
      .eq("master_id", masterId).eq("start_time", startTime).maybeSingle();

    if (busy) return NextResponse.json({ error: "Busy" }, { status: 409 });

    const { error: insertError } = await supabase.from("appointments")
      .insert({ master_id: masterId, service_id: serviceId, client_name: clientName, client_phone: clientPhone, start_time: startTime });

    if (insertError) throw insertError;

    const { data: m } = await supabase.from("profiles").select("telegram_chat_id, business_name").eq("id", masterId).single();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (m?.telegram_chat_id && botToken) {
      const msg = `🔔 *НОВАЯ ЗАПИСЬ!*\n\n👤 ${clientName}\n📞 ${clientPhone}\n📅 ${new Date(startTime).toLocaleString('ru-RU')}`;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: m.telegram_chat_id, text: msg, parse_mode: "Markdown" })
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}