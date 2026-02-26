export default function ClientsTab({
    activeClientTab,
    setActiveClientTab,
    filteredClients,
    clientSearchQuery,
    setClientSearchQuery,
    Search,
    UserCircle,
    setSelectedClient,
    selectedClient,
    Ban,
    Trash2,
    clientNote,
    setClientNote,
    saveClientNote,
    handleToggleBlacklist,
    savingNote,
    getCleanPhone,
    Phone,
    MessageCircle,
    user,
    Edit3,
    handleUpdateTags,
    clientFilterMode,
    setClientFilterMode,
    appointments
}: any) {
    const isSleeping = (clientId: string) => {
        const clientApps = appointments.filter((a: any) => a.client_id === clientId && a.status === 'completed');
        if (clientApps.length === 0) return false;

        const lastApp = clientApps.reduce((latest: any, current: any) => {
            return new Date(current.start_time) > new Date(latest.start_time) ? current : latest;
        }, clientApps[0]);

        const daysSinceLastVisit = (new Date().getTime() - new Date(lastApp.start_time).getTime()) / (1000 * 3600 * 24);
        return daysSinceLastVisit > 60;
    };

    const finalClients = clientFilterMode === 'sleeping' ? filteredClients.filter((c: any) => isSleeping(c.id)) : filteredClients;

    const generateWhatsAppLink = (client: any) => {
        const text = `Здравствуйте, ${client.name}! Давно вас не видели в студии. 😔\n\nДарим вам персональную скидку 10% на следующий визит! Запишитесь прямо сейчас: ${window.location.origin}/book/${user?.id || ''}`;
        return `https://wa.me/${getCleanPhone(client.phone)}?text=${encodeURIComponent(text)}`;
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-5">
            <div className="flex flex-col md:flex-row gap-3 items-center w-full max-w-xl mx-auto md:max-w-none">
                <div className="relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input value={clientSearchQuery} onChange={e => setClientSearchQuery(e.target.value)} placeholder="Поиск по имени или телефону..." className="w-full bg-white border border-stone-200 shadow-sm rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-800 outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all placeholder-stone-400" />
                </div>
                <div className="flex bg-stone-100 p-1 rounded-2xl shrink-0">
                    <button onClick={() => setClientFilterMode('all')} className={`px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${clientFilterMode === 'all' ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}>Все клиенты</button>
                    <button onClick={() => setClientFilterMode('sleeping')} className={`px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${clientFilterMode === 'sleeping' ? "bg-white text-rose-500 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}>
                        Спящие <span className="bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-md text-[9px]">&gt;60дн</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {finalClients.length === 0 ? <p className="text-stone-400 text-center py-10 font-bold text-sm col-span-full">Клиентов не найдено</p> : finalClients.map((client: any) => (
                    <div
                        key={client.id}
                        onClick={() => { setSelectedClient(client); setClientNote(client.notes || ""); }}
                        className={`p-5 rounded-[28px] border transition-all cursor-pointer hover:shadow-md ${client.is_blacklisted ? 'border-rose-100 bg-rose-50/50' : 'bg-white border-stone-200 shadow-sm hover:border-rose-200'}`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className={`text-base font-black tracking-tight flex items-center gap-2 ${client.is_blacklisted ? 'text-stone-400' : 'text-stone-800'}`}>{client.name}{client.is_blacklisted && <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] rounded-md font-black uppercase tracking-widest">В ЧС</span>}</h3>
                                <p className="text-stone-500 font-bold text-sm mt-0.5">{client.phone}</p>
                            </div>
                            <button onClick={(e) => handleToggleBlacklist(client.id, client.is_blacklisted, e)} className={`p-2.5 rounded-xl active:scale-[0.92] transition-all shadow-sm ${client.is_blacklisted ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100' : 'text-stone-400 bg-stone-50 hover:bg-rose-50 hover:text-rose-500 border border-stone-100'}`}><Ban className="w-4 h-4" /></button>
                        </div>

                        {client.tags && client.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {client.tags.map((tag: string, idx: number) => (
                                    <span key={idx} className="bg-stone-100 text-stone-600 text-[10px] uppercase tracking-widest font-black px-2 py-1 rounded-md">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {client.notes && (
                            <div className="mb-4 bg-orange-50/50 border border-orange-100 p-2.5 rounded-xl text-xs font-medium text-orange-800 line-clamp-2 leading-relaxed">
                                <Edit3 className="w-3 h-3 inline mr-1 mb-0.5 opacity-60" />{client.notes}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-stone-100 mb-3">
                            <div className="bg-stone-50 border border-stone-100 p-3 rounded-2xl"><p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-0.5">Заказы</p><p className="text-lg font-black tracking-tight text-stone-800">{client.visits_count}</p></div>
                            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl"><p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-0.5">Выручка</p><p className="text-lg font-black tracking-tight text-emerald-600">{client.total_revenue} ₽</p></div>
                        </div>

                        {clientFilterMode === 'sleeping' && (
                            <a
                                href={generateWhatsAppLink(client)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 border border-emerald-600 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-xs uppercase tracking-widest"
                            >
                                <MessageCircle className="w-4 h-4" /> Вернуть скидкой
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
