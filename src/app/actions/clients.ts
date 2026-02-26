'use server';

import { createClient } from '@/lib/supabase/server';

export async function toggleClientBlacklist(clientId: string, currentStatus: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Не авторизован' };

    try {
        const { data: client, error: checkError } = await supabase
            .from('clients')
            .select('id')
            .eq('id', clientId)
            .eq('master_id', user.id)
            .single();

        if (checkError || !client) throw new Error('Клиент не найден или нет доступа');

        await supabase.from('clients').update({ is_blacklisted: !currentStatus }).eq('id', clientId);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function saveClientNote(clientId: string, note: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Не авторизован' };

    try {
        const { data: client, error: checkError } = await supabase
            .from('clients')
            .select('id')
            .eq('id', clientId)
            .eq('master_id', user.id)
            .single();

        if (checkError || !client) throw new Error('Клиент не найден или нет доступа');

        await supabase.from('clients').update({ notes: note }).eq('id', clientId);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateClientTags(clientId: string, tags: string[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Не авторизован' };

    try {
        const { data: client, error: checkError } = await supabase
            .from('clients')
            .select('id')
            .eq('id', clientId)
            .eq('master_id', user.id)
            .single();

        if (checkError || !client) throw new Error('Клиент не найден или нет доступа');

        await supabase.from('clients').update({ tags }).eq('id', clientId);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
