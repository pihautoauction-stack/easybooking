import { useState, useMemo } from 'react';
import { Package, Plus, Archive, History, AlertTriangle, Edit3, Trash2, FileText, Loader2, Folder, FolderOpen, Search } from "lucide-react";
import { useInventoryStore } from "@/store/useInventoryStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useAppActions } from "@/store/actions";
import { createClient } from "@/lib/supabase/client";
import { format as dateFnsFormat } from "date-fns";
import { ru } from "date-fns/locale";

const supabase = createClient();

export default function InventoryTab() {
    const { inventory, transactions: inventoryTransactions, documents: inventoryDocuments } = useInventoryStore();
    const { user, role } = useProfileStore();
    const { fetchAllData } = useAppActions();

    // Form state for adding new inventory item
    const [showInvModal, setShowInvModal] = useState(false);
    const [newInvName, setNewInvName] = useState('');
    const [newInvUnit, setNewInvUnit] = useState('мл');
    const [newInvCost, setNewInvCost] = useState('');
    const [newInvRetail, setNewInvRetail] = useState('');
    const [newInvCategory, setNewInvCategory] = useState('');
    const [addingInventory, setAddingInventory] = useState(false);

    const loadData = async (userId: string, silent?: boolean) => {
        await fetchAllData(userId, silent);
    };

    const handleAddInventory = async () => {
        if (!user || !newInvName) return;
        setAddingInventory(true);
        try {
            const { error } = await supabase.from('inventory').insert({
                user_id: user.id,
                name: newInvName,
                unit: newInvUnit || 'шт',
                cost_price: Number(newInvCost) || 0,
                retail_price: Number(newInvRetail) || 0,
                category: newInvCategory || 'Без категории',
                quantity: 0,
                critical_level: 0
            });
            if (error) throw error;
            setNewInvName('');
            setNewInvUnit('мл');
            setNewInvCost('');
            setNewInvRetail('');
            setNewInvCategory('');
            setShowInvModal(false);
            await loadData(user.id, true);
        } catch (err: any) {
            alert('Ошибка: ' + err.message);
        } finally {
            setAddingInventory(false);
        }
    };

    const handleAdjustInventory = async (item: any, type: 'add' | 'deduct') => {
        const amount = Number(prompt(`Сколько ${type === 'add' ? 'добавить' : 'списать'} (${item.unit})?`, '1'));
        if (!amount || amount <= 0) return;
        const { adjustInventoryStock } = await import('@/app/actions/inventory');
        const res = await adjustInventoryStock(item.id, amount, type);
        if (res.success) {
            await loadData(user.id, true);
        } else {
            alert('Ошибка: ' + res.error);
        }
    };

    const handleDeleteInventory = async (itemId: string) => {
        if (!confirm('Удалить эту позицию со склада?')) return;
        const { error } = await supabase.from('inventory').delete().eq('id', itemId);
        if (!error) {
            await loadData(user.id, true);
        } else {
            alert('Ошибка удаления: ' + error.message);
        }
    };

    const [invView, setInvView] = useState('stock');
    const [expandedInvCategories, setExpandedInvCategories] = useState<{ [key: string]: boolean }>({});

    const totalInventoryUnits = useMemo(() => inventory.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0), [inventory]);
    const inventoryValue = useMemo(() => Math.round(inventory.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.cost_price) || 0)), 0)), [inventory]);

    const toggleInvCategory = (category: string) => {
        setExpandedInvCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const groupedInventory = useMemo(() => {
        return inventory.reduce((acc: any, item: any) => {
            const cat = item.category || 'Без категории';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(item);
            return acc;
        }, {});
    }, [inventory]);

    // Only sort here if the backend doesn't return sorted, or simply map it from the state
    const transactions = [...inventoryTransactions].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // ЛОКАЛЬНЫЕ СТЕЙТЫ ДОКУМЕНТОВ
    const [showDocModal, setShowDocModal] = useState(false);
    const [docType, setDocType] = useState<'receipt' | 'write_off' | 'inventory_check'>('receipt');
    const [docNotes, setDocNotes] = useState('');
    const [docItems, setDocItems] = useState<{ id: string; reqQty: number; factQty: number; costPrice: number; packCount?: number; packVolume?: number; packPrice?: number }[]>([]);
    const [isProcessingDoc, setIsProcessingDoc] = useState(false);
    const [docItemSearch, setDocItemSearch] = useState('');
    const [showDocItemDropdown, setShowDocItemDropdown] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<any>(null);

    // Добавляем позицию в черновик
    const handleAddDocItem = (invId: string) => {
        if (!invId) return;
        const inv = inventory.find((i: any) => i.id === invId);
        if (!inv || docItems.some(di => di.id === invId)) return;
        setDocItems([...docItems, {
            id: inv.id,
            reqQty: inv.quantity,
            factQty: inv.quantity,
            costPrice: inv.cost_price,
            packCount: 1,
            packVolume: inv.unit === 'шт' ? 1 : (inv.unit === 'л' ? 1000 : 100),
            packPrice: 0
        }]);
        setDocItemSearch('');
        setShowDocItemDropdown(false);
    };

    // Обновляем факт
    const updateDocItem = (id: string, field: string, value: number) => {
        setDocItems(docItems.map(di => {
            if (di.id !== id) return di;
            const updated: any = { ...di, [field]: value };

            if (docType === 'receipt') {
                if (field === 'packCount' || field === 'packVolume') {
                    // Пересчет факта (сколько всего пришло в базовых единицах)
                    updated.factQty = (updated.packCount || 0) * (updated.packVolume || 1);
                }
                if (field === 'packPrice' || field === 'packVolume') {
                    // Пересчет себестоимости базовой единицы
                    updated.costPrice = (updated.packVolume || 1) > 0 ? (updated.packPrice || 0) / (updated.packVolume || 1) : 0;
                }
            }
            return updated;
        }));
    };

    const handleProcessDoc = async () => {
        if (docItems.length === 0) return alert('Добавьте позиции в документ');
        setIsProcessingDoc(true);

        const itemsPayload = docItems.map((di: any) => {
            let change = 0;
            if (docType === 'receipt') change = di.factQty; // Если приход, то factQty = сколько пришло
            if (docType === 'write_off') change = -di.factQty; // Если списание, то factQty = сколько списать
            if (docType === 'inventory_check') change = di.factQty - di.reqQty; // Разница факта с учетным для инвент-ции
            return {
                id: di.id,
                change_amount: change,
                cost_price: docType === 'receipt' ? di.costPrice : undefined
            };
        });

        // Считаем сумму (для прихода это factQty * costPrice)
        let totalAmount = 0;
        if (docType === 'receipt') {
            docItems.forEach((di: any) => totalAmount += ((di.packCount || 0) * (di.packPrice || 0)));
        }

        const { processInventoryDocument } = await import('@/app/actions/inventory');
        const res = await processInventoryDocument(docType, totalAmount, docNotes, itemsPayload);

        if (res.success) {
            setShowDocModal(false);
            setDocItems([]);
            setDocNotes('');
            loadData(user.id, true);
        } else {
            alert('Ошибка проведения документа: ' + res.error);
        }
        setIsProcessingDoc(false);
    };
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex bg-stone-200/60 p-1 rounded-xl w-max shadow-inner">
                    <button onClick={() => setInvView('stock')} className={`px-5 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${invView === 'stock' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>Остатки</button>
                    <button onClick={() => setInvView('history')} className={`px-5 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${invView === 'history' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}><History className="w-4 h-4" /> История</button>
                    <button onClick={() => setInvView('documents')} className={`px-5 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${invView === 'documents' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}><FileText className="w-4 h-4" /> Документы</button>
                </div>
                {invView === 'stock' && (
                    <button onClick={() => setShowInvModal(true)} className="bg-stone-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-stone-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-black">
                        <Plus className="w-4 h-4" /> Новый товар
                    </button>
                )}
                {invView === 'documents' && (
                    <div className="flex gap-2">
                        <button onClick={() => { setDocType('receipt'); setDocItems([]); setShowDocModal(true); }} className="bg-stone-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-stone-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-black border border-stone-800">
                            <Plus className="w-4 h-4" /> Приход
                        </button>
                        <button onClick={() => { setDocType('write_off'); setDocItems([]); setShowDocModal(true); }} className="bg-white text-stone-800 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm border border-stone-200 hover:bg-stone-50 transition-colors">
                            Списание
                        </button>
                        <button onClick={() => { setDocType('inventory_check'); setDocItems(inventory.map((i: any) => ({ id: i.id, reqQty: i.quantity, factQty: i.quantity, costPrice: i.cost_price }))); setShowDocModal(true); }} className="bg-white text-stone-800 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm border border-stone-200 hover:bg-stone-50 transition-colors">
                            Сверка
                        </button>
                    </div>
                )}
            </div>
            {invView === 'stock' && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="col-span-2 bg-white p-6 rounded-[32px] border border-stone-200 shadow-sm flex flex-col justify-center">
                            <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-1">Номенклатура (видов)</p>
                            <p className="text-3xl font-black tracking-tight text-stone-900">{inventory.length} <span className="text-sm font-bold text-stone-400 ml-1">категорий</span></p>
                            <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase tracking-widest">Всего физ. единиц: {totalInventoryUnits}</p>
                        </div>
                        <div className="col-span-2 bg-stone-900 p-6 rounded-[32px] shadow-lg text-white flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                            <p className="text-xs text-stone-400 font-black uppercase tracking-widest mb-1 relative z-10">Стоимость активов</p>
                            <p className="text-3xl font-black tracking-tight relative z-10">{inventoryValue} <span className="text-xl opacity-60">₽</span></p>
                        </div>
                    </div>

                    {/* БЛОК: ЗАКАЧНИВАЮЩИЕСЯ ТОВАРЫ */}
                    {(() => {
                        const lowStockItems = inventory.filter((i: any) => i.quantity <= i.critical_level);
                        if (lowStockItems.length === 0) return null;

                        return (
                            <div className="bg-rose-50 border border-rose-200 p-5 rounded-[24px]">
                                <h4 className="text-sm font-black text-rose-600 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Внимание: Заканчивающиеся позиции</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {lowStockItems.map((item: any) => (
                                        <div key={item.id} className="bg-white p-3 rounded-xl border border-rose-100 shadow-sm flex justify-between items-center group">
                                            <div>
                                                <p className="text-sm font-bold text-stone-800 line-clamp-1" title={item.name}>{item.name}</p>
                                                <p className="text-xs text-stone-500 mt-0.5">{item.category}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-rose-600 font-black text-sm px-2 py-1 bg-rose-50 rounded-lg">{item.quantity} {item.unit}</span>
                                                <button onClick={() => handleAdjustInventory(item, 'add')} className="p-1.5 text-rose-400 hover:text-emerald-500 hover:bg-emerald-50 bg-white border border-stone-100 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100" title="Оприходовать"><Plus className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    <div className="bg-white p-2 rounded-[32px] border border-stone-200 shadow-sm">
                        {Object.keys(groupedInventory).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-stone-50 border border-stone-200 rounded-[28px] border-dashed m-2">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                                    <Package className="w-8 h-8 text-stone-300" />
                                </div>
                                <p className="text-stone-900 font-black text-lg mb-1">Склад пуст</p>
                                <p className="text-stone-500 font-bold text-sm text-center max-w-sm">Добавьте новые материалы и расходники для учета.</p>
                            </div>
                        ) :
                            (Object.entries(groupedInventory) as [string, any[]][]).map(([category, items]) => (
                                <div key={category} className="mb-2 last:mb-0">
                                    <button onClick={() => toggleInvCategory(category)} className="w-full flex items-center justify-between p-4 rounded-2xl bg-stone-50 hover:bg-stone-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {expandedInvCategories[category] ? <FolderOpen className="w-5 h-5 text-rose-400" /> : <Folder className="w-5 h-5 text-stone-400" />}
                                            <span className="font-black text-stone-900 text-base">{category}</span>
                                            <span className="bg-white text-stone-500 px-2 py-0.5 rounded-md text-[10px] font-black border border-stone-200">{items.length} поз.</span>
                                        </div>
                                    </button>
                                    {expandedInvCategories[category] && (
                                        <div className="px-2 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-stone-100 text-[10px] uppercase tracking-widest text-stone-400">
                                                            <th className="pb-3 pl-3 font-black">Наименование</th>
                                                            <th className="pb-3 font-black">Остаток</th>
                                                            <th className="pb-3 font-black hidden sm:table-cell">Закупка</th>
                                                            <th className="pb-3 font-black hidden sm:table-cell">Розница</th>
                                                            <th className="pb-3 font-black text-right pr-3">Действия</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {items.map(item => {
                                                            const isLow = item.quantity <= item.critical_level;
                                                            return (
                                                                <tr key={item.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors group">
                                                                    <td className="py-4 pl-3">
                                                                        <p className="font-black text-sm text-stone-900">{item.name}</p>
                                                                        {item.sku && <p className="text-[10px] text-stone-400 font-bold font-mono mt-0.5">Арт: {item.sku}</p>}
                                                                    </td>
                                                                    <td className="py-4">
                                                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black ${isLow ? 'bg-orange-100 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                                                            {isLow && <AlertTriangle className="w-3 h-3" />}
                                                                            {item.quantity} {item.unit}
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-4 hidden sm:table-cell font-black text-stone-400 text-sm">{item.cost_price} ₽</td>
                                                                    <td className="py-4 hidden sm:table-cell font-black text-stone-600 text-sm">{item.retail_price} ₽</td>
                                                                    <td className="py-4 pr-3 text-right">
                                                                        <div className="flex justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button onClick={() => handleAdjustInventory(item, 'deduct')} className="p-2 bg-white border border-stone-200 rounded-lg text-stone-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors" title="Списать">-</button>
                                                                            <button onClick={() => handleAdjustInventory(item, 'add')} className="p-2 bg-white border border-stone-200 rounded-lg text-stone-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors" title="Добавить">+</button>
                                                                            <button onClick={() => handleDeleteInventory(item.id)} className="p-2 ml-2 bg-white border border-stone-200 rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        }
                    </div>
                </>
            )}
            {invView === 'history' && (
                <div className="bg-white p-6 md:p-8 rounded-[32px] border border-stone-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                    <h3 className="text-xl font-black text-stone-800 mb-6 flex items-center gap-2"><History className="w-5 h-5 text-rose-500" /> Журнал операций</h3>
                    <div className="space-y-3">
                        {transactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 bg-stone-50 border border-stone-200 rounded-[24px] border-dashed">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                                    <History className="w-6 h-6 text-stone-300" />
                                </div>
                                <p className="text-stone-900 font-black text-base mb-1">История пуста</p>
                                <p className="text-stone-500 font-bold text-xs text-center max-w-sm">Здесь будут отображаться операции списания и добавления.</p>
                            </div>
                        ) :
                            transactions.map((tx: any) => {
                                const isAdd = tx.change_amount > 0;
                                return (
                                    <div key={tx.id} className="flex justify-between items-center p-4 rounded-2xl bg-stone-50 border border-stone-100 hover:border-stone-200 transition-colors">
                                        <div>
                                            <p className="font-black text-sm text-stone-900">{tx.inventory?.name || "Товар удален"}</p>
                                            <p className="text-[10px] font-bold text-stone-500 mt-1 uppercase tracking-widest flex items-center gap-1.5">
                                                {tx.type === 'manual_add' ? <span className="text-emerald-600">Ручной приход</span> :
                                                    tx.type === 'manual_deduct' ? <span className="text-orange-500">Ручное списание</span> :
                                                        <span className="text-violet-500">Расход на заказ</span>}
                                                <span className="text-stone-300">•</span> {dateFnsFormat(new Date(tx.created_at), "d MMM HH:mm", { locale: ru })}
                                            </p>
                                        </div>
                                        <span className={`font-black text-sm px-3 py-1.5 rounded-xl border shrink-0 ${isAdd ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                            {isAdd ? '+' : ''}{tx.change_amount} {tx.inventory?.unit || 'шт'}
                                        </span>
                                    </div>
                                )
                            })
                        }
                    </div>
                </div>
            )}
            {invView === 'documents' && (
                <div className="bg-white p-6 md:p-8 rounded-[32px] border border-stone-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                    <h3 className="text-xl font-black text-stone-800 mb-6 flex items-center gap-2"><FileText className="w-5 h-5 text-rose-500" /> Документы</h3>
                    <div className="space-y-3">
                        {(!inventoryDocuments || inventoryDocuments.length === 0) ? (
                            <div className="flex flex-col items-center justify-center py-16 bg-stone-50 border border-stone-200 rounded-[24px] border-dashed">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                                    <FileText className="w-6 h-6 text-stone-300" />
                                </div>
                                <p className="text-stone-900 font-black text-base mb-1">Документов пока нет</p>
                                <p className="text-stone-500 font-bold text-xs text-center max-w-sm">Создайте приходную или расходную накладную.</p>
                            </div>
                        ) :
                            inventoryDocuments.map((doc: any) => {
                                const typeColors: Record<string, string> = {
                                    receipt: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                                    write_off: 'bg-rose-50 text-rose-600 border-rose-100',
                                    inventory_check: 'bg-amber-50 text-amber-600 border-amber-100'
                                };
                                const typeLabels: Record<string, string> = {
                                    receipt: 'Приход',
                                    write_off: 'Списание',
                                    inventory_check: 'Инвентаризация'
                                };
                                return (
                                    <div key={doc.id} onClick={() => setSelectedDoc(doc)} className="flex justify-between items-center p-4 rounded-2xl bg-stone-50 border border-stone-100 hover:border-stone-300 hover:shadow-sm cursor-pointer transition-all">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-widest ${typeColors[doc.type]}`}>{typeLabels[doc.type]}</span>
                                                <span className="font-bold text-stone-400 text-xs">от {dateFnsFormat(new Date(doc.created_at), "d MMMM yyyy", { locale: ru })}</span>
                                            </div>
                                            {doc.notes && <p className="text-sm font-bold text-stone-600 mt-2">«{doc.notes}»</p>}
                                            <p className="text-[10px] font-bold text-stone-400 mt-1 uppercase tracking-widest">Транзакций: {doc.transactions?.length || 0}</p>
                                        </div>
                                        {doc.type === 'receipt' && <span className="font-black text-sm text-stone-800 shrink-0">{doc.total_amount} ₽</span>}
                                    </div>
                                )
                            })
                        }
                    </div>
                </div>
            )}

            {/* МОДАЛКА ДОКУМЕНТА (Инвентаризация/Приход) */}
            {showDocModal && (
                <div className="fixed inset-0 z-[70] flex justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200 pt-10 sm:pt-20 items-start overflow-y-auto">
                    <div className="bg-white p-6 md:p-8 rounded-[32px] w-full max-w-4xl shadow-2xl relative border border-stone-200" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setShowDocModal(false)} className="absolute top-6 right-6 text-stone-400 hover:text-stone-800 bg-stone-50 p-2.5 rounded-full"><Trash2 className="w-5 h-5 hidden" /> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                        <h2 className="text-2xl font-black mb-6 text-stone-900 flex items-center gap-2">
                            {docType === 'inventory_check' ? 'Сверка остатков (Инвентаризация)' : docType === 'receipt' ? 'Приход товара от поставщика' : 'Списание товара'}
                        </h2>

                        <div className="space-y-4">
                            {docType === 'inventory_check' && (
                                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3 text-amber-800 text-sm font-bold">
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    <p>Укажите фактическое наличие товаров на полках. Система сама подсчитает разницу с учетными данными, спишет недостачу или оприходует излишки.</p>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Комментарий к {docType === 'receipt' ? 'приходу' : docType === 'write_off' ? 'списанию' : 'проверке'}</label>
                                <input value={docNotes} onChange={e => setDocNotes(e.target.value)} placeholder={docType === 'receipt' ? "Например: Накладная №... от ООО Ромашка" : docType === 'write_off' ? "Укажите причину списания: порча, использование на хоз. нужды..." : "Ежемесячная ревизия за март..."} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800" />
                            </div>

                            {docType !== 'inventory_check' && (
                                <div className="relative z-20">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Добавить товар в документ</label>
                                    <div className="relative mt-1">
                                        <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-stone-400" />
                                        <input
                                            value={docItemSearch}
                                            onChange={e => { setDocItemSearch(e.target.value); setShowDocItemDropdown(true); }}
                                            onFocus={() => setShowDocItemDropdown(true)}
                                            placeholder="Поиск по складу..."
                                            className="w-full bg-white border border-stone-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800 focus:border-rose-400"
                                        />
                                        {(showDocItemDropdown && docItemSearch) && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-100 shadow-xl rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                                                {inventory.filter((i: any) => i.name.toLowerCase().includes(docItemSearch.toLowerCase()) && !docItems.some(di => di.id === i.id)).length === 0 ? (
                                                    <div className="p-4 text-center text-stone-400 text-sm font-bold">Ничего не найдено</div>
                                                ) : (
                                                    inventory.filter((i: any) => i.name.toLowerCase().includes(docItemSearch.toLowerCase()) && !docItems.some(di => di.id === i.id)).map((item: any) => (
                                                        <button key={item.id} onClick={() => handleAddDocItem(item.id)} className="w-full text-left p-3 hover:bg-stone-50 border-b border-stone-50 last:border-0 flex justify-between items-center group">
                                                            <div>
                                                                <p className="font-bold text-stone-800 text-sm group-hover:text-rose-600 transition-colors">{item.name}</p>
                                                                <p className="text-xs text-stone-400">{item.category} • В наличии: {item.quantity} {item.unit}</p>
                                                            </div>
                                                            <Plus className="w-4 h-4 text-stone-300 group-hover:text-rose-500" />
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="border border-stone-200 rounded-2xl overflow-hidden mt-4">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-stone-50 border-b border-stone-200 text-[10px] uppercase tracking-widest text-stone-500 font-black">
                                        <tr>
                                            <th className="p-3">Товар</th>
                                            {docType === 'inventory_check' && <th className="p-3 text-center">По учету</th>}
                                            {docType === 'inventory_check' && <th className="p-3 px-6 text-center">Фактически есть</th>}
                                            {docType === 'inventory_check' && <th className="p-3 text-center">Разница</th>}

                                            {docType === 'write_off' && <th className="p-3 px-6 text-center">Списать</th>}

                                            {docType === 'receipt' && <th className="p-3 text-center">Кол-во (упак.)</th>}
                                            {docType === 'receipt' && <th className="p-3 text-center">Объем (1 упак.)</th>}
                                            {docType === 'receipt' && <th className="p-3 text-center">Цена (1 упак.)</th>}
                                            {docType === 'receipt' && <th className="p-3 text-center">Итого приход</th>}
                                            {docType !== 'inventory_check' && <th className="p-3 text-right"></th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100 font-bold">
                                        {docItems.length === 0 && docType !== 'inventory_check' ? (
                                            <tr>
                                                <td colSpan={6} className="p-6 text-center text-stone-400 text-sm font-bold">Добавьте товары через поиск выше</td>
                                            </tr>
                                        ) : docItems.map(item => {
                                            const invItem = inventory.find((i: any) => i.id === item.id);
                                            if (!invItem) return null;

                                            if (docType === 'inventory_check') {
                                                const diff = item.factQty - item.reqQty;
                                                let diffStr = diff > 0 ? `+${diff}` : diff.toString();
                                                let diffColor = diff === 0 ? 'text-stone-300' : diff > 0 ? 'text-emerald-500' : 'text-rose-500';

                                                return (
                                                    <tr key={item.id} className="hover:bg-stone-50/50">
                                                        <td className="p-3">
                                                            <p className="text-stone-900 line-clamp-1">{invItem.name}</p>
                                                            <p className="text-xs text-stone-400 font-medium">{invItem.category}</p>
                                                        </td>
                                                        <td className="p-3 text-center text-stone-500 font-mono">{item.reqQty}</td>
                                                        <td className="p-3 max-w-[120px]">
                                                            <div className="flex items-center gap-1 justify-center">
                                                                <input
                                                                    type="number" min="0" step="any"
                                                                    value={item.factQty}
                                                                    onChange={e => updateDocItem(item.id, 'factQty', Number(e.target.value))}
                                                                    className="w-20 bg-white border border-stone-300 rounded-lg p-2 text-center text-sm outline-none focus:border-rose-400 font-black text-stone-800 shadow-inner"
                                                                />
                                                                <span className="text-[10px] text-stone-400 uppercase tracking-widest">{invItem.unit}</span>
                                                            </div>
                                                        </td>
                                                        <td className={`p-3 text-center font-black ${diffColor}`}>{diffStr}</td>
                                                    </tr>
                                                )
                                            }

                                            if (docType === 'receipt') {
                                                const isPack = invItem.unit === 'шт';
                                                return (
                                                    <tr key={item.id} className="hover:bg-stone-50/50">
                                                        <td className="p-3">
                                                            <p className="text-stone-900 line-clamp-1">{invItem.name}</p>
                                                            <p className="text-xs text-stone-400 font-medium">{invItem.category}</p>
                                                        </td>
                                                        <td className="p-3 max-w-[100px]">
                                                            <div className="flex items-center gap-1 justify-center">
                                                                <input type="number" min="0" step="any" value={item.packCount || ''} onChange={e => updateDocItem(item.id, 'packCount', Number(e.target.value))} className="w-16 bg-white border border-stone-300 rounded-lg p-2 text-center text-sm outline-none focus:border-rose-400 font-black text-stone-800 shadow-inner" />
                                                                <span className="text-[10px] text-stone-400 uppercase tracking-widest">шт</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3 max-w-[120px]">
                                                            {!isPack ? (
                                                                <div className="flex items-center gap-1 justify-center">
                                                                    <input type="number" min="0" step="any" value={item.packVolume || ''} onChange={e => updateDocItem(item.id, 'packVolume', Number(e.target.value))} className="w-20 bg-white border border-stone-300 rounded-lg p-2 text-center text-sm outline-none focus:border-rose-400 font-black text-stone-800 shadow-inner" />
                                                                    <span className="text-[10px] text-stone-400 uppercase tracking-widest">{invItem.unit}</span>
                                                                </div>
                                                            ) : (
                                                                <div className="text-center text-stone-400 text-xs">1 шт</div>
                                                            )}
                                                        </td>
                                                        <td className="p-3 max-w-[120px]">
                                                            <div className="flex items-center gap-1 justify-center">
                                                                <input type="number" min="0" step="any" value={item.packPrice || ''} onChange={e => updateDocItem(item.id, 'packPrice', Number(e.target.value))} className="w-20 bg-white border border-stone-300 rounded-lg p-2 text-center text-sm outline-none focus:border-rose-400 font-black text-stone-800 shadow-inner" />
                                                                <span className="text-[10px] text-stone-400 uppercase tracking-widest">₽</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="text-center font-black text-emerald-600">+{item.factQty} {invItem.unit}</div>
                                                            <div className="text-center text-[10px] text-stone-500 uppercase tracking-widest">{Number(item.costPrice).toFixed(2)} ₽ / {invItem.unit}</div>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <button onClick={() => setDocItems(docItems.filter(di => di.id !== item.id))} className="p-2 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                        </td>
                                                    </tr>
                                                )
                                            }

                                            if (docType === 'write_off') {
                                                return (
                                                    <tr key={item.id} className="hover:bg-stone-50/50">
                                                        <td className="p-3">
                                                            <p className="text-stone-900 line-clamp-1">{invItem.name}</p>
                                                            <p className="text-xs text-stone-400 font-medium">В наличии: {invItem.quantity} {invItem.unit}</p>
                                                        </td>
                                                        <td className="p-3 max-w-[150px]">
                                                            <div className="flex items-center gap-1 justify-center">
                                                                <input type="number" min="0" max={invItem.quantity} step="any" value={item.factQty || ''} onChange={e => updateDocItem(item.id, 'factQty', Number(e.target.value))} className="w-24 bg-rose-50 border border-rose-200 rounded-lg p-2 text-center text-sm outline-none focus:border-rose-500 focus:bg-white font-black text-rose-600 shadow-inner placeholder:text-rose-300" placeholder="Списать" />
                                                                <span className="text-[10px] text-stone-400 uppercase tracking-widest">{invItem.unit}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <button onClick={() => setDocItems(docItems.filter(di => di.id !== item.id))} className="p-2 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                        </td>
                                                    </tr>
                                                )
                                            }
                                            return null;
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button onClick={() => setShowDocModal(false)} className="px-6 py-3 rounded-xl font-bold text-stone-500 hover:bg-stone-50 transition-colors">Отмена</button>
                                <button onClick={handleProcessDoc} disabled={isProcessingDoc} className="bg-stone-900 hover:bg-black text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-stone-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                    {isProcessingDoc ? <Loader2 className="w-5 h-5 animate-spin" /> : docType === 'receipt' ? 'Оприходовать товары' : docType === 'write_off' ? 'Провести списание' : 'Провести инвентаризацию'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* МОДАЛКА ПРОСМОТРА ДОКУМЕНТА */}
            {selectedDoc && (
                <div className="fixed inset-0 z-[70] flex justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200 pt-10 sm:pt-20 items-start overflow-y-auto">
                    <div className="bg-white p-6 md:p-8 rounded-[32px] w-full max-w-3xl shadow-2xl relative border border-stone-200" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedDoc(null)} className="absolute top-6 right-6 text-stone-400 hover:text-stone-800 bg-stone-50 p-2.5 rounded-full"><Trash2 className="w-5 h-5 hidden" /> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>

                        <div className="mb-6">
                            <h2 className="text-2xl font-black text-stone-900 flex items-center gap-2">
                                {selectedDoc.type === 'receipt' ? 'Приходная накладная' : selectedDoc.type === 'write_off' ? 'Акт списания' : 'Инвентаризационная ведомость'}
                            </h2>
                            <p className="text-sm font-bold text-stone-400 mt-1">от {dateFnsFormat(new Date(selectedDoc.created_at), "d MMMM yyyy, HH:mm", { locale: ru })}</p>
                        </div>

                        {selectedDoc.notes && (
                            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 mb-6">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Комментарий</p>
                                <p className="text-sm font-bold text-stone-800">{selectedDoc.notes}</p>
                            </div>
                        )}

                        <div className="border border-stone-200 rounded-2xl overflow-hidden mb-6">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-stone-50 border-b border-stone-200 text-[10px] uppercase tracking-widest text-stone-500 font-black">
                                    <tr>
                                        <th className="p-3">Товар</th>
                                        <th className="p-3 text-center">Изменение</th>
                                        {selectedDoc.type === 'receipt' && <th className="p-3 text-right">Итого списано / оприходовано базовых ед.</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 font-bold">
                                    {selectedDoc.transactions?.map((tx: any) => {
                                        const isAdd = tx.change_amount > 0;
                                        return (
                                            <tr key={tx.id} className="hover:bg-stone-50/50">
                                                <td className="p-3">
                                                    <p className="text-stone-900 line-clamp-1">{tx.inventory?.name || 'Удаленный товар'}</p>
                                                    {tx.inventory?.category && <p className="text-xs text-stone-400">{tx.inventory.category}</p>}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black ${isAdd ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                        {isAdd ? '+' : ''}{tx.change_amount} {tx.inventory?.unit || 'шт'}
                                                    </span>
                                                </td>
                                                {selectedDoc.type === 'receipt' && (
                                                    <td className="p-3 text-right font-black text-stone-800">
                                                        {tx.cost_price ? `${(tx.change_amount * tx.cost_price).toFixed(2)} ₽` : '—'}
                                                    </td>
                                                )}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {selectedDoc.type === 'receipt' && (
                            <div className="flex justify-end pt-4 border-t border-stone-100">
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Итого сумма</p>
                                    <p className="text-2xl font-black text-stone-900">{selectedDoc.total_amount} ₽</p>
                                </div>
                            </div>
                        )}

                        <div className="pt-6 flex justify-end">
                            <button onClick={() => setSelectedDoc(null)} className="bg-stone-900 hover:bg-black text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-stone-900/20 active:scale-95 transition-all">Закрыть</button>
                        </div>
                    </div>
                </div>
            )}
            {/* МОДАЛКА ДОБАВЛЕНИЯ НОВОГО ТОВАРА */}
            {showInvModal && (
                <div className="fixed inset-0 z-[70] flex justify-center items-start p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200 pt-10 sm:pt-20 overflow-y-auto">
                    <div className="bg-white p-6 md:p-8 rounded-[32px] w-full max-w-lg shadow-2xl relative border border-stone-200" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowInvModal(false)} className="absolute top-6 right-6 text-stone-400 hover:text-stone-800 bg-stone-50 p-2.5 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        <h2 className="text-2xl font-black mb-6 text-stone-900">Добавить товар на склад</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Название *</label>
                                <input value={newInvName} onChange={e => setNewInvName(e.target.value)} placeholder="Например: Краска для волос" className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Единица измерения</label>
                                    <select value={newInvUnit} onChange={e => setNewInvUnit(e.target.value)} className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800">
                                        <option value="мл">мл</option>
                                        <option value="г">г</option>
                                        <option value="шт">шт</option>
                                        <option value="л">л</option>
                                        <option value="кг">кг</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Категория</label>
                                    <input value={newInvCategory} onChange={e => setNewInvCategory(e.target.value)} placeholder="Краски" className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Закупочная цена (₽)</label>
                                    <input type="number" value={newInvCost} onChange={e => setNewInvCost(e.target.value)} placeholder="0" className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Розничная цена (₽)</label>
                                    <input type="number" value={newInvRetail} onChange={e => setNewInvRetail(e.target.value)} placeholder="0" className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800" />
                                </div>
                            </div>
                            <button onClick={handleAddInventory} disabled={addingInventory || !newInvName} className="w-full bg-stone-900 hover:bg-black text-white py-4 rounded-2xl font-black shadow-lg shadow-stone-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2">
                                {addingInventory ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Добавить на склад'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
