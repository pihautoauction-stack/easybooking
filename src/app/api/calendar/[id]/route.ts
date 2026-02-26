import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { id } = await params;

    // Ищем профиль по username или id
    let userId = id;
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, business_name, username")
        .or(`username.eq.${id},id.eq.${id}`)
        .single();

    if (!profile) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    userId = profile.id;

    // Получаем все активные записи на 30 дней вперёд
    const now = new Date();
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(now.getDate() + 90);

    const { data: appointments } = await supabase
        .from("appointments")
        .select("id, client_name, start_time, status, service:services(name, duration)")
        .eq("master_id", userId)
        .eq("status", "active")
        .gte("start_time", now.toISOString())
        .lte("start_time", thirtyDaysLater.toISOString())
        .order("start_time", { ascending: true });

    const calName = profile.business_name || profile.username || "Nexio";

    // Генерируем .ics по стандарту RFC 5545
    let ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Nexio//EasyBooking//RU\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:${calName}\r\nX-WR-TIMEZONE:Europe/Moscow\r\n`;

    if (appointments && appointments.length > 0) {
        for (const app of appointments) {
            const start = new Date(app.start_time);
            const duration = (app as any).service?.duration || 60;
            const end = new Date(start.getTime() + duration * 60000);

            const formatDate = (d: Date) =>
                d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

            const uid = `${app.id}@nexio.app`;
            const summary = `${app.client_name} — ${(app as any).service?.name || "Услуга"}`;

            ics += `BEGIN:VEVENT\r\n`;
            ics += `UID:${uid}\r\n`;
            ics += `DTSTART:${formatDate(start)}\r\n`;
            ics += `DTEND:${formatDate(end)}\r\n`;
            ics += `SUMMARY:${summary}\r\n`;
            ics += `DESCRIPTION:Клиент: ${app.client_name}\r\n`;
            ics += `STATUS:CONFIRMED\r\n`;
            ics += `END:VEVENT\r\n`;
        }
    }

    ics += `END:VCALENDAR\r\n`;

    return new NextResponse(ics, {
        status: 200,
        headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": `attachment; filename="${calName}-schedule.ics"`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
    });
}
