'use server';

import { createClient } from '@/lib/supabase/server';

export async function addService(data: { name: string, category: string, price: number, duration: number, employee_id?: string, image_urls?: string[] }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Не авторизован' };

    try {
        const insertData = { ...data, user_id: user.id };
        const { error } = await supabase.from('services').insert(insertData);
        if (error) throw error;

        return { success: true };
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
