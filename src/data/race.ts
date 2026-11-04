// The race for the golden card: one place for the facts every page and the API agree on.
export const race = {
  instagram: 'getperko',
  // Opens a DM to Perko with the inviter's code; the DM tool reads it as the ref payload "r_<code>".
  joinUrl: (code?: string) => `https://ig.me/m/getperko${code ? `?ref=r_${code}` : ''}`,
  postUrl: 'https://www.instagram.com/getperko/',
  stamps: 10,
  keyword: 'אני בפנים',
};
