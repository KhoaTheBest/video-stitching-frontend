export const LEGAL_SLUGS = ['terms', 'privacy', 'refunds'] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];
export const isLegalSlug = (slug: string): slug is LegalSlug => (LEGAL_SLUGS as readonly string[]).includes(slug);
