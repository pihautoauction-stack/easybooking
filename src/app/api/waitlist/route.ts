import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { masterId, date, clientName, clientPhone, clientTgId } = body;

    // 1. Сохраняем в таблицу waitlist
    const { error } = await supabase.from("waitlist").insert({
        master_id: masterId,
        desired_date: date,
        client_name: clientName,
        client_phone: clientPhone,
        telegram_id: clientTgId
    });

    if (error) throw error;

    // 2. Отправляем уведомление мастеру
    const { data: m } = await supabase.from("profiles").select("telegram_chat_id").eq("id", masterId).single();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (m?.telegram_chat_id && botToken) {
      const formattedDate = new Date(date).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: 'long' });
      
      const msg = `🕰 *ЛИСТ ОЖИДАНИЯ!*\n\nНовая заявка на ${formattedDate}\n\n👤 ${clientName}\n📞 ${clientPhone}\n_Напишите клиенту, если у вас появится окно._`;

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