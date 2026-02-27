export default function AppointmentsTab({
    user,
    role,
    appointments,
    services,
    employees,
    journalView,
    setJournalView,
    selectedApp,
    setSelectedApp,
    activeDailyApps,
    archivedApps,
    format,
    ru,
    handleCompleteRecord,
    handleDeleteRecord,
    usedMaterials,
    setUsedMaterials,
    inventory,
    showManualModal, setShowManualModal,
    setViewDate, viewDate, addDays,
    CalendarIcon, Archive, ChevronLeft, ChevronRight, Plus, Briefcase,
    getServiceColor,
    modulesConfig
}: any) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-stone-200/60 p-1 rounded-xl w-max shadow-inner">
                        <button onClick={() => setJournalView('active')} className={`px-5 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${journalView === 'active' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>На день</button>
                        <button onClick={() => setJournalView('archive')} className={`px-5 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${journalView === 'archive' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}><Archive className="w-4 h-4" /> Архив</button>
                    </div>
                    {journalView === 'active' && (
                        <div className="flex items-center bg-white border border-stone-200 rounded-xl p-1 shadow-sm gap-1">
                            <button onClick={() => setViewDate(addDays(viewDate, -1))} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-all"><ChevronLeft className="w-4 h-4" /></button>
                            <span className="text-xs font-black px-3 text-stone-700 uppercase tracking-widest min-w-[110px] text-center">{format(viewDate, "d MMMM", { locale: ru })}</span>
                            <button onClick={() => setViewDate(addDays(viewDate, 1))} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-all"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    )}
                </div>
                <button onClick={() => setShowManualModal(true)} className="bg-stone-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-stone-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-black">
                    <Plus className="w-4 h-4" /> Добавить задачу
                </button>
            </div>

            {journalView === 'archive' && (
                <>
                    {archivedApps.length === 0 ? (
                        <div className="text-center py-20 bg-white border border-stone-200 rounded-[32px] shadow-sm"><div className="w-16 h-16 bg-stone-50 border border-stone-100 rounded-full flex items-center justify-center mx-auto mb-4"><Archive className="w-7 h-7 text-stone-300" /></div><p className="text-stone-400 text-sm font-bold">Архив пуст</p></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {archivedApps.map((app: any) => (
                                <div key={app.id} onClick={() => setSelectedApp(app)} className="rounded-[24px] p-5 relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all bg-white border border-l-4 border-l-emerald-300 border-y-stone-100 border-r-stone-100 opacity-80 shadow-sm hover:border-emerald-400">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="font-black text-2xl tracking-tight text-stone-400">{format(new Date(app.start_time), "HH:mm")}</div>
                                        <div className="px-2 py-1 bg-stone-100 rounded-lg text-[10px] text-stone-500 font-black uppercase tracking-widest">{format(new Date(app.start_time), "d MMM", { locale: ru })}</div>
                                    </div>
                                    <h3 className="text-stone-800 text-base font-black tracking-tight">{app.client_name}</h3>
                                    <div className="flex justify-between items-center text-sm text-stone-500 pt-3 mt-2 border-t border-stone-50">
                                        <span className="truncate text-xs font-bold">{app.service?.name || "Без услуги"}</span>
                                        <span className="text-emerald-600 font-black text-xs">{(app.materials_cost && modulesConfig?.inventory !== false) ? `Мат: ${app.materials_cost}₽` : ''}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {journalView === 'active' && (
                <>
                    {activeDailyApps.length === 0 ? (
                        <div className="text-center py-20 bg-white border border-stone-200 rounded-[32px] shadow-sm"><div className="w-16 h-16 bg-stone-50 border border-stone-100 rounded-full flex items-center justify-center mx-auto mb-4"><CalendarIcon className="w-7 h-7 text-stone-300" /></div><p className="text-stone-400 text-base font-black mb-2">На этот день записей нет</p><p className="text-stone-400 text-sm font-medium">Отдохните или добавьте новую задачу вручную.</p></div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeDailyApps.map((app: any) => {
                                const colorTheme = getServiceColor(app.service_id || app.employee_id || app.id);
                                const endTime = new Date(new Date(app.start_time).getTime() + (app.service?.duration || 60) * 60000);
                                return (
                                    <div key={app.id} onClick={() => setSelectedApp(app)} className={`bg-white rounded-[24px] p-5 border-y border-r border-stone-200 border-l-8 ${colorTheme.border} shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between min-h-[160px]`}>
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-2xl font-black text-stone-800 leading-none">{format(new Date(app.start_time), "HH:mm")} <span className="text-xs text-stone-400 font-bold ml-1">- {format(endTime, "HH:mm")}</span></p>
                                                {app.employee?.name && <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md truncate max-w-[100px] ${colorTheme.badge}`}>{app.employee.name}</span>}
                                            </div>
                                            <h3 className="font-black text-stone-900 text-lg mb-1 leading-tight">{app.client_name}</h3>
                                            {app.client_phone && <p className="text-xs font-bold text-stone-500">{app.client_phone}</p>}
                                        </div>
                                        <div className="flex items-center gap-2 pt-3 mt-2 border-t border-stone-100">
                                            <Briefcase className="w-4 h-4 text-stone-400" /><span className="text-xs font-bold text-stone-600 truncate">{app.service?.name || "Задача"}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
