// HS Creations Brand Theme Tokens
// Derived from HS Creations String Art Machine Design

export const HS_THEME = {
  colors: {
    // Primary Brand Gold
    primaryGold: '#e5c044',
    primaryGoldHover: '#d4ae33',
    primaryGoldLight: '#f5dc78',
    goldGlow: 'rgba(229, 192, 68, 0.25)',

    // Dark Surfaces
    black: '#0a0a0a',
    headerBlack: '#000000',
    darkTeal: '#112826',
    darkTealSurface: '#163330',
    darkTealBorder: '#234a45',
    darkTealInput: '#0d211f',

    // Warm Backgrounds
    creamBg: '#f3efe8',
    creamCard: '#faf7f2',

    // Text Colors
    textWhite: '#ffffff',
    textDark: '#0e1f1c',
    textMuted: '#576b65',
    textMutedLight: '#8da69f',
    textGold: '#e5c044',

    // Feedback
    errorBg: 'rgba(239, 68, 68, 0.15)',
    errorBorder: 'rgba(239, 68, 68, 0.45)',
    errorText: '#fca5a5',
  },
  borderRadius: {
    pill: '9999px',
    card: '20px',
    input: '12px',
    badge: '8px',
  },
} as const;

export default HS_THEME;
