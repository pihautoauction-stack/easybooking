export default function ServicesTab({
    services,
    role,
    setSelectedService,
    setAddingService,
    handleDeleteService,
    handleUploadImage,
    handleRemoveImage,
    uploadingImageId,
    expandedCategories,
    toggleCategory,
    Briefcase,
    Clock,
    CheckCircle2,
    Trash2,
    Plus,
    X,
    Camera,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Search,
    Folder,
    FolderOpen,
    Package,
    selectedService,
    addingService,
    newName, setNewName,
    newPrice, setNewPrice,
    newDuration, setNewDuration,
    serviceCategorySelect, setServiceCategorySelect,
    serviceCategoryInput, setServiceCategoryInput,
    newServiceEmpId, setNewServiceEmpId,
    handleAddService,
    employees,
    existingServiceCategories,
    serviceSearchQuery,
    setServiceSearchQuery,
    groupedServices,
    inventory,
    newServiceMaterials,
    setNewServiceMaterials
}: any) {
    const handleAddMaterialToNewService = (invId: string) => {
        if (!invId) return;
        if (newServiceMaterials.find((m: any) => m.inventory_id === invId)) return;
        setNewServiceMaterials([...newServiceMaterials, { inventory_id: invId, default_quantity: 1 }]);
    };
    const handleRemoveMaterialFromNewService = (invId: string) => {
        setNewServiceMaterials(newServiceMaterials.filter((m: any) => m.inventory_id !== invId));
    };
    const handleUpdateMaterialQuantity = (invId: string, qty: number) => {
        setNewServiceMaterials(newServiceMaterials.map((m: any) => m.inventory_id === invId ? { ...m, default_quantity: qty } : m));
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-[32px] border border-stone-200 shadow-sm">
                        <h2 className="text-lg font-black tracking-tight mb-5 text-stone-800">Добавить услугу</h2>
                        <div className="flex flex-col gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Папка (Категория)</label>
                                <select value={serviceCategorySelect} onChange={e => setServiceCategorySelect(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800 appearance-none cursor-pointer">
                                    {existingServiceCategories.map((c: any) => <option key={c} value={c}>{c}</option>)}
                                    <option value="NEW">+ Создать новую папку</option>
                                </select>
                            </div>
                            {serviceCategorySelect === 'NEW' && (
                                <input value={serviceCategoryInput} onChange={e => setServiceCategoryInput(e.target.value)} placeholder="Название новой папки..." className="w-full bg-white border border-rose-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800 shadow-sm" />
                            )}
                            <div className="space-y-1 mt-2">
                                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Название услуги</label>
                                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Например: Базовая услуга" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 transition-all text-stone-800" />
                            </div>
                            {role === 'owner' && (
                                <select value={newServiceEmpId} onChange={e => setNewServiceEmpId(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none appearance-none"><option value="">Выполняют все</option>{employees.map((emp: any) => <option key={emp.id} value={emp.id}>Только: {emp.name}</option>)}</select>
                            )}
                            <div className="grid grid-cols-2 gap-3 mt-1">
                                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[10px] font-bold uppercase">Мин</span><input value={newDuration} onChange={e => setNewDuration(e.target.value)} type="number" placeholder="60" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 pl-10 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800" /></div>
                                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-bold">₽</span><input value={newPrice} onChange={e => setNewPrice(e.target.value)} type="number" placeholder="Цена" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 pl-8 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800" /></div>
                            </div>

                            <div className="mt-4 border-t border-stone-100 pt-4">
                                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1 flex items-center gap-2 mb-2"><Package className="w-3 h-3" /> Техкарта (Расходники)</label>
                                {inventory && inventory.length > 0 ? (
                                    <div className="space-y-2">
                                        <select
                                            onChange={(e) => { handleAddMaterialToNewService(e.target.value); e.target.value = ""; }}
                                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800 appearance-none cursor-pointer"
                                            value=""
                                        >
                                            <option value="" disabled>+ Добавить материал...</option>
                                            {inventory.map((item: any) => (
                                                <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                                            ))}
                                        </select>

                                        {newServiceMaterials.length > 0 && (
                                            <div className="space-y-2 mt-2">
                                                {newServiceMaterials.map((mat: any) => {
                                                    const invItem = inventory.find((i: any) => i.id === mat.inventory_id);
                                                    if (!invItem) return null;
                                                    return (
                                                        <div key={mat.inventory_id} className="flex items-center gap-2 bg-rose-50/50 p-2 rounded-xl border border-rose-100 justify-between">
                                                            <span className="text-xs font-bold text-stone-700 truncate">{invItem.name}</span>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <input
                                                                    type="number"
                                                                    min="0.1"
                                                                    step="any"
                                                                    value={mat.default_quantity}
                                                                    onChange={(e) => handleUpdateMaterialQuantity(mat.inventory_id, Number(e.target.value))}
                                                                    className="w-16 bg-white border border-stone-200 rounded-lg p-1.5 text-xs text-center font-bold outline-none"
                                                                />
                                                                <span className="text-[10px] text-stone-500 font-bold w-4">{invItem.unit}</span>
                                                                <button onClick={() => handleRemoveMaterialFromNewService(mat.inventory_id)} className="p-1 hover:bg-white rounded-md text-stone-400 hover:text-rose-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-stone-400 font-bold bg-stone-50 p-3 rounded-xl border border-stone-100 italic">Склад пуст. Добавьте материалы в модуле Склад.</p>
                                )}
                            </div>

                            <button onClick={handleAddService} disabled={addingService || !newName || !newPrice || (serviceCategorySelect === 'NEW' && !serviceCategoryInput)} className="w-full mt-4 bg-stone-900 text-white p-4 rounded-xl font-bold active:scale-[0.98] transition-all disabled:opacity-50 shadow-md flex justify-center items-center hover:bg-black">{addingService ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить в прайс"}</button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <div className="relative mb-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                        <input value={serviceSearchQuery} onChange={e => setServiceSearchQuery(e.target.value)} placeholder="Поиск по прайсу..." className="w-full bg-white border border-stone-200 shadow-sm rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-800 outline-none focus:ring-2 focus:ring-rose-400/30 transition-all placeholder-stone-400" />
                    </div>

                    <div className="bg-white rounded-[32px] border border-stone-200 shadow-sm p-2">
                        {Object.keys(groupedServices).length === 0 ? <p className="text-center text-stone-400 text-sm py-10 font-bold">Ничего не найдено</p> :
                            (Object.entries(groupedServices) as [string, any[]][]).map(([category, items]) => (
                                <div key={category} className="mb-2 last:mb-0">
                                    <button onClick={() => toggleCategory(category)} className="w-full flex items-center justify-between p-4 rounded-2xl bg-stone-50 hover:bg-stone-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {expandedCategories[category] ? <FolderOpen className="w-5 h-5 text-rose-400" /> : <Folder className="w-5 h-5 text-stone-400" />}
                                            <span className="font-black text-stone-900 text-base">{category}</span>
                                            <span className="bg-white text-stone-500 px-2 py-0.5 rounded-md text-[10px] font-black border border-stone-200">{items.length}</span>
                                        </div>
                                    </button>
                                    {expandedCategories[category] && (
                                        <div className="pl-4 pr-2 py-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                            {items.map(s => (
                                                <div key={s.id} onClick={() => setSelectedService(s)} className="flex items-center justify-between p-3 rounded-xl hover:bg-rose-50 cursor-pointer transition-colors group">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {s.image_urls && s.image_urls[0] ? (
                                                            <img src={s.image_urls[0]} className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0" alt="img" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0"><Briefcase className="w-4 h-4 text-stone-300" /></div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="font-black text-stone-900 text-sm truncate group-hover:text-rose-600 transition-colors">{s.name}</p>
                                                            <p className="text-[10px] text-stone-500 font-bold flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {s.duration} мин {s.employee?.name && `• ${s.employee.name}`}</p>
                                                        </div>
                                                    </div>
                                                    <span className="font-black text-stone-900 bg-white border border-stone-200 px-2.5 py-1.5 rounded-lg text-sm shrink-0 shadow-sm group-hover:border-rose-200">{s.price} ₽</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}
