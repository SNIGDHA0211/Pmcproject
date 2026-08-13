/**
 * Public-facing portfolio highlights for the marketing landing page.
 * Only non-confidential fields — no contract values, client contacts, or internal IDs.
 */
export type LandingProjectHighlight = {
  /** Canonical name from the PMC portfolio */
  title: string;
  /** City / region for quick context */
  location: string;
  /** One-line public scope (no commercial or private detail) */
  scope: string;
  /** Construction photography — generic site imagery only */
  image: string;
  imagePosition?: string;
};

/** Five representative Shrikhande PMC civil projects for the landing gallery. */
export const LANDING_PROJECT_HIGHLIGHTS: readonly LandingProjectHighlight[] = [
  {
    title: 'Satis Thane',
    location: 'Thane, Maharashtra',
    scope: 'PMC supervision for residential development — schedule, quality, and site coordination.',
    image: '/images/construction-skyline.jpg',
    imagePosition: 'center 40%',
  },
  {
    title: 'K2 Building – Kalbadevi (MMRCL)',
    location: 'Mumbai, Maharashtra',
    scope: 'Metro-related commercial building — civil works PMC with MMRCL interface coordination.',
    image: '/images/construction-crane-b.jpg',
    imagePosition: 'center 30%',
  },
  {
    title: 'B3482 RGSL: Rajeev Gandhi Sea Link',
    location: 'Mumbai, Maharashtra',
    scope: 'Operations and maintenance supervision on a major sea-link corridor.',
    image: '/images/construction-panorama-bg.png',
    imagePosition: 'center 45%',
  },
  {
    title: 'KBR Park -I Flyover – Hyderabad (GHMC)',
    location: 'Hyderabad, Telangana',
    scope: 'Urban flyover package — PMC for construction quality, safety, and progress reporting.',
    image: '/images/construction-cranes-bg.jpg',
    imagePosition: 'center 35%',
  },
  {
    title: 'Nongstoin-Rambrai Road, Meghalaya (NHIDCL)',
    location: 'Meghalaya',
    scope: 'Highway improvement under NHIDCL — road works supervision across hilly terrain.',
    image: '/images/construction-bg.jpg',
    imagePosition: 'center 50%',
  },
] as const;
