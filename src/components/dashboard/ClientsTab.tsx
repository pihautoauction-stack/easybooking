import { Search, UserCircle, Ban, Trash2, Users, Phone, MessageCircle, Edit3 } from "lucide-react";
import { useClientsStore } from "@/store/useClientsStore";
import { useAppointmentsStore } from "@/store/useAppointmentsStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useState } from "react";
import { toggleClientBlacklist, saveClientNote, updateClientTags } from "@/app/actions/clients";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function ClientsTab() {
    const { clients, setClients } = useClientsStore();
    const { appointments } = useAppointmentsStore();
    const { user } = useProfileStore();

    const [clientSearchQuery, setClientSearchQuery] = useState("");
    const [clientFilterMode, setClientFilterMode] = useState<'all' | 'sleeping'>('all');
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [clientNote, setClientNote] = useState("");
    const [savingNote, setSavingNote] = useState(false);
    const [newTagInput, setNewTagInput] = useState("");

    const getCleanPhone = (phone: string) => phone.replace(/\D/g, '');

    const isSleeping = (clientId: string) => {
        const clientApps = appointments.filter((a: any) => a.client_id === clientId && a.status === 'completed');
        if (clientApps.length === 0) return false;

        const lastApp = clientApps.reduce((latest: any, current: any) => {
            return new Date(current.start_time) > new Date(latest.start_time) ? current : latest;
        }, clientApps[0]);

        const daysSinceLastVisit = (new Date().getTime() - new Date(lastApp.start_time).getTime()) / (1000 * 3600 * 24);
        return daysSinceLastVisit > 60;
    };

    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) || (c.phone && c.phone.includes(clientSearchQuery)));
    const finalClients = clientFilterMode === 'sleeping' ? filteredClients.filter((c: any) => isSleeping(c.id)) : filteredClients;

    // Actions
    const handleSaveClientNote = async () => {
        if (!selectedClient) return; setSavingNote(true);
        const result = await saveClientNote(selectedClient.id, clientNote);
        if (result.success) {
            setClients(clients.map(c => c.id === selectedClient.id ? { ...c, notes: clientNote } : c));
            setSelectedClient({ ...selectedClient, notes: clientNote });
        } else alert("Ошибка: " + result.error);
        setSavingNote(false);
    };

    const handleToggleBlacklist = async (clientId: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(currentStatus ? "Разблокировать?" : "В ЧС?")) {
            setClients(clients.map(c => c.id === clientId ? { ...c, is_blacklisted: !currentStatus } : c));
            const result = await toggleClientBlacklist(clientId, currentStatus);
            if (!result.success) alert("Ошибка: " + result.error);
        }
    };

    const handleUpdateTags = async (clientId: string, tags: string[]) => {
        setClients(clients.map(c => c.id === clientId ? { ...c, tags } : c));
        if (selectedClient && selectedClient.id === clientId) {
            setSelectedClient({ ...selectedClient, tags });
        }
        await updateClientTags(clientId, tags);
    };

    const generateWhatsAppLink = (client: any) => {
        const text = `Здравствуйте, ${client.name}! Давно вас не видели в студии. 😔\n\nДарим вам персональную скидку 10% на следующий визит! Запишитесь прямо сейчас: ${window.location.origin}/book/${user?.username || user?.id || ''}`;
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
                        Спящие <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${clientFilterMode === 'sleeping' ? 'bg-rose-100 text-rose-600' : 'bg-stone-200 text-stone-500'}`}>&gt;60дн</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {finalClients.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 bg-stone-50 border border-stone-200 rounded-[32px] border-dashed">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                            <Users className="w-8 h-8 text-stone-300" />
                        </div>
                        <p className="text-stone-900 font-black text-lg mb-1">Клиентов не найдено</p>
                        <p className="text-stone-500 font-bold text-sm text-center max-w-sm">Попробуйте изменить параметры поиска или фильтрации.</p>
                    </div>
                ) : finalClients.map((client: any) => (
                    <div
                        key={client.id}
                        onClick={() => { setSelectedClient(client); setClientNote(client.notes || ""); }}
                        className={`p-5 rounded-[28px] border transition-all cursor-pointer hover:shadow-md flex flex-col justify-between ${client.is_blacklisted ? 'border-rose-100 bg-rose-50/50' : 'bg-white border-stone-200 shadow-sm hover:border-rose-200'}`}
                    >
                        <div>
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
                        </div>

                        <div>
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
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 border border-emerald-600 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-xs uppercase tracking-widest mt-2"
                                >
                                    <MessageCircle className="w-4 h-4" /> Вернуть скидкой
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Карточка Клиента. Ранее модалка была в page.tsx */}
            {/* 3. КАРТОЧКА КЛИЕНТА (CRM) */}
            {selectedClient && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedClient(null)}>
                    <div className="bg-white p-6 md:p-8 rounded-[32px] w-full max-w-md shadow-2xl relative border border-stone-200 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedClient(null)} className="absolute top-6 right-6 text-stone-400 hover:text-stone-800 bg-stone-50 p-2.5 rounded-full"><span className="w-5 h-5 flex items-center justify-center font-black">×</span></button>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100"><UserCircle className="w-8 h-8 text-rose-400" /></div>
                            <div>
                                <h2 className="text-xl font-black text-stone-800 leading-tight">{selectedClient.name}</h2>
                                <p className="text-sm font-bold text-stone-500 mt-0.5">{selectedClient.phone}</p>
                            </div>
                        </div>

                        {/* УПРАВЛЕНИЕ ТЕГАМИ */}
                        <div className="mb-6 space-y-3">
                            <label className="text-[11px] text-stone-500 font-bold uppercase tracking-widest ml-1">Теги клиента</label>

                            <div className="flex flex-wrap gap-2">
                                {selectedClient.tags?.map((tag: string, idx: number) => (
                                    <span key={idx} className="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] uppercase tracking-widest font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                                        {tag}
                                        <button onClick={() => {
                                            const newTags = selectedClient.tags.filter((_: any, i: number) => i !== idx);
                                            handleUpdateTags(selectedClient.id, newTags);
                                        }} className="hover:text-rose-800"><span className="font-bold">×</span></button>
                                    </span>
                                ))}
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                if (!newTagInput.trim()) return;
                                const currentTags = selectedClient.tags || [];
                                if (!currentTags.includes(newTagInput.trim().toUpperCase())) {
                                    handleUpdateTags(selectedClient.id, [...currentTags, newTagInput.trim().toUpperCase()]);
                                }
                                setNewTagInput("");
                            }} className="flex gap-2">
                                <input
                                    value={newTagInput}
                                    onChange={e => setNewTagInput(e.target.value)}
                                    placeholder="Новый тег (напр. VIP)"
                                    className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800"
                                />
                                <button type="submit" disabled={!newTagInput.trim()} className="bg-stone-900 text-white font-bold px-3 py-2 rounded-xl text-xs disabled:opacity-50">Добавить</button>
                            </form>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-stone-50 border border-stone-100 p-4 rounded-2xl"><p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1">Всего визитов</p><p className="text-2xl font-black tracking-tight text-stone-800">{selectedClient.visits_count}</p></div>
                            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl"><p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-1">Выручка</p><p className="text-2xl font-black tracking-tight text-emerald-600">{selectedClient.total_revenue} ₽</p></div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <label className="text-[11px] text-stone-500 font-bold uppercase tracking-widest ml-1 flex items-center gap-1.5"><Edit3 className="w-3.5 h-3.5" /> Заметки</label>
                            <textarea value={clientNote} onChange={e => setClientNote(e.target.value)} placeholder="Детали работы, пожелания клиента..." className="w-full bg-orange-50/50 border border-orange-200/60 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-400/30 text-stone-800 min-h-[120px] resize-none" />
                            <button onClick={handleSaveClientNote} disabled={savingNote} className="w-full bg-stone-900 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50">{savingNote ? "Сохранение..." : "Сохранить заметку"}</button>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] text-stone-500 font-bold uppercase tracking-widest ml-1 flex items-center gap-1.5">История записей</label>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                {appointments.filter(a => a.client_phone === selectedClient.phone).reverse().map(app => (
                                    <div key={app.id} className="flex justify-between items-center bg-stone-50 p-3 rounded-xl border border-stone-100">
                                        <div>
                                            <p className="text-xs font-bold text-stone-800">{format(new Date(app.start_time), "d MMMM yyyy", { locale: ru })}</p>
                                            <p className="text-[10px] text-stone-500 font-bold mt-0.5 lg:-mt-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-40 md:max-w-56">{app.service?.name}</p>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${app.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>{app.status === 'completed' ? 'Был' : 'Записан'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
