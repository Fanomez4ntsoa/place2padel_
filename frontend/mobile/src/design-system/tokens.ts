/**
 * Tokens espacement / radius / shadows — en miroir de Tailwind + index.css Emergent.
 * Utilisés par les composants atomiques quand NativeWind ne suffit pas (ex: elevation natif).
 */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16, // rounded-2xl (boutons)
  xl: 24, // rounded-3xl (cards) — --radius: 1rem dans index.css = 16, mais cards web sont rounded-3xl.
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/**
 * Shadow card Emergent : 0 8px 30px rgb(0,0,0,0.04). Équivalent RN elevation ~2 Android + iOS shadow.
 */
export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 30,
    elevation: 2,
  },
} as const;

export const durations = {
  /** Page transition Emergent : pageIn 0.4s ease-out. */
  page: 400,
  fast: 200,
} as const;
