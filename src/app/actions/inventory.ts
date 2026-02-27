'use server';

import { createClient } from '@/lib/supabase/server';

export async function completeAppointment(
    appointmentId: string,
    usedMaterials: { id: string; qty: number }[],
    soldItems: { id: string; qty: number }[] = []
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'Не авторизован' };
    }

    try {
        // 1. Fetch appointment details
        const { data: app, error: appError } = await supabase
            .from('appointments')
            .select('*, service:services(*)')
            .eq('id', appointmentId)
            .single();

        if (appError || !app) throw new Error('Запись не найдена');
        if (app.master_id !== user.id) throw new Error('Нет доступа');

        // 2. Process materials
        let totalCost = 0;
        let totalRetail = 0;

        // Вспомогательная функция для списания
        const processItems = async (items: { id: string; qty: number }[], type: 'appointment_usage' | 'retail_sale') => {
            for (const itemData of items) {
                if (itemData.id && itemData.qty > 0) {
                    const { data: item, error: invError } = await supabase
                        .from('inventory')
                        .select('*')
                        .eq('id', itemData.id)
                        .single();

                    if (invError || !item) continue;
                    if (item.user_id !== user.id) continue;

                    totalCost += item.cost_price * itemData.qty;
                    if (type === 'retail_sale') {
                        // Для расхода розничная цена = 0 (уже вкл. в цену услуги), для ритейла = розничная цена
                        totalRetail += (item.retail_price || item.cost_price) * itemData.qty;
                    }

                    const newQty = item.quantity - itemData.qty;
                    await supabase.from('inventory').update({ quantity: newQty }).eq('id', item.id);

                    await supabase.from('inventory_transactions').insert({
                        inventory_id: item.id,
                        user_id: user.id,
                        appointment_id: app.id,
                        change_amount: -itemData.qty,
                        type: type
                    });
                }
            }
        };

        // Обрабатываем расходники (идут только в себестоимость)
        await processItems(usedMaterials, 'appointment_usage');
        // Обрабатываем продажи (идут в себестоимость + выручку)
        await processItems(soldItems, 'retail_sale');

        // 3. Update appointment
        await supabase.from('appointments').update({
            status: 'completed',
            materials_cost: totalCost,
            materials_retail: totalRetail
        }).eq('id', app.id);

        // 4. Update client
        let targetClientId = app.client_id;
        if (!targetClientId && app.client_phone) {
            const { data: existingClient } = await supabase
                .from('clients')
                .select('id, visits_count, total_revenue')
                .eq('master_id', user.id)
                .eq('phone', app.client_phone)
                .maybeSingle();
            if (existingClient) targetClientId = existingClient.id;
        }

        const baseServicePrice = Number(app.service?.price || 0);
        const finalClientPrice = baseServicePrice + totalRetail;

        if (targetClientId) {
            const { data: client } = await supabase.from('clients').select('*').eq('id', targetClientId).single();
            if (client) {
                await supabase.from('clients').update({
                    visits_count: client.visits_count + 1,
                    total_revenue: Number(client.total_revenue) + finalClientPrice
                }).eq('id', targetClientId);
            }
        } else if (app.client_phone) {
            await supabase.from('clients').insert({
                master_id: user.id,
                name: app.client_name,
                phone: app.client_phone,
                visits_count: 1,
                total_revenue: finalClientPrice,
                is_blacklisted: false,
                notes: ""
            });
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function adjustInventoryStock(itemId: string, amount: number, type: 'add' | 'deduct') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Не авторизован' };

    try {
        const { data: item, error } = await supabase.from('inventory').select('*').eq('id', itemId).single();
        if (error || !item) throw new Error('Товар не найден');
        if (item.user_id !== user.id) throw new Error('Нет доступа');

        const newQty = type === 'add' ? item.quantity + amount : item.quantity - amount;

        await supabase.from('inventory').update({ quantity: newQty }).eq('id', item.id);

        await supabase.from('inventory_transactions').insert({
            inventory_id: item.id,
            user_id: user.id,
            change_amount: type === 'add' ? amount : -amount,
            type: type === 'add' ? 'manual_add' : 'manual_deduct'
        });

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
