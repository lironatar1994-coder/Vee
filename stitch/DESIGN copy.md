---
name: Professional Precision
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#4b41e1'
  on-secondary: '#ffffff'
  secondary-container: '#645efb'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002113'
  on-tertiary-container: '#009668'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#0f0069'
  on-secondary-fixed-variant: '#3323cc'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h1:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.015em
  h2:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  body-sm:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Manrope
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter: 16px
  element-gap-sm: 8px
  element-gap-md: 16px
  element-gap-lg: 32px
---

## Brand & Style
This design system is engineered for high-stakes enterprise environments where clarity, speed, and reliability are paramount. The aesthetic is rooted in **Modern Corporate Minimalism**—a style that prioritizes functional density and structural integrity over decorative flair.

The UI should evoke a sense of "quiet power." It is designed for an expert audience that requires a high-performance tool that stays out of the way while providing total control. Every element is deliberate, using precise geometry and a restrained palette to communicate a premium, authoritative experience. The goal is to create a digital workspace that feels like a finely tuned instrument.

## Colors
The palette is anchored by **Deep Navy**, used for primary navigation and high-level structural elements to provide a sense of stability. **Clean White** serves as the primary canvas, ensuring maximum legibility and a sense of "breathable" density.

**Indigo** is utilized as the primary action color, signaling interactivity with precision. **Emerald** is reserved for success states, growth indicators, and "go-live" functions, providing a sharp contrast to the navy. Neutrals are strictly cool-toned to maintain a crisp, professional atmosphere. High-contrast text ensures accessibility without sacrificing the sophisticated, dark-on-light aesthetic.

## Typography
The design system utilizes **Manrope** for its unique balance of geometric modernism and functional readability. The typeface is exceptionally crisp at small sizes, which is critical for high-density data views.

Headlines use a tighter letter-spacing and heavier weights to project authority. The core body text is set at 14px to maximize information density while maintaining a comfortable reading rhythm. For metadata and utility labels, a specialized "Label Caps" style is used to provide visual hierarchy without increasing font size, keeping the layout compact and professional.

## Layout & Spacing
The layout follows a **Rigid 8pt Grid System**, subdivided into 4px increments for micro-adjustments. This ensures a mathematical precision in the alignment of all components.

The system uses a **Hybrid Fluid Grid**: 
- Sidebars and utility panels are fixed-width to ensure consistent tool access.
- Content areas are fluid but utilize "Max-Width Constraints" for data tables and forms to prevent excessive line lengths. 
- High information density is achieved by reducing vertical padding in lists and tables, allowing more data points to be visible above the fold without creating visual clutter.

## Elevation & Depth
Depth is conveyed through **Tonal Layering** and **Low-Contrast Outlines** rather than heavy shadows. This maintains the "Pro" aesthetic by keeping the interface flat and efficient.

- **Level 0 (Surface):** The main background using the neutral off-white.
- **Level 1 (Card/Container):** Pure white surfaces with a 1px subtle border (`#E2E8F0`).
- **Level 2 (Overlay):** Used for menus and dropdowns, featuring a very soft, diffused ambient shadow (8% opacity Navy) and a slightly darker border to separate it from the surface.
- **Backdrop Blurs:** Used sparingly for modal overlays to maintain context while focusing attention.

## Shapes
The shape language is defined by **Soft Precision**. A standard radius of 4px (Soft) is applied to buttons, input fields, and small containers. This slight rounding takes the "edge" off the industrial look while remaining significantly more professional and space-efficient than pill-shaped or highly rounded alternatives.

Larger components like cards or modals may scale to 8px, but never beyond. This consistency reinforces the "reliable" and "systematic" nature of the design system.

## Components
- **Buttons:** Primary buttons are solid Deep Navy or Indigo with 13px bold text. Ghost buttons use subtle borders and are preferred for secondary actions to keep the UI clean.
- **Input Fields:** Feature a 1px border that shifts to Indigo on focus. Labels are always positioned above the input in the "body-sm" or "label-caps" style for clarity.
- **Data Tables:** The heart of the system. They feature zero horizontal borders; only subtle vertical dividers or alternate row striping. Row height is compact (32px or 40px) to maximize data density.
- **Chips:** Small, rectangular indicators with 2px radius. They use light tinted backgrounds with dark text (e.g., light emerald background with deep emerald text) for status updates.
- **Status Indicators:** Use the Emerald accent for "Active/Healthy" and Navy for "Idle," ensuring a clear, non-alarming operational view.
- **Cards:** Used for dashboard modules, they have no shadow by default, relying on the 1px `#E2E8F0` border for definition.