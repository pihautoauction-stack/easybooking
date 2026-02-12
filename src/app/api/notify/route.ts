import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { masterId, serviceId, clientName, clientPhone, startTime } = body;

    // 1. Записываем клиента в таблицу appointments
    const { data: booking, error: bookingError } = await supabase
      .from("appointments")
      .insert({
        master_id: masterId,
        service_id: serviceId,
        client_name: clientName,
        client_phone: clientPhone,
        start_time: startTime,
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // 2. Ищем в базе telegram_chat_id именно этого мастера
    const { data: masterProfile } = await supabase
      .from("profiles")
      .select("telegram_chat_id, business_name")
      .eq("id", masterId)
      .single();

    // 3. Определяем, куда слать уведомление
    // Если мастер ввел свой ID — шлем ему. Если нет — берем твой ID из настроек Vercel (запасной).
    const chatId = masterProfile?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (chatId && botToken) {
      const message = 
        `🔔 *Новая запись к мастеру: ${masterProfile?.business_name || "Без названия"}*\n\n` +
        `👤 Клиент: ${clientName}\n` +
        `📞 Тел: ${clientPhone}\n` +
        `📅 Время: ${new Date(startTime).toLocaleString('ru-RU')}`;

      // Отправляем запрос в Telegram
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      });
    }

    return NextResponse.json({ success: true, booking });

  } catch (error: any) {
    console.error("Ошибка API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}