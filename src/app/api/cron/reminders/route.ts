import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) throw new Error("No bot token");

        const tomorrowStart = new Date();
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        tomorrowStart.setHours(0, 0, 0, 0);

        const tomorrowEnd = new Date(tomorrowStart);
        tomorrowEnd.setHours(23, 59, 59, 999);

        const { data: appointments } = await supabase.from("appointments")
            .select("start_time, client_tg_id, service:services(name), master:profiles(business_name)")
            .gte("start_time", tomorrowStart.toISOString())
            .lte("start_time", tomorrowEnd.toISOString())
            .eq("status", "active")
            .not("client_tg_id", "is", null);

        if (!appointments || appointments.length === 0) {
            return NextResponse.json({ success: true, sent: 0 });
        }

        let sentCount = 0;

        for (const app of appointments as any[]) {
            const time = new Date(app.start_time).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });

            const serviceName = Array.isArray(app.service) ? app.service[0]?.name : app.service?.name;
            const masterName = Array.isArray(app.master) ? app.master[0]?.business_name : app.master?.business_name;

            const msg = `🔔 *Напоминание о записи!*\n\nЖдем вас завтра в *${time}*.\n📌 Услуга: ${serviceName || 'Услуга'}\n🏢 Место: ${masterName || 'Компания'}\n\n_Если ваши планы изменились, пожалуйста, отмените запись в Личном кабинете._`;

            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: app.client_tg_id, text: msg, parse_mode: "Markdown" })
            });
            sentCount++;
        }

        return NextResponse.json({ success: true, sent: sentCount });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}