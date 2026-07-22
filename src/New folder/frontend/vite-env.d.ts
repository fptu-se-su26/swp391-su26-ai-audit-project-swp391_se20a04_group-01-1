/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}