import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { masterId, serviceId, clientName, clientPhone, startTime, clientTgId, isTest } = body;

    if (!masterId) return NextResponse.json({ error: "Master ID Error" }, { status: 400 });

    if (isTest) {
        // ... (тестовая логика остается)
        return NextResponse.json({ success: true });
    }

    const { data: busy } = await supabase.from("appointments").select("id")
      .eq("master_id", masterId).eq("start_time", startTime).maybeSingle();

    if (busy) return NextResponse.json({ error: "Busy" }, { status: 409 });

    // --- УМНАЯ CRM: СОЗДАЕМ ИЛИ ИЩЕМ КЛИЕНТА ---
    let clientId = null;
    
    // Ищем клиента по номеру телефона у конкретного мастера
    const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("master_id", masterId)
        .eq("phone", clientPhone)
        .maybeSingle();

    if (existingClient) {
        clientId = existingClient.id;
    } else {
        // Если клиент новый, создаем его профиль
        const { data: newClient, error: clientError } = await supabase
            .from("clients")
            .insert({
                master_id: masterId,
                name: clientName,
                phone: clientPhone,
                telegram_id: clientTgId
            })
            .select("id")
            .single();
            
        if (clientError) console.error("Client Creation Error:", clientError);
        if (newClient) clientId = newClient.id;
    }

    // Сохраняем саму запись с привязкой к client_id
    const { error: insertError } = await supabase.from("appointments")
      .insert({ 
          master_id: masterId, 
          service_id: serviceId, 
          client_name: clientName, 
          client_phone: clientPhone, 
          start_time: startTime, 
          client_tg_id: clientTgId,
          client_id: clientId // ПРИВЯЗКА К CRM
      });

    if (insertError) throw insertError;

    // Отправка уведомления в Телеграм
    const { data: m } = await supabase.from("profiles").select("telegram_chat_id").eq("id", masterId).single();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (m?.telegram_chat_id && botToken) {
      const formattedDate = new Date(startTime).toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
      });

      const msg = `🔔 *НОВАЯ ЗАПИСЬ!*\n\n👤 ${clientName}\n📞 ${clientPhone}\n📅 ${formattedDate}`;
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