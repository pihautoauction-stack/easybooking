import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { masterId, serviceId, employeeId, employeeName, clientName, clientPhone, startTime, clientTgId, isTest } = body;

    if (!masterId) return NextResponse.json({ error: "Master ID Error" }, { status: 400 });

    if (isTest) return NextResponse.json({ success: true });

    // Проверяем занятость (для соло - просто время, для салона - время конкретного мастера)
    let busyQuery = supabase.from("appointments").select("id").eq("master_id", masterId).eq("start_time", startTime);
    if (employeeId) busyQuery = busyQuery.eq("employee_id", employeeId);
    
    const { data: busy } = await busyQuery.maybeSingle();
    if (busy) return NextResponse.json({ error: "Busy" }, { status: 409 });

    // Ищем или создаем клиента
    let clientId = null;
    const { data: existingClient } = await supabase.from("clients").select("id").eq("master_id", masterId).eq("phone", clientPhone).maybeSingle();

    if (existingClient) {
        clientId = existingClient.id;
    } else {
        const { data: newClient } = await supabase.from("clients").insert({ master_id: masterId, name: clientName, phone: clientPhone, telegram_id: clientTgId }).select("id").single();
        if (newClient) clientId = newClient.id;
    }

    // Сохраняем запись с привязкой к мастеру (employee_id)
    const { error: insertError } = await supabase.from("appointments")
      .insert({ master_id: masterId, service_id: serviceId, employee_id: employeeId, client_name: clientName, client_phone: clientPhone, start_time: startTime, client_tg_id: clientTgId, client_id: clientId });

    if (insertError) throw insertError;

    // Уведомление в Telegram
    const { data: m } = await supabase.from("profiles").select("telegram_chat_id").eq("id", masterId).single();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (m?.telegram_chat_id && botToken) {
      const formattedDate = new Date(startTime).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
      
      let msg = `🔔 *НОВАЯ ЗАПИСЬ!*\n\n👤 ${clientName}\n📞 ${clientPhone}\n📅 ${formattedDate}`;
      if (employeeName) msg += `\n💇‍♀️ Мастер: ${employeeName}`; // Добавляем имя мастера в бота!

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