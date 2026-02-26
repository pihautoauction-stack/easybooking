-- Создание таблицы для Умного Листа Ожидания (Stage 7)
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    master_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    desired_date DATE NOT NULL,
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Включаем RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Политика: Мастер видит только свой лист ожидания
CREATE POLICY "Masters can view own waitlist" 
ON waitlist FOR SELECT 
USING (auth.uid() = master_id);

-- Политика: Мастер может добавлять в свой лист
CREATE POLICY "Masters can insert into own waitlist" 
ON waitlist FOR INSERT 
WITH CHECK (auth.uid() = master_id);

-- Политика: Мастер может удалять из своего листа
CREATE POLICY "Masters can delete from own waitlist" 
ON waitlist FOR DELETE 
USING (auth.uid() = master_id);

-- Политика: Открытое добавление для клиентов (анонимно)
CREATE POLICY "Anyone can insert to waitlist" 
ON waitlist FOR INSERT 
WITH CHECK (true);
