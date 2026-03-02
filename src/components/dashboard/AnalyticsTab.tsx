import { BarChart3, Calculator } from "lucide-react";
import { useClientsStore } from "@/store/useClientsStore";
import { useAppointmentsStore } from "@/store/useAppointmentsStore";
import { useServicesStore } from "@/store/useServicesStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useMemo } from "react";

export default function AnalyticsTab() {
    const { clients } = useClientsStore();
    const { appointments } = useAppointmentsStore();
    const { services } = useServicesStore();
    const { employees, role } = useProfileStore();

    // Recomputing analytics since they are highly derived and were passed as props before.
    const { activeAppsThisMonth, archivedApps } = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const active = appointments.filter((a: any) => new Date(a.start_time) >= startOfMonth && a.status === 'active');
        const archived = appointments.filter((a: any) => a.status === 'completed' || a.status === 'cancelled');
        return { activeAppsThisMonth: active, archivedApps: archived };
    }, [appointments]);

    const { totalRevenue, totalPayroll, totalMaterialsCost, employeeStats, netIncome } = useMemo(() => {
        let revenue = 0;
        let payroll = 0;
        let materials = 0;
        const eStats: any = {};

        employees.forEach(emp => {
            eStats[emp.id] = { name: emp.name, earned: 0, visits: 0 };
        });

        archivedApps.forEach((app: any) => {
            if (app.status === 'completed') {
                const priceMatch = (app.final_price ?? app.service?.price ?? 0);
                const price = Number(priceMatch) || 0;

                revenue += price;
                if (app.materials_cost) {
                    materials += Number(app.materials_cost) || 0;
                }

                if (app.employee_id && eStats[app.employee_id]) {
                    eStats[app.employee_id].visits += 1;
                    const empObj = employees.find(e => e.id === app.employee_id);
                    if (empObj && empObj.commission_rate) {
                        const earned = (price * Number(empObj.commission_rate)) / 100;
                        eStats[app.employee_id].earned += earned;
                        payroll += earned;
                    }
                }
            }
        });

        return {
            totalRevenue: revenue,
            totalPayroll: payroll,
            totalMaterialsCost: materials,
            employeeStats: eStats,
            netIncome: revenue - payroll - materials
        };
    }, [archivedApps, employees]);


    // ---- ПРЕДИКТИВНАЯ АНАЛИТИКА И СОВЕТЫ ----
    const getPrediction = () => {
        const now = new Date();
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 7);

        // Ищем записи НА СЛЕДУЮЩИЕ 7 ДНЕЙ
        const upcomingApps = appointments.filter((a: any) => {
            const d = new Date(a.start_time);
            return d > now && d < nextWeek && a.status === 'active';
        });

        // Ищем записи ЗА ПРОШЛЫЕ 30 ДНЕЙ для понимания "нормального" темпа
        const pastApps = appointments.filter((a: any) => {
            const d = new Date(a.start_time);
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(now.getDate() - 30);
            return d > thirtyDaysAgo && d < now && a.status === 'completed';
        });

        const hasAnyHistory = pastApps.length > 0 || appointments.length > 0;

        // Среднее количество записей в неделю за прошлый месяц (грубо)
        const avgWeeklyApps = pastApps.length > 0 ? Math.max(Math.round(pastApps.length / 4), 10) : 15;

        // Считаем упущенную выгоду более реалистично
        const emptySlotsEstimate = Math.max(avgWeeklyApps - upcomingApps.length, 0);

        // Средний чек по выполненным записями (или дефолт 1500, если нет истории)
        const avgCheck = pastApps.length > 0 && totalRevenue > 0
            ? Math.round(totalRevenue / pastApps.length)
            : (services && services.length > 0 ? services[0].price : 1500);

        const lostRevenueEstimate = emptySlotsEstimate > 0 ? emptySlotsEstimate * avgCheck : 0;

        // Определяем ситуацию для генерации совета
        let situation = 'normal';
        let adviceText = '';
        let adviceHighlight = '';

        if (!hasAnyHistory && upcomingApps.length === 0) {
            situation = 'newbie';
            adviceText = 'Добавьте базу клиентов или настройте расписание, чтобы мы могли делать прогнозы.';
            adviceHighlight = '"Поделитесь ссылкой на онлайн-запись в соцсетях!"';
        } else if (upcomingApps.length < avgWeeklyApps * 0.5) {
            situation = 'low';
            adviceText = 'Выложите историю в Instagram прямо сейчас:';
            adviceHighlight = '"Освободилось пару горящих окон на этой неделе! Первым 3-м написавшим дарю скидку 15% 🚀"';
        } else if (upcomingApps.length >= avgWeeklyApps * 1.2 && upcomingApps.length > 5) {
            situation = 'high';
            adviceText = 'У вас высокая загрузка! Это отличный момент подумать о росте.';
            adviceHighlight = 'Возможно, стоит поднять цены на 10-15% на самые популярные услуги.';
        } else {
            // Спящие клиенты
            const sleepingClients = clients.filter((c: any) => c.visits_count > 0 && !c.is_blacklisted);
            if (sleepingClients.length > 0) {
                situation = 'sleeping';
                adviceText = 'У вас есть клиенты, которые давно не записывались. Сделайте рассылку:';
                adviceHighlight = '"Давно вас не видели! Дарим скидку 10% на следующий визит ❤️"';
            } else {
                situation = 'steady';
                adviceText = 'Загрузка стабильная. Отличное время попросить отзывы у постоянных клиентов!';
                adviceHighlight = 'Отправьте им ссылку на карты (2GIS/Яндекс) после успешного визита.';
            }
        }

        return {
            isVisible: hasAnyHistory || upcomingApps.length > 0,
            isLow: situation === 'low',
            upcomingCount: upcomingApps.length,
            lostRevenue: lostRevenueEstimate,
            situation,
            adviceText,
            adviceHighlight
        };
    };

    const prediction = getPrediction();

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
            {prediction.isVisible && (
                <div className={`p-6 md:p-8 rounded-[32px] shadow-lg flex flex-col md:flex-row gap-6 items-center justify-between relative overflow-hidden text-white ${prediction.isLow ? 'bg-gradient-to-r from-rose-500 to-orange-500 shadow-rose-500/20' : 'bg-gradient-to-r from-indigo-500 to-blue-500 shadow-blue-500/20'}`}>
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
                    <div className="relative z-10 flex-1 w-full">
                        <div className="flex justify-between items-center mb-2">
                            <span className="bg-white/20 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl backdrop-blur-md">🔮 Прогноз на 7 дней</span>
                            {prediction.isLow && <span className="bg-rose-600 border border-rose-400 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-sm">Риск простоя</span>}
                            {prediction.situation === 'high' && <span className="bg-blue-600 border border-blue-400 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-sm">Высокий спрос</span>}
                        </div>
                        <h3 className="text-2xl font-black tracking-tight mb-2 text-white">У вас {prediction.upcomingCount} записей на неделю</h3>

                        {prediction.isLow && prediction.lostRevenue > 0 ? (
                            <p className="text-white/90 font-medium text-sm leading-relaxed mb-4 max-w-xl">
                                Мы предсказываем недозагруженность. Возможная упущенная выгода: <span className="font-black text-white">{prediction.lostRevenue} ₽</span>. Рекомендуем запустить маркетинговую активность!
                            </p>
                        ) : (
                            <p className="text-white/90 font-medium text-sm leading-relaxed mb-4 max-w-xl">
                                Аналитика расписания обновлена. Ознакомьтесь с рекомендацией ниже.
                            </p>
                        )}

                        <div className="bg-white/10 border border-white/20 p-4 rounded-2xl flex items-start gap-4 backdrop-blur-md">
                            <div className="bg-white text-stone-800 p-2 rounded-xl shrink-0"><BarChart3 className="w-5 h-5" /></div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest mb-1 text-white opacity-90">Совет</p>
                                <p className="text-sm font-medium text-white/90">
                                    {prediction.adviceText} <br />
                                    <span className="italic font-bold text-white bg-black/20 px-2 py-0.5 rounded-lg mt-1 inline-block">{prediction.adviceHighlight}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
