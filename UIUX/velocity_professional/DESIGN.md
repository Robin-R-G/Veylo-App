---
name: Velocity Professional
colors:
  surface: '#f9f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f9f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e2e4'
  on-surface: '#191c1d'
  on-surface-variant: '#40484b'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#70787c'
  outline-variant: '#c0c8cb'
  surface-tint: '#306576'
  primary: '#003441'
  on-primary: '#ffffff'
  primary-container: '#0f4c5c'
  on-primary-container: '#87bbce'
  inverse-primary: '#9acee1'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#482700'
  on-tertiary: '#ffffff'
  tertiary-container: '#623d13'
  on-tertiary-container: '#dda975'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b6ebfe'
  primary-fixed-dim: '#9acee1'
  on-primary-fixed: '#001f28'
  on-primary-fixed-variant: '#114d5d'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdcbe'
  tertiary-fixed-dim: '#f3bc87'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#643e14'
  background: '#f9f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e2e4'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 60px
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style

This design system is engineered for high-stakes logistics and vehicle management. The brand personality is rooted in **efficiency, reliability, and precision**. It targets fleet managers and logistics coordinators who require a tool that feels like a professional instrument rather than a consumer toy.

The visual style is **Corporate Modern with a focus on Clarity**. It utilizes high-quality whitespace, a disciplined color palette, and subtle depth to organize complex data sets. The aesthetic prioritizes rapid information scanning and functional density, ensuring the UI remains performant even in high-stress operational environments.

## Colors

The palette is anchored by "Deep Teal," a professional and grounding primary shade that conveys stability. 

- **Primary:** Use for key actions, active states, and branding elements.
- **Secondary:** Reserved for supportive UI elements and secondary navigation.
- **Neutrals:** A scale of cool grays provides structure without adding visual noise. Use #F9FAFB for the main canvas to reduce eye strain.
- **Semantic Colors:** These must be used strictly for functional status. Success (Paid/Active), Warning (Pending/Expiring), and Error (Issue/Overdue) are calibrated for high legibility against the light background.

## Typography

The design system utilizes **Inter** for its exceptional legibility and systematic feel. 

- **Hierarchy:** Use bold weights for headlines to create clear entry points into content.
- **Data Density:** Body-sm (14px) is the workhorse for table data and dashboard widgets to maximize information density without sacrificing readability.
- **Responsive Adjustments:** For mobile screens, transition Display-LG to Headline-LG to prevent text wrapping issues. Ensure a minimum touch-target-friendly line height of 24px for all interactive body text.

## Layout & Spacing

This design system uses a strict **4px grid** to ensure mathematical harmony across all components.

- **Desktop Layout:** A fixed 280px vertical sidebar for primary navigation, with a fluid content area. Use a 12-column grid for dashboard widgets.
- **Mobile Layout:** Transition to a 4-column grid with 16px side margins. Primary navigation moves to a persistent bottom tab bar.
- **Spacing Rhythm:** Use `md` (16px) for internal card padding and `lg` (24px) for spacing between major sections. Consistent use of these increments creates a predictable visual rhythm.

## Elevation & Depth

To maintain a premium, clean look, this design system avoids heavy shadows. Instead, it uses **Soft Ambient Shadows** and **Tonal Layering**.

- **Level 0 (Background):** #F9FAFB. No shadow.
- **Level 1 (Cards/Sidebar):** White surface with a 1px border (#E2E8F0) or a very soft shadow: `0px 1px 3px rgba(0,0,0,0.05), 0px 4px 6px rgba(0,0,0,0.02)`.
- **Level 2 (Dropdowns/Modals):** White surface with a more pronounced elevation: `0px 10px 15px -3px rgba(0,0,0,0.1)`.
- **Contrast:** In mobile outdoor views, elevation is reinforced with high-contrast borders (#CBD5E1) to ensure visibility under direct sunlight.

## Shapes

The shape language is **friendly yet professional**. The system uses a standard `rounded-md` (0.5rem/8px) for small components like inputs and buttons, while larger containers like cards and modals use `rounded-lg` (1rem/16px).

- **Standard Radius:** 8px (Buttons, Inputs, Chips).
- **Container Radius:** 12px - 16px (Cards, Modals, Sidebars).
- **Full Radius:** Use for status badges/pills to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Deep Teal background, white text. No border. 8px border-radius.
- **Secondary:** White background, Slate-600 text, 1px Slate-200 border.
- **Ghost:** No background or border. Primary color text. Used for less prominent actions.

### Inputs
- Height: 44px for desktop, 48px for mobile.
- Border: 1px Slate-200. Focus state uses 2px Primary border with a soft blue outer glow.
- Labels: Always visible, 14px Medium weight, placed above the field.

### Cards
- White background, 16px padding, 12px or 16px border-radius.
- Use subtle borders (#F1F5F9) instead of shadows for repeating list items.

### Badges/Pills
- Small (12px text), bold weight. 
- Success: Light green background (#D1FAE5) with Dark green text (#065F46).
- Use for "Paid," "Active," or "On Schedule" statuses.

### Navigation
- **Sidebar:** Dark primary background or clean white with active state indicators (4px vertical bar on the left edge).
- **Bottom Bar (Mobile):** 64px height, blurred background (Glassmorphism), icons with 10px labels.