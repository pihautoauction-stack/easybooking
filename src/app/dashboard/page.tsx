const handleDeleteRecord = async (id: string) => {
        if (confirm("Точно отменить запись клиента?")) {
            try {
                const { error } = await supabase.from("appointments").delete().eq("id", id);
                if (error) throw error; // Если Supabase блокирует (RLS) - бросаем ошибку
                
                await loadData(user.id);
                setSelectedApp(null); 
                if (window.Telegram?.WebApp?.showPopup) {
                    window.Telegram.WebApp.showPopup({ message: "Успешно отменено" });
                }
            } catch (err: any) {
                // ПОКАЗЫВАЕМ ОШИБКУ НА ЭКРАНЕ
                alert("Ошибка удаления (Supabase RLS): " + err.message);
            }
        }
    };