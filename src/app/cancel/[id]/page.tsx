"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { XCircle, CheckCircle2 } from "lucide-react";

export default function CancelPage() {
    const { id } = useParams();
    const [status, setStatus] = useState<"loading" | "confirm" | "done">("loading");

    useEffect(() => { setStatus("confirm"); }, []);

    const handleCancel = async () => {
        await supabase.from("appointments").delete().eq("id", id);
        setStatus("done");
    };

    if (status === "loading") return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 text-center font-sans">
            <div className="max-w-md w-full bg-slate-800 p-10 rounded-[40px] border border-slate-700 shadow-2xl">
                {status === "confirm" ? (
                    <>
                        <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
                        <h1 className="text-3xl font-bold mb-4">Отменить запись?</h1>
                        <p className="text-slate-400 mb-8 leading-relaxed">Если вы отмените запись, время станет доступным для других клиентов.</p>
                        <button onClick={handleCancel} className="w-full bg-red-600 py-5 rounded-2xl font-bold text-lg hover:bg-red-500 transition-all shadow-lg shadow-red-900/20">Подтвердить отмену</button>
                    </>
                ) : (
                    <>
                        <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
                        <h1 className="text-3xl font-bold mb-2">Запись удалена</h1>
                        <p className="text-slate-400">Спасибо, что предупредили! Ждем вас в другой раз.</p>
                    </>
                )}
            </div>
        </div>
    );
}