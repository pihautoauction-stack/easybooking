interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  // Вот эти методы, которых не хватало:
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  showPopup: (params: { title?: string; message: string; buttons?: any[] }) => void;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    // И вот это поле для редиректа:
    start_param?: string;
  };
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}