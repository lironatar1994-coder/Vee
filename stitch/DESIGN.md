# Design System Strategy: The Tactile Taskmaster

## 1. Overview & Creative North Star
The core objective of this design system is to transform the utilitarian nature of task management into a high-end, editorial experience. We are moving away from the "software-as-a-tool" aesthetic toward "software-as-a-sanctuary."

**Creative North Star: "The Modern Atelier"**
Inspired by the quiet focus of a physical workshop and the tactile quality of premium heavy-stock paper, this system prioritizes calm over clutter. We break the traditional "digital grid" through **intentional negative space** and **tonal layering**. By eliminating harsh dividers and embracing a sophisticated off-white palette, we create a sense of focus that feels organic rather than mechanical.

---

## 2. Colors: Tonal Architecture
We use color not just for branding, but for spatial orientation. Our palette is anchored by a Deep Blue (`primary: #0f426f`) that feels authoritative yet serene.

### The "No-Line" Rule
**Prohibition:** 1px solid borders (`#CCCCCC` or similar) are strictly forbidden for sectioning. 
**Execution:** Boundaries must be defined by shifts in background tokens. 
- The Sidebar uses `surface_container` (`#efeeec`).
- The Main Content Area uses `surface` (`#faf9f7`).
- Active items use `secondary_container` (`#d1e1f8`) with no border.

### Surface Hierarchy & Nesting
Treat the UI as a physical desk. 
1. **Base Layer:** `surface` (#faf9f7) – The "Paper" background.
2. **Nesting (Lowered):** Use `surface_container_low` (#f4f3f1) for secondary modules or search bars.
3. **Nesting (Raised):** Use `surface_container_lowest` (#ffffff) for floating cards to create a subtle "lift."

### Glass & Gradient Rule
To prevent the UI from feeling "flat" or "cheap," floating menus and modals must use **Glassmorphism**:
- **Background:** `surface` at 80% opacity.
- **Effect:** `backdrop-blur: 12px`.
- **Signature Touch:** Primary buttons should utilize a subtle linear gradient from `primary` (#0f426f) to `primary_container` (#2e5a88) at a 135-degree angle to add depth and "soul."

---

## 3. Typography: The Editorial Voice
We use two distinct typefaces to create an authoritative hierarchy.

*   **Display & Headlines (Manrope):** Chosen for its geometric precision. Use `display-md` for empty states and `headline-sm` for project titles. The wide tracking and generous line height evoke a premium magazine layout.
*   **Body & Labels (Inter):** The workhorse. Inter’s tall x-height ensures that even at `body-sm` (0.75rem), task names remain legible.
*   **Hierarchy as Identity:** By using `title-lg` for task headers and `label-md` for metadata (dates/tags), we create a clear path for the eye, reducing cognitive load.

---

## 4. Elevation & Depth
In this system, elevation is a feeling, not a drop-shadow.

### The Layering Principle
Achieve "lift" by stacking tokens. A `surface_container_lowest` (#ffffff) card placed on top of a `surface_container` (#efeeec) sidebar creates an immediate sense of hierarchy without a single pixel of shadow.

### Ambient Shadows
When a shadow is non-negotiable (e.g., a floating action button or a dropdown menu):
- **Blur:** Minimum 16px.
- **Opacity:** 4%–6%.
- **Tint:** Use a tinted shadow based on `on_surface` (#1a1c1b) rather than pure black.

### The "Ghost Border" Fallback
If a border is required for accessibility in input fields:
- Use `outline_variant` (#c2c7d0) at **15% opacity**. It should be felt, not seen.

---

## 5. Components: Tactile Primitives

### Buttons
- **Primary:** Gradient-filled (`primary` to `primary_container`), `rounded-md` (0.375rem). Text: `on_primary` (#ffffff).
- **Secondary:** Ghost style. No background, `primary` text. Use `surface_variant` on hover.
- **Tertiary:** `surface_container_low` background with `on_surface_variant` text.

### Task Lists (The "Pure" List)
- **Rules:** Forbid divider lines. 
- **Separation:** Use `8` (2rem) of vertical white space between groups.
- **Interaction:** On hover, the entire row transitions to `surface_container_low` (#f4f3f1) with a `rounded-lg` (0.5rem) corner.

### Checkboxes
- **Unchecked:** A "Ghost Border" circle (`outline_variant` at 40%).
- **Checked:** Solid `primary` fill with a white checkmark. The transition should be a soft fade, not a snap.

### Input Fields
- **Styling:** No bottom line. Use a `surface_container_highest` (#e3e2e0) background with `rounded-md` corners.
- **Focus State:** Transition the background to `surface_container_lowest` (#ffffff) and add a soft `primary` ambient shadow.

---

## 6. Do's and Don'ts

### Do
- **Do** use `16` (4rem) spacing for outer page margins to create an "Editorial" feel.
- **Do** use `primary_fixed_dim` (#a0cafe) for subtle icons that shouldn't compete with text.
- **Do** allow content to breathe. If a list feels crowded, increase the spacing scale from `3` to `4`.

### Don't
- **Don't** use 100% black text. Always use `on_surface` (#1a1c1b) to maintain the soft, paper-like contrast.
- **Don't** use "Standard" Material Design shadows. They are too aggressive for this calm environment.
- **Don't** use sharp corners. Every container must follow the Roundedness Scale, starting at `md` (0.375rem) as the baseline.
- **Don't** use dividers to separate the sidebar. The color shift between `surface_container` and `surface` is sufficient.