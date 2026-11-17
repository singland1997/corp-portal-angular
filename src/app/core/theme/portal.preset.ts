import { definePreset } from '@primeuix/themes';
import { AuraPreset } from './aura.preset';

import { PORTAL_COLORS } from './portal-colors';

/** Single source for component styling and the Tailwind color aliases. */
export const PortalPreset = definePreset(AuraPreset, {
  primitive: {
    borderRadius: { none: '0', xs: '4px', sm: '6px', md: '8px', lg: '12px', xl: '16px' },
  },
  components: {
    card: {
      root: { borderRadius: '12px', shadow: 'none' },
      title: { fontSize: '1rem', fontWeight: '600' },
    },
    tag: {
      root: { fontSize: '0.75rem', fontWeight: '500', borderRadius: '6px' },
      colorScheme: { light: { info: { background: '{primary.100}', color: '{primary.800}' } } },
    },
    button: { root: { borderRadius: '8px', paddingY: '0.625rem', label: { fontWeight: '600' } } },
  },
  semantic: {
    primary: {
      50: '#fefce8',
      100: PORTAL_COLORS.primarySoft,
      200: '#fef08a',
      300: '#fde047',
      400: PORTAL_COLORS.primary,
      500: PORTAL_COLORS.primaryHover,
      600: PORTAL_COLORS.primaryActive,
      700: PORTAL_COLORS.primaryFocus,
      800: '#854d0e',
      900: '#713f12',
      950: '#422006',
    },
    focusRing: { width: '2px', style: 'solid', color: PORTAL_COLORS.primaryFocus, offset: '3px' },
    formField: { borderRadius: '8px', paddingX: '0.875rem', paddingY: '0.625rem' },
    colorScheme: {
      light: {
        primary: {
          color: PORTAL_COLORS.primary,
          contrastColor: PORTAL_COLORS.text,
          hoverColor: PORTAL_COLORS.primaryHover,
          activeColor: PORTAL_COLORS.primaryActive,
        },
        highlight: {
          background: PORTAL_COLORS.primarySoft,
          focusBackground: '#fef08a',
          color: PORTAL_COLORS.text,
          focusColor: PORTAL_COLORS.text,
        },
        surface: {
          0: PORTAL_COLORS.surface,
          50: PORTAL_COLORS.canvas,
          100: PORTAL_COLORS.subtle,
          200: PORTAL_COLORS.border,
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: PORTAL_COLORS.muted,
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: PORTAL_COLORS.text,
          950: '#09090b',
        },
      },
    },
  },
});
