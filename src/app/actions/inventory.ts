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

        // 2. Валидация остатков (Защита от списания в минус)
        const requestedQtys: Record<string, number> = {};
        const allItems = [
            ...(usedMaterials || []).map((m) => ({ ...m, type: 'appointment_usage' as const })),
            ...(soldItems || []).map((m) => ({ ...m, type: 'retail_sale' as const }))
        ];

        for (const reqItem of allItems) {
            if (!reqItem.id || reqItem.qty <= 0) continue;
            requestedQtys[reqItem.id] = (requestedQtys[reqItem.id] || 0) + reqItem.qty;
        }

        for (const itemId of Object.keys(requestedQtys)) {
            const reqQty = requestedQtys[itemId];
            const { data: invItem } = await supabase.from('inventory').select('name, quantity, unit').eq('id', itemId).single();
            if (invItem && invItem.quantity < reqQty) {
                return { success: false, error: `Недостаточно позиций: "${invItem.name}". На складе: ${invItem.quantity} ${invItem.unit}. Требуется: ${reqQty} ${invItem.unit}.` };
            }
        }

        // 3. Process materials
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

export async function fetchInventoryDocuments(userId: string) {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('inventory_documents')
            .select('*, transactions:inventory_transactions(*, inventory:inventory(name, unit, sku, category))')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, documents: data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function processInventoryDocument(
    type: 'receipt' | 'write_off' | 'inventory_check',
    totalAmount: number,
    notes: string,
    items: { id: string; change_amount: number; cost_price?: number }[]
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Не авторизован' };

    try {
        // 1. Создание документа
        const { data: doc, error: docError } = await supabase
            .from('inventory_documents')
            .insert({
                user_id: user.id,
                type,
                status: 'completed',
                total_amount: totalAmount,
                notes
            })
            .select()
            .single();

        if (docError || !doc) throw new Error('Ошибка создания документа: ' + docError?.message);

        // 2. Обработка позиций документа и обновление инвентаря
        for (const item of items) {
            if (item.change_amount === 0) continue;

            const { data: invItem } = await supabase.from('inventory').select('*').eq('id', item.id).single();
            if (!invItem || invItem.user_id !== user.id) continue;

            // Для прихода (receipt) можно обновлять цену закупки
            const updates: any = { quantity: invItem.quantity + item.change_amount };
            if (type === 'receipt' && item.cost_price !== undefined && item.cost_price > 0) {
                updates.cost_price = item.cost_price;
            }

            await supabase.from('inventory').update(updates).eq('id', item.id);

            // Тип транзакции простая конвертация в плюс или минус
            const txType = item.change_amount > 0 ? 'manual_add' : 'manual_deduct';

            await supabase.from('inventory_transactions').insert({
                inventory_id: item.id,
                user_id: user.id,
                change_amount: item.change_amount,
                type: txType,
                document_id: doc.id
            });
        }

        return { success: true, document: doc };
    } catch (err: any) {
        console.error("Doc Processing Error:", err);
        return { success: false, error: err.message };
    }
}

