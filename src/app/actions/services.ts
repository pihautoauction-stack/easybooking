'use server';

import { createClient } from '@/lib/supabase/server';

export async function addService(data: { name: string, category: string, price: number, duration: number, employee_id?: string, image_urls?: string[] }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Не авторизован' };

    try {
        const insertData = { ...data, user_id: user.id };
        const { data: insertedData, error } = await supabase.from('services').insert(insertData).select().single();
        if (error) throw error;

        return { success: true, data: insertedData };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteService(serviceId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Не авторизован' };

    try {
        const { error } = await supabase
            .from('services')
            .delete()
            .eq('id', serviceId)
            .eq('user_id', user.id);

        if (error) throw error;

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function saveServiceMaterials(serviceId: string, materials: { inventory_id: string, default_quantity: number }[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Не авторизован' };

    try {
        // Очищаем старые материалы для этой услуги
        await supabase.from('service_materials').delete().eq('service_id', serviceId);

        // Вставляем новые, если есть
        if (materials.length > 0) {
            const insertData = materials.map(m => ({
                service_id: serviceId,
                inventory_id: m.inventory_id,
                default_quantity: m.default_quantity
            }));
            const { error: insertError } = await supabase.from('service_materials').insert(insertData);
            if (insertError) throw insertError;
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
