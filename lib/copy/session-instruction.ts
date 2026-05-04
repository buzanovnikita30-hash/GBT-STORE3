/** Публичная ссылка для получения JSON сессии ChatGPT (копируемая клиентом). */
export const CHATGPT_SESSION_URL = "https://chatgpt.com/api/auth/session" as const;

export const SESSION_INSTRUCTION_STEPS: string[] = [
  "Включите VPN, если ChatGPT не открывается.",
  "Авторизуйтесь в браузере в аккаунт ChatGPT, на который нужно подключить подписку.",
  "Скопируйте ссылку ниже, вставьте её в адресную строку браузера и перейдите по ней.",
  "Скопируйте всё содержимое открывшейся страницы и отправьте его в чат сайта GPT STORE.",
];
