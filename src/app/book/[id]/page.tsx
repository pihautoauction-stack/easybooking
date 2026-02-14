const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTime || !profile) return;
        setBookingStatus("submitting");

        const [h, m] = selectedTime.split(":").map(Number);
        const startTime = setMinutes(setHours(selectedDate!, h), m).toISOString();

        // Достаем Telegram ID клиента
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const clientTgId = tgUser?.id?.toString() || null;

        const res = await fetch('/api/notify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ masterId: profile.id, serviceId: selectedService.id, clientName, clientPhone, startTime, clientTgId }),
        });

        if (res.status === 409) setBookingStatus("conflict");
        else if (res.ok) setBookingStatus("success");
        else setBookingStatus("error");
    };

    // ... (экран загрузки)

    if (bookingStatus === "success") {
        return (
            <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] flex flex-col items-center justify-center text-white p-4 sm:p-6 text-center font-sans">
                <div className="bg-emerald-500/10 p-6 sm:p-8 rounded-full mb-6 sm:mb-8 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.2)] backdrop-blur-xl">
                    <CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 text-emerald-400 drop-shadow-md" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 drop-shadow-md">Вы записаны!</h1>
                <p className="text-white/50 mb-8 sm:mb-10 text-sm sm:text-base leading-relaxed max-w-xs mx-auto">
                    Ждем вас <br/><span className="text-white font-medium">{format(selectedDate!, "d MMMM", { locale: ru })} в {selectedTime}</span>
                </p>
                <div className="space-y-3 w-full max-w-xs mx-auto">
                    {/* Кнопка перехода в ЛК клиента */}
                    <button onClick={() => window.location.href = "https://t.me/my_cool_booking_bot/app?startapp=my_bookings"} className="w-full bg-blue-600/90 border border-blue-400/20 text-white font-bold py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95 text-sm sm:text-base transition-all">Мои записи</button>
                    <button onClick={() => window.location.reload()} className="w-full bg-white/5 text-white/70 font-bold py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-white/10 hover:bg-white/10 active:scale-95 text-sm sm:text-base transition-all">Новая запись</button>
                </div>
            </div>
        );
    }