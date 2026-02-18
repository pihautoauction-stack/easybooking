import PocketBase from 'pocketbase';

// Подключаемся к локальной базе
export const pb = new PocketBase('http://127.0.0.1:8090');

// Глобальная настройка, чтобы PocketBase не сбрасывал авторизацию
pb.autoCancellation(false);