import { Briefcase, Clock, CheckCircle2, Trash2, Plus, X, Camera, Loader2, ChevronLeft, ChevronRight, Search, Folder, FolderOpen, ListTree, Package } from "lucide-react";
import { useState } from "react";
import { useServicesStore } from "@/store/useServicesStore";
import { useInventoryStore } from "@/store/useInventoryStore";
import { useProfileStore } from "@/store/useProfileStore";
import { addService as createServiceData } from "@/app/actions/services";
import { createClient } from "@/lib/supabase/client";
import { useAppActions } from "@/store/actions";

const supabase = createClient();

export default function ServicesTab() {
    const { services, addService } = useServicesStore();
    const { inventory } = useInventoryStore();
    const { employees, role, user } = useProfileStore();
    const { fetchAllData } = useAppActions();

    const [addingService, setAddingService] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState("");
    const [newDuration, setNewDuration] = useState("");
    const [serviceCategorySelect, setServiceCategorySelect] = useState("");
    const [serviceCategoryInput, setServiceCategoryInput] = useState("");
    const [newServiceEmpId, setNewServiceEmpId] = useState("");
    const [newServiceMaterials, setNewServiceMaterials] = useState<any[]>([]);

    const [selectedService, setSelectedService] = useState<any>(null);
    const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);

    const [serviceSearchQuery, setServiceSearchQuery] = useState("");
    const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});

    const existingServiceCategories = Array.from(new Set(services.map(s => s.category).filter(Boolean)));

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

    const handleAddService = async () => {
        const cat = serviceCategorySelect === 'NEW' ? serviceCategoryInput : serviceCategorySelect;
        if (!newName || !newPrice || !cat) return;
        setAddingService(true);
        const result = await createServiceData({
            name: newName,
            price: Number(newPrice),
            duration: newDuration ? Number(newDuration) : 0,
            category: cat,
            employee_id: newServiceEmpId || undefined,
            materials: newServiceMaterials,
        } as any);
        if (result.success && result.data) {
            addService(result.data);
            setNewName(""); setNewPrice(""); setNewDuration("");
            setServiceCategorySelect(""); setServiceCategoryInput("");
            setNewServiceEmpId(""); setNewServiceMaterials([]);
            if (user?.id) await fetchAllData(user.id, true);
        } else {
            alert("Ошибка добавления услуги: " + result.error);
        }
        setAddingService(false);
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, serviceId: string, currentUrls: string[]) => {
        const file = e.target.files?.[0]; if (!file) return; setUploadingImageId(serviceId);
        try {
            const filePath = `${user?.id}/services/${Math.random()}.${file.name.split('.').pop()}`;
            await supabase.storage.from('gallery').upload(filePath, file);
            const { data } = supabase.storage.from('gallery').getPublicUrl(filePath);
            const updatedUrls = [...(currentUrls || []), data.publicUrl];
            await supabase.from('services').update({ image_urls: updatedUrls }).eq('id', serviceId);
            if (selectedService && selectedService.id === serviceId) setSelectedService({ ...selectedService, image_urls: updatedUrls });
            if (user?.id) await fetchAllData(user.id, true);
        } catch (err: any) { alert("Ошибка: " + err.message); } finally { setUploadingImageId(null); }
    };

    const handleRemoveImage = async (serviceId: string, urlToRemove: string, currentUrls: string[]) => {
        if (!confirm("Удалить фото?")) return;
        const updatedUrls = currentUrls.filter(url => url !== urlToRemove);
        await supabase.from('services').update({ image_urls: updatedUrls }).eq('id', serviceId);
        if (selectedService && selectedService.id === serviceId) setSelectedService({ ...selectedService, image_urls: updatedUrls });
        if (user?.id) await fetchAllData(user.id, true);
    };

    const handleUpdateServiceMaterials = async (serviceId: string, materials: any[]) => {
        try {
            const currentIds = materials.map(m => m.inventory_id);
            await supabase.from('service_materials').delete().eq('service_id', serviceId).not('inventory_id', 'in', `(${currentIds.join(',') || '00000000-0000-0000-0000-000000000000'})`);
            for (const mat of materials) {
                const { error } = await supabase.from('service_materials').upsert({ service_id: serviceId, inventory_id: mat.inventory_id, default_quantity: mat.default_quantity }, { onConflict: 'service_id,inventory_id' });
                if (error) console.error("Error upserting material:", error);
            }
            if (selectedService && selectedService.id === serviceId) setSelectedService({ ...selectedService, materials });
            if (user?.id) await fetchAllData(user.id, true);
        } catch (err: any) { alert("Ошибка: " + err.message); }
    };

    const handleDeleteService = async (id: string) => {
        if (!confirm("Удалить эту услугу?")) return;
        await supabase.from("services").delete().eq("id", id);
        if (user?.id) await fetchAllData(user.id, true);
        setSelectedService(null);
    };

    const filteredServices = services.filter((s: any) => {
        const q = serviceSearchQuery.toLowerCase();
        return (
            s.name?.toLowerCase().includes(q) ||
            s.category?.toLowerCase().includes(q)
        );
    });

    const groupedServices = filteredServices.reduce((acc: any, service: any) => {
        const cat = service.category || 'Без категории';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(service);
        return acc;
    }, {});


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
                                    <option value="" disabled>Выберите папку</option>
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
                                <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 text-sm font-black">₽</span><input value={newPrice} onChange={e => setNewPrice(e.target.value)} type="number" placeholder="Цена" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 pl-10 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800 transition-all font-sans" /></div>
                            </div>

                            <div className="mt-4 border-t border-stone-100 pt-4">
                                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1 flex items-center gap-2 mb-2"><Package className="w-3 h-3" /> Техкарта (Расходники)</label>
                                {inventory && inventory.length > 0 ? (
                                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                                        <select
                                            onChange={(e) => { handleAddMaterialToNewService(e.target.value); e.target.value = ""; }}
                                            className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800 appearance-none cursor-pointer shadow-sm mb-3"
                                            value=""
                                        >
                                            <option value="" disabled>+ Добавить материал...</option>
                                            {inventory.map((item: any) => (
                                                <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                                            ))}
                                        </select>

                                        {newServiceMaterials.length > 0 && (
                                            <div className="space-y-2">
                                                {newServiceMaterials.map((mat: any) => {
                                                    const invItem = inventory.find((i: any) => i.id === mat.inventory_id);
                                                    if (!invItem) return null;
                                                    return (
                                                        <div key={mat.inventory_id} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-stone-100 justify-between shadow-sm">
                                                            <span className="text-xs font-bold text-stone-700 truncate pl-1">{invItem.name}</span>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <input
                                                                    type="number"
                                                                    min="0.1"
                                                                    step="any"
                                                                    value={mat.default_quantity}
                                                                    onChange={(e) => handleUpdateMaterialQuantity(mat.inventory_id, Number(e.target.value))}
                                                                    className="w-16 bg-stone-50 border border-stone-200 rounded-lg p-1.5 text-xs text-center font-bold outline-none focus:border-rose-300"
                                                                />
                                                                <span className="text-[10px] text-stone-500 font-bold w-4">{invItem.unit}</span>
                                                                <button onClick={() => handleRemoveMaterialFromNewService(mat.inventory_id)} className="p-1.5 bg-rose-50 rounded-lg text-rose-500 hover:bg-rose-100 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-6 bg-stone-50 border border-stone-200 rounded-2xl border-dashed">
                                        <Package className="w-6 h-6 text-stone-300 mb-2" />
                                        <p className="text-xs text-stone-600 font-bold text-center">Склад пуст</p>
                                        <p className="text-[10px] text-stone-400 font-medium text-center mt-0.5">Добавьте материалы в модуле Склад.</p>
                                    </div>
                                )}
                            </div>

                            <button onClick={handleAddService} disabled={addingService || !newName || !newPrice || (serviceCategorySelect === 'NEW' && !serviceCategoryInput) || !serviceCategorySelect} className="w-full mt-4 bg-stone-900 text-white p-4 rounded-xl font-bold active:scale-[0.98] transition-all disabled:opacity-50 shadow-md flex justify-center items-center hover:bg-black">{addingService ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить в прайс"}</button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <div className="relative mb-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                        <input value={serviceSearchQuery} onChange={e => setServiceSearchQuery(e.target.value)} placeholder="Поиск по прайсу..." className="w-full bg-white border border-stone-200 shadow-sm rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-800 outline-none focus:ring-2 focus:ring-rose-400/30 transition-all placeholder-stone-400" />
                    </div>

                    <div className="bg-white rounded-[32px] border border-stone-200 shadow-sm p-2">
                        {Object.keys(groupedServices).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-stone-50 border border-stone-200 rounded-[28px] border-dashed m-2">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                                    <ListTree className="w-8 h-8 text-stone-300" />
                                </div>
                                <p className="text-stone-900 font-black text-lg mb-1">Ничего не найдено</p>
                                <p className="text-stone-500 font-bold text-sm text-center max-w-sm">Добавьте новую услугу для отображения в прайсе.</p>
                            </div>
                        ) :
                            Object.entries(groupedServices).map(([category, items]: [string, any]) => (
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
                                            {items.map((s: any) => (
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

                {/* 2. РЕДАКТИРОВАНИЕ УСЛУГИ */}
                {selectedService && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedService(null)}>
                        <div className="bg-white p-6 md:p-8 rounded-[32px] w-full max-w-md shadow-2xl relative border border-stone-200" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setSelectedService(null)} className="absolute top-6 right-6 text-stone-400 hover:text-stone-800 bg-stone-50 p-2.5 rounded-full"><X className="w-5 h-5" /></button>
                            <h2 className="text-xl font-black mb-6 text-stone-900 leading-tight pr-10">{selectedService.name}</h2>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-stone-50 border border-stone-100 p-3 rounded-2xl"><p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-0.5">Категория</p><p className="text-sm font-black text-stone-800">{selectedService.category}</p></div>
                                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl"><p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-0.5">Цена работы</p><p className="text-sm font-black text-emerald-700">{selectedService.price} ₽</p></div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1 mb-2 block">Иллюстрации услуги</label>
                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                                        {selectedService.image_urls && selectedService.image_urls.map((url: string, idx: number) => (
                                            <div key={idx} className="relative shrink-0 snap-center">
                                                <img src={url} alt="Услуга" className="w-24 h-24 object-cover rounded-xl shadow-sm border border-stone-200" />
                                                <button onClick={() => handleRemoveImage(selectedService.id, url, selectedService.image_urls)} className="absolute -top-2 -right-2 bg-white text-rose-500 rounded-full p-1.5 shadow-md border border-rose-100 hover:bg-rose-50"><X className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                        <label className="shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-rose-200 bg-rose-50/50 hover:bg-rose-50 flex flex-col items-center justify-center cursor-pointer transition-all">
                                            {uploadingImageId === selectedService.id ? <Loader2 className="w-5 h-5 animate-spin text-rose-400" /> : <Plus className="w-6 h-6 text-rose-400" />}
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadImage(e, selectedService.id, selectedService.image_urls || [])} />
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1 mb-2 block flex items-center gap-2"><Package className="w-3 h-3" /> Техкарта (Расходники)</label>
                                    {inventory && inventory.length > 0 ? (
                                        <div className="space-y-2">
                                            <select
                                                onChange={async (e) => {
                                                    const invId = e.target.value; e.target.value = ""; if (!invId) return;
                                                    const currentMaterials = selectedService.materials || [];
                                                    if (currentMaterials.find((m: any) => m.inventory_id === invId)) return;
                                                    await handleUpdateServiceMaterials(selectedService.id, [...currentMaterials, { inventory_id: invId, default_quantity: 1 }]);
                                                }}
                                                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800 appearance-none cursor-pointer"
                                                value=""
                                            >
                                                <option value="" disabled>+ Добавить материал...</option>
                                                {inventory.map((item: any) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
                                            </select>

                                            {(selectedService.materials || []).length > 0 && (
                                                <div className="space-y-2 mt-2">
                                                    {selectedService.materials.map((mat: any) => {
                                                        const invItem = inventory.find((i: any) => i.id === mat.inventory_id);
                                                        if (!invItem) return null;
                                                        return (
                                                            <div key={mat.inventory_id} className="flex items-center gap-2 bg-rose-50/50 p-2 rounded-xl border border-rose-100 justify-between">
                                                                <span className="text-xs font-bold text-stone-700 truncate">{invItem.name}</span>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <input
                                                                        type="number" min="0.1" step="any"
                                                                        value={mat.default_quantity}
                                                                        onBlur={async (e) => {
                                                                            const qty = Number(e.target.value);
                                                                            if (qty > 0 && qty !== mat.default_quantity) {
                                                                                const updated = selectedService.materials.map((m: any) => m.inventory_id === mat.inventory_id ? { ...m, default_quantity: qty } : m);
                                                                                await handleUpdateServiceMaterials(selectedService.id, updated);
                                                                            }
                                                                        }}
                                                                        onChange={(e) => {
                                                                            const updated = selectedService.materials.map((m: any) => m.inventory_id === mat.inventory_id ? { ...m, default_quantity: Number(e.target.value) } : m);
                                                                            setSelectedService({ ...selectedService, materials: updated });
                                                                        }}
                                                                        className="w-16 bg-white border border-stone-200 rounded-lg p-1.5 text-xs text-center font-bold outline-none"
                                                                    />
                                                                    <span className="text-[10px] text-stone-500 font-bold w-4">{invItem.unit}</span>
                                                                    <button onClick={() => {
                                                                        const updated = selectedService.materials.filter((m: any) => m.inventory_id !== mat.inventory_id);
                                                                        handleUpdateServiceMaterials(selectedService.id, updated);
                                                                    }} className="p-1 hover:bg-white rounded-md text-stone-400 hover:text-rose-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-stone-400 font-bold bg-stone-50 p-3 rounded-xl border border-stone-100 italic">Склад пуст. Добавьте материалы.</p>
                                    )}
                                </div>

                                <button onClick={() => handleDeleteService(selectedService.id)} className="w-full bg-white text-rose-500 border border-rose-200 font-bold py-3.5 rounded-xl hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Удалить услугу</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
