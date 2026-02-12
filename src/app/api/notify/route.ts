import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  console.log("--- СТАРТ ПРОВЕРКИ ЗАПИСИ ---");
  try {
    const body = await request.json();
    const { masterId, serviceId, clientName, clientPhone, startTime } = body;
    console.log("1. Получены данные:", { masterId, clientName, startTime });

    // ПРОВЕРКА 1: Занято ли время
    const { data: existing, error: checkError } = await supabase
      .from("appointments")
      .select("id")
      .eq("master_id", masterId)
      .eq("start_time", startTime)
      .maybeSingle();
    
    if (checkError) console.error("Ошибка при проверке времени:", checkError);
    if (existing) {
      console.log("Результат: Время уже занято");
      return NextResponse.json({ error: "Это время уже занято" }, { status: 409 });
    }

    // ПРОВЕРКА 2: Запись в базу (здесь чаще всего падает RLS 42501)
    const { data: booking, error: bookingError } = await supabase
      .from("appointments")
      .insert({ master_id: masterId, service_id: serviceId, client_name: clientName, client_phone: clientPhone, start_time: startTime })
      .select().single();

    if (bookingError) {
      console.error("КРИТИЧЕСКАЯ ОШИБКА БАЗЫ (RLS?):", bookingError);
      throw bookingError;
    }
    console.log("2. Запись успешно создана в Supabase");

    // ПРОВЕРКА 3: Получение Chat ID мастера
    const { data: master, error: masterError } = await supabase
      .from("profiles")
      .select("telegram_chat_id")
      .eq("id", masterId)
      .single();

    if (masterError) console.error("Ошибка поиска Chat ID:", masterError);
    
    const chatId = master?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    console.log("3. Проверка ТГ-данных:", { hasToken: !!botToken, targetChatId: chatId });

    if (chatId && botToken) {
      const cancelLink = `${new URL(request.url).origin}/cancel/${booking.id}`;
      const msg = `🔔 *НОВАЯ ЗАПИСЬ!*\n\n👤 Клиент: ${clientName}\n📞 Тел: ${clientPhone}\n📅 Время: ${new Date(startTime).toLocaleString('ru-RU')}\n\n❌ [ОТМЕНИТЬ ЗАПИСЬ](${cancelLink})`;

      console.log("4. Отправка запроса в Telegram API...");
      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" }),
      });

      const tgData = await tgRes.json();
      console.log("5. Ответ от Telegram:", tgData);

      if (!tgData.ok) console.error("Телеграм отклонил сообщение:", tgData.description);
    } else {
      console.error("ОШИБКА: Не найден Chat ID или Bot Token в настройках!");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ОБЩИЙ СБОЙ СИСТЕМЫ:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}