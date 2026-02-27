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
    format, ru
}: any) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex bg-stone-200/60 p-1 rounded-xl w-max shadow-inner">
                    <button onClick={() => setInvView('stock')} className={`px-5 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${invView === 'stock' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>Остатки</button>
                    <button onClick={() => setInvView('history')} className={`px-5 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${invView === 'history' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}><History className="w-4 h-4" /> История</button>
                </div>
                {invView === 'stock' && (
                    <button onClick={() => setShowInvModal(true)} className="bg-stone-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-stone-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-black">
                        <Plus className="w-4 h-4" /> Новый товар
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
        </div>
    );
}
