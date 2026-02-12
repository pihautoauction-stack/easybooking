import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { name, phone, service, date, time } = await req.json();
    
    // Эти ключи уже есть в твоем .env.local
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    const text = `🔥 *Новая запись!*\n\n👤 Клиент: ${name}\n📞 Тел: ${phone}\n✂️ Услуга: ${service}\n📅 Дата: ${date}\n⏰ Время: ${time}`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}