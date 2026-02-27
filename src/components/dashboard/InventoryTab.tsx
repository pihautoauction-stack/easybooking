import { useState } from 'react';

export default function InventoryTab({
    inventory,
    user,
    role,
    handleAddInventory,
    handleAdjustInventory,
    handleDeleteInventory,
    Package,
    Plus,
    Archive,
    History,
    AlertTriangle,
    Edit3,
    Trash2,
    FileText,
    Loader2,
    newInvName, setNewInvName,
    newInvUnit, setNewInvUnit,
    newInvCost, setNewInvCost,
    newInvRetail, setNewInvRetail,
    newInvCategory, setNewInvCategory,
    addingInventory, setAddingInventory,
    inventoryTransactions,
    invView, setInvView,
    setShowInvModal,
    totalInventoryUnits,
    inventoryValue,
    groupedInventory,
    toggleInvCategory,
    expandedInvCategories,
    Folder, FolderOpen,
    transactions,
    format, ru,
    inventoryDocuments, loadData
}: any) {
    // ЛОКАЛЬНЫЕ СТЕЙТЫ ДОКУМЕНТОВ
    const [showDocModal, setShowDocModal] = useState(false);
    const [docType, setDocType] = useState<'receipt' | 'write_off' | 'inventory_check'>('receipt');
    const [docNotes, setDocNotes] = useState('');
    const [docItems, setDocItems] = useState<{ id: string; reqQty: number; factQty: number; costPrice: number }[]>([]);
    const [isProcessingDoc, setIsProcessingDoc] = useState(false);

    // Добавляем позицию в черновик
    const handleAddDocItem = (invId: string) => {
        if (!invId) return;
        const inv = inventory.find((i: any) => i.id === invId);
        if (!inv || docItems.some(di => di.id === invId)) return;
        setDocItems([...docItems, { id: inv.id, reqQty: inv.quantity, factQty: inv.quantity, costPrice: inv.cost_price }]);
    };

    // Обновляем факт
    const updateDocItem = (id: string, field: 'factQty' | 'costPrice', value: number) => {
        setDocItems(docItems.map(di => di.id === id ? { ...di, [field]: value } : di));
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
            docItems.forEach((di: any) => totalAmount += (di.factQty * di.costPrice));
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
                    <button onClick={() => { setDocType('inventory_check'); setDocItems(inventory.map((i: any) => ({ id: i.id, reqQty: i.quantity, factQty: i.quantity, costPrice: i.cost_price }))); setShowDocModal(true); }} className="bg-stone-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-stone-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-black">
                        <Plus className="w-4 h-4" /> Сверка (Инвентаризация)
                    </button>
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
                        {Object.keys(groupedInventory).length === 0 ? <p className="text-center text-stone-400 text-sm py-10 font-bold">Склад пуст</p> :
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
                        {transactions.length === 0 ? <p className="text-sm text-stone-400 font-bold text-center py-10">История пуста</p> :
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
                                                <span className="text-stone-300">•</span> {format(new Date(tx.created_at), "d MMM HH:mm", { locale: ru })}
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
                        {(!inventoryDocuments || inventoryDocuments.length === 0) ? <p className="text-sm text-stone-400 font-bold text-center py-10">Документов пока нет</p> :
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
                                    <div key={doc.id} className="flex justify-between items-center p-4 rounded-2xl bg-stone-50 border border-stone-100 hover:border-stone-200 transition-colors">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-widest ${typeColors[doc.type]}`}>{typeLabels[doc.type]}</span>
                                                <span className="font-bold text-stone-400 text-xs">от {format(new Date(doc.created_at), "d MMMM yyyy", { locale: ru })}</span>
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
                            {docType === 'inventory_check' ? 'Сверка остатков (Инвентаризация)' : 'Новый документ'}
                        </h2>

                        <div className="space-y-4">
                            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3 text-amber-800 text-sm font-bold">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                <p>Укажите фактическое наличие товаров на полках. Система сама подсчитает разницу с учетными данными, спишет недостачу или оприходует излишки.</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Комментарий к проверке</label>
                                <input value={docNotes} onChange={e => setDocNotes(e.target.value)} placeholder="Например: Ежемесячная ревизия за март..." className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800" />
                            </div>

                            <div className="border border-stone-200 rounded-2xl overflow-hidden mt-4">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-stone-50 border-b border-stone-200 text-[10px] uppercase tracking-widest text-stone-500 font-black">
                                        <tr>
                                            <th className="p-3">Товар</th>
                                            <th className="p-3 text-center">По учету</th>
                                            <th className="p-3 px-6 text-center">Фактически есть</th>
                                            <th className="p-3 text-center">Разница</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100 font-bold">
                                        {docItems.map(item => {
                                            const invItem = inventory.find((i: any) => i.id === item.id);
                                            if (!invItem) return null;
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
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button onClick={() => setShowDocModal(false)} className="px-6 py-3 rounded-xl font-bold text-stone-500 hover:bg-stone-50 transition-colors">Отмена</button>
                                <button onClick={handleProcessDoc} disabled={isProcessingDoc} className="bg-stone-900 hover:bg-black text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-stone-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                    {isProcessingDoc ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Провести инвентаризацию'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
