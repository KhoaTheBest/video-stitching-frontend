import type { ExportLimits } from '../engine/plan';

/** Product name used in the UI, the watermark and page titles. Change it in one place. */
export const APP_NAME = 'Stitcher';

export const FREE_LIMITS: ExportLimits = { maxSegments: 5, maxOutputSeconds: 60, maxShortSide: 720 };
export const PRO_LIMITS: ExportLimits = { maxSegments: Infinity, maxOutputSeconds: 30 * 60, maxShortSide: 1080 };
export const FREE_WATERMARK = `Made with ${APP_NAME}`;

export type PaidPlanId = 'monthly' | 'yearly' | 'lifetime';

export interface PaidPlan {
  id: PaidPlanId;
  name: string;
  /** Display price, e.g. "$9". Set through env so prices never live in code. */
  price: string;
  cadence: string;
  /** Lemon Squeezy checkout link. Empty until configured, which disables the button. */
  checkoutUrl: string;
}

const env = import.meta.env;

export const PAID_PLANS: PaidPlan[] = [
  {
    id: 'monthly',
    name: 'Pro monthly',
    price: env.VITE_PRICE_MONTHLY ?? '',
    cadence: 'per month',
    checkoutUrl: env.VITE_LS_CHECKOUT_MONTHLY ?? '',
  },
  {
    id: 'yearly',
    name: 'Pro yearly',
    price: env.VITE_PRICE_YEARLY ?? '',
    cadence: 'per year',
    checkoutUrl: env.VITE_LS_CHECKOUT_YEARLY ?? '',
  },
  {
    id: 'lifetime',
    name: 'Pro lifetime',
    price: env.VITE_PRICE_LIFETIME ?? '',
    cadence: 'one payment',
    checkoutUrl: env.VITE_LS_CHECKOUT_LIFETIME ?? '',
  },
];

export const SUPPORT_EMAIL: string = env.VITE_SUPPORT_EMAIL ?? '';
