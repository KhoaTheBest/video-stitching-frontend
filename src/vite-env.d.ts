/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRICE_MONTHLY?: string;
  readonly VITE_PRICE_YEARLY?: string;
  readonly VITE_PRICE_LIFETIME?: string;
  readonly VITE_LS_CHECKOUT_MONTHLY?: string;
  readonly VITE_LS_CHECKOUT_YEARLY?: string;
  readonly VITE_LS_CHECKOUT_LIFETIME?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
}
