/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // 你可以在这里添加更多自定义环境变量类型
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
} 