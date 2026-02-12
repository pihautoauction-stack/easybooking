"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { XCircle, CheckCircle2 } from "lucide-react";

export default function CancelPage() {
    const { id } = useParams();
    const [status, setStatus] = useState<"loading" | "confirm" | "done">("loading");

    const handleCancel = async () => {
        await supabase.from("appointments").delete().eq("id", id);
        setStatus("done");
    };

    if (status === "loading") return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-slate-800 p-8 rounded-3xl border border-slate-700">
                {status === "confirm" ? (
                    <>
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold mb-4">Отменить запись?</h1>
                        <button onClick={handleCancel} className="w-full bg-red-600 py-4 rounded-xl font-bold">Да, отменить всё</button>
                    </>
                ) : (
                    <>
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold mb-2">Запись удалена</h1>
                        <p className="text-slate-400">Мастер свободен. Спасибо!</p>
                    </>
                )}
            </div>
        </div>
    );
}