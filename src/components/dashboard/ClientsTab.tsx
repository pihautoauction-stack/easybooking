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
    Edit3
}: any) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-5">
            <div className="relative max-w-xl mx-auto md:max-w-none">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input value={clientSearchQuery} onChange={e => setClientSearchQuery(e.target.value)} placeholder="Поиск клиента..." className="w-full bg-white border border-stone-200 shadow-sm rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-800 outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all placeholder-stone-400" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.length === 0 ? <p className="text-stone-400 text-center py-10 font-bold text-sm col-span-full">Нет данных</p> : filteredClients.map((client: any) => (
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

                        {client.notes && (
                            <div className="mb-4 bg-orange-50/50 border border-orange-100 p-2.5 rounded-xl text-xs font-medium text-orange-800 line-clamp-2 leading-relaxed">
                                <Edit3 className="w-3 h-3 inline mr-1 mb-0.5 opacity-60" />{client.notes}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-stone-100">
                            <div className="bg-stone-50 border border-stone-100 p-3 rounded-2xl"><p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-0.5">Заказы</p><p className="text-lg font-black tracking-tight text-stone-800">{client.visits_count}</p></div>
                            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl"><p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-0.5">Выручка</p><p className="text-lg font-black tracking-tight text-emerald-600">{client.total_revenue} ₽</p></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
