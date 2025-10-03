/// <reference types="vite/client" />

declare global {
  // Used to guard duplicate init in dev StrictMode remounts
  // eslint-disable-next-line no-var
  var __APP_INIT__: boolean | undefined;
}

export {};