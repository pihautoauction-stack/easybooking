import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { appointmentId, masterChatId, serviceName, startTime, clientName } = body;

    // Удаляем запись
    const { error } = await supabase.from("appointments").delete().eq("id", appointmentId);
    if (error) throw error;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // Отправляем уведомление мастеру
    if (masterChatId && botToken) {
       const formattedDate = new Date(startTime).toLocaleString('ru-RU', {
         timeZone: 'Europe/Moscow', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
       });
       
       const msg = `❌ *ОТМЕНА ЗАПИСИ!*\n\nКлиент отменил свою запись.\n\n👤 ${clientName}\n✂️ ${serviceName}\n📅 ${formattedDate}`;
       
       await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: masterChatId, text: msg, parse_mode: "Markdown" })
       });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}