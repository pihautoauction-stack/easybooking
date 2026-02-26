export default function AnalyticsTab({
    clients,
    activeAppsThisMonth,
    archivedApps,
    totalRevenue,
    totalPayroll,
    totalMaterialsCost,
    employeeStats,
    BarChart3,
    role,
    Calculator,
    netIncome
}: any) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-[32px] border border-stone-200 shadow-sm flex flex-col justify-center">
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-1">Общая выручка</p>
                    <p className="text-3xl font-black tracking-tight text-stone-900">{totalRevenue} <span className="text-xl text-stone-400">₽</span></p>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-stone-200 shadow-sm flex flex-col justify-center">
                    <p className="text-xs text-rose-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> Фонд ЗП и Затраты</p>
                    <p className="text-3xl font-black tracking-tight text-rose-500">{totalPayroll + totalMaterialsCost} <span className="text-xl text-rose-300">₽</span></p>
                    <p className="text-[10px] font-bold text-stone-400 mt-1">ЗП: {totalPayroll}₽ | Мат. (Закупка): {totalMaterialsCost}₽</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-400 to-emerald-500 p-6 rounded-[32px] shadow-lg shadow-emerald-500/20 text-white flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <p className="text-xs text-emerald-100 font-black uppercase tracking-widest mb-1 relative z-10">Чистая прибыль</p>
                    <p className="text-4xl font-black tracking-tight relative z-10">{netIncome} <span className="text-2xl opacity-80">₽</span></p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 md:p-8 rounded-[32px] border border-stone-200 shadow-sm">
                    <h3 className="text-xl font-black tracking-tight text-stone-800 mb-6 flex items-center gap-2">Расчет зарплат</h3>
                    <div className="space-y-3">
                        {Object.keys(employeeStats).length === 0 ? <p className="text-center text-stone-400 text-sm py-4 font-bold">Нет данных для расчета</p> :
                            Object.values(employeeStats).map((stat: any, i: number) => (
                                <div key={i} className="flex justify-between items-center bg-stone-50 border border-stone-100 p-4 rounded-2xl">
                                    <div>
                                        <span className="text-base font-bold text-stone-800 block">{stat.name}</span>
                                        <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Оказано услуг: {stat.visits}</span>
                                    </div>
                                    <span className="text-lg font-black tracking-tight text-stone-900 bg-white px-3 py-1.5 rounded-xl border border-stone-200">{stat.earned} ₽</span>
                                </div>
                            ))
                        }
                    </div>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-[32px] border border-stone-200 shadow-sm">
                    <h3 className="text-xl font-black tracking-tight text-stone-800 mb-6 flex items-center gap-2">Топ-5 клиентов</h3>
                    <div className="space-y-3">
                        {clients.filter((c: any) => c.total_revenue > 0).sort((a: any, b: any) => b.total_revenue - a.total_revenue).slice(0, 5).map((c: any, i: number) => (
                            <div key={c.id} className="flex justify-between items-center bg-stone-50 border border-stone-100 p-4 rounded-2xl hover:border-rose-200 hover:shadow-sm transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-sm ${i === 0 ? 'bg-gradient-to-br from-yellow-300 to-amber-400 text-white' : i === 1 ? 'bg-gradient-to-br from-stone-300 to-stone-400 text-white' : i === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white' : 'bg-white text-stone-400 border border-stone-200'}`}>{i + 1}</div>
                                    <div>
                                        <span className="text-sm font-bold text-stone-800 block">{c.name}</span>
                                        <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Заказов: {c.visits_count}</span>
                                    </div>
                                </div>
                                <span className="text-sm font-black tracking-tight text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-100">{c.total_revenue} ₽</span>
                            </div>
                        ))}
                        {clients.filter((c: any) => c.total_revenue > 0).length === 0 && <p className="text-center text-stone-400 text-sm py-4 font-bold">Пока нет данных для топа</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
