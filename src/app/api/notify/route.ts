import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  console.log("=== НАЧАЛО ТЕСТА УВЕДОМЛЕНИЯ ===");
  
  try {
    const body = await request.json();
    const { masterId, serviceId, clientName, clientPhone, startTime } = body;

    console.log("1. Данные из формы:", { masterId, clientName, startTime });

    // Записываем в базу
    const { data: booking, error: bookingError } = await supabase
      .from("appointments")
      .insert({
        master_id: masterId,
        service_id: serviceId,
        client_name: clientName,
        client_phone: clientPhone,
        start_time: startTime,
        status: 'confirmed' // Наш новый статус
      })
      .select()
      .single();

    if (bookingError) {
        console.error("Ошибка Supabase:", bookingError);
        throw bookingError;
    }

    // Ищем профиль мастера
    const { data: masterProfile } = await supabase
      .from("profiles")
      .select("telegram_chat_id, business_name")
      .eq("id", masterId)
      .single();

    console.log("2. Профиль из базы:", masterProfile);

    // Ссылка для отмены (как мы и планировали)
    const cancelLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://' + request.headers.get('host')}/cancel/${booking.id}`;

    // ПРОВЕРКА ДАННЫХ ДЛЯ ТГ
    const chatId = masterProfile?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    console.log("3. Проверка ключей:", { 
        hasToken: !!botToken, 
        targetChatId: chatId 
    });

    if (chatId && botToken) {
      const message = 
        `🔔 *НОВАЯ ЗАПИСЬ!*\n\n` +
        `👤 Клиент: ${clientName}\n` +
        `📞 Тел: ${clientPhone}\n` +
        `📅 Время: ${new Date(startTime).toLocaleString('ru-RU')}\n\n` +
        `❌ [ОТМЕНИТЬ ЗАПИСЬ](${cancelLink})`;

      console.log("4. Отправка в Telegram...");
      
      const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      });

      const tgResult = await tgResponse.json();
      console.log("5. Ответ от Telegram:", tgResult);

      if (!tgResult.ok) {
          console.error("Ошибка Телеграма:", tgResult.description);
      }
    } else {
        console.error("КРИТИЧЕСКАЯ ОШИБКА: Нет Chat ID или Bot Token!");
    }

    return NextResponse.json({ success: true, booking });

  } catch (error: any) {
    console.error("ОБЩАЯ ОШИБКА API:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}