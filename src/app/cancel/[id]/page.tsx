"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { XCircle, CheckCircle2, AlertCircle } from "lucide-react";

export default function CancelBooking() {
    const { id } = useParams();
    const [status, setStatus] = useState<"loading" | "confirm" | "success" | "error">("loading");
    const [appointment, setAppointment] = useState<any>(null);

    useEffect(() => {
        const fetchBooking = async () => {
            const { data } = await supabase
                .from("appointments")
                .select("*, services(name), profiles(business_name, telegram_chat_id)")
                .eq("id", id)
                .single();
            
            if (data) {
                setAppointment(data);
                setStatus(data.status === 'cancelled' ? 'success' : 'confirm');
            } else {
                setStatus("error");
            }
        };
        fetchBooking();
    }, [id]);

    const handleCancel = async () => {
        const { error } = await supabase
            .from("appointments")
            .update({ status: 'cancelled' })
            .eq("id", id);

        if (!error) {
            // Уведомляем мастера через API
            await fetch("/api/cancel-notify", {
                method: "POST",
                body: JSON.stringify({
                    chatId: appointment.profiles.telegram_chat_id,
                    clientName: appointment.client_name,
                    time: appointment.start_time,
                    businessName: appointment.profiles.business_name
                }),
            });
            setStatus("success");
        }
    };

    if (status === "loading") return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-slate-800 p-8 rounded-3xl border border-slate-700 text-center">
                {status === "confirm" && (
                    <>
                        <AlertCircle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold mb-2">Отменить запись?</h1>
                        <p className="text-slate-400 mb-6">
                            Вы записаны в <strong>{appointment?.profiles?.business_name}</strong><br/>
                            на {new Date(appointment?.start_time).toLocaleString('ru-RU')}
                        </p>
                        <button onClick={handleCancel} className="w-full bg-red-600 py-4 rounded-xl font-bold hover:bg-red-500 transition-all">
                            Да, отменить запись
                        </button>
                    </>
                )}
                {status === "success" && (
                    <>
                        <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold mb-2">Запись отменена</h1>
                        <p className="text-slate-400">Мастер получил уведомление. Ждем вас в другой раз!</p>
                    </>
                )}
            </div>
        </div>
    );
}