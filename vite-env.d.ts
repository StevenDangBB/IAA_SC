
interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Augment NodeJS namespace to ensure process.env.API_KEY is recognized
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY?: string;
    [key: string]: any;
  }
}
