// Brand tokens. Fill this from a brand profile (see the skill's profiles/). Scenes read colours
// and fonts only from here, so a re-brand is one file.

export interface FontFile { url: string; weight?: string; style?: string; stretch?: string; unicodeRange?: string }
export interface FontSpec { family: string; files: FontFile[]; fallback: string }

// Perko: profiles/local/perko.md (lime, ink, warm off-white, Heebo). Fonts are the site's own (Heebo, OFL).
const HE = 'U+0590-05FF, U+200C-2010, U+20AA, U+25CC, U+FB1D-FB4F';
const heebo = (w: string) => [
  { url: `fonts/heebo-hebrew-${w}-normal.woff2`, weight: w, unicodeRange: HE },
  { url: `fonts/heebo-latin-${w}-normal.woff2`, weight: w },
];
export const brand = {
  name: 'perko',
  tagline: 'כל ההטבות. מקום אחד.',
  cta: 'הצטרפו בחינם',
  url: 'getperko.com',
  logo: null as string | null,
  colors: {
    bg: '#F8F8F4', // warm off-white: the ground of this piece
    bg2: '#EBECE4', // the street, raised panels
    ink: '#11130F', // type, doors, the card
    muted: '#303626', // secondary type
    accent: '#D7FF35', // acid lime: the only thing that glows (the open spots, the punched hole)
    accent2: '#BCE82D',
  },
  gradient: [] as string[],
  fonts: {
    display: { family: 'Perko Display', files: [...heebo('800'), ...heebo('900')], fallback: 'Arial, sans-serif' } as FontSpec,
    body: { family: 'Perko Body', files: [...heebo('500'), ...heebo('700')], fallback: 'Arial, sans-serif' } as FontSpec,
    mono: { family: 'Perko Mono', files: [{ url: 'fonts/jetbrains-mono-latin-500-normal.woff2', weight: '500' }, { url: 'fonts/heebo-hebrew-500-normal.woff2', weight: '500', unicodeRange: HE }], fallback: 'monospace' } as FontSpec,
  },
};

export type ColorKey = keyof typeof brand.colors;
