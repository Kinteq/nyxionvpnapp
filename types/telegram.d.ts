declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        openLink: (url: string) => void;
        openTelegramLink: (url: string) => void;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
        };
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        showPopup: (params: {
          title: string;
          message: string;
          buttons: Array<{ type: string; text?: string }>;
        }) => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          onClick: (callback: () => void) => void;
        };
      };
    };
  }
}

export {};
