# Empty Wall - Project Rules & Guidelines

## 1. Tech Stack & Dependencies
- **Core:** Vanilla HTML5, CSS3, and JavaScript (ES6+).
- **Frameworks:** No frameworks (React, Vue, etc.) or build steps (Webpack, Vite) are used. Keep it dependency-free where possible.
- **External Libraries:** Keep third-party libraries to an absolute minimum. Currently, only `qrcode.min.js` is used via CDN. 

## 2. State Management
- The application relies on a central, global `state` object defined at the top of `app.js`.
- Any changes to UI configurations (theme, image settings, QR options) must be updated in this `state` object before triggering a re-render.

## 3. Styling & Theming (CSS
)
- **CSS Variables:** All colors, spacing, and animations must use the CSS custom properties defined in `:root` in `style.css`. Do not hardcode colors.
- **Dark/Light Mode:** The application defaults to Dark Mode. Light mode overrides are scoped under the `[data-theme="light"]` attribute. Ensure any new styles support both themes.
- **Aesthetic:** Maintain the "Premium Terminal" aesthetic. Use monospace typography (`IBM Plex Mono`), terminal-style borders, and glowing accent colors.

## 4. JavaScript & Architecture
- **Modularity:** Group related functions together (e.g., Global State, Text Tab Functions, Image Tab Functions, Output Actions).
- **DOM Manipulation:** Use vanilla DOM APIs (`document.getElementById`, `document.querySelectorAll`).
- **Event Listeners:** Attach events directly in HTML (`onclick="function()"`) or in the `DOMContentLoaded` initialization block for global listeners like paste or drag-and-drop.

## 5. Canvas & Image Processing
- **Performance:** Image manipulation loops through pixel data arrays (`getImageData`). Avoid heavy computations inside the nested `x`/`y` loops where possible to prevent blocking the mai/n thread.
- **Non-blocking UI:** Use `willReadFrequently: true` for the hidden canvas context, as the pixel data is read extensively to build brightness and edge maps.
- **Responsive Renders:** Always consider the target `deviceWidth` and `deviceHeight` from the state when rendering the final wallpaper canvas.

## 6. HTML Structure
- Keep the HTML semantic.
- The main workspace is divided into two tabs: `panelText` and `panelImage`. Keep control configurations on the left (`controls-panel`) and canvas/ASCII outputs on the right (`output-panel`).
- Input controls (sliders, selects, toggles) should be grouped inside `.control-section` elements.

## 7. Error Handling & UX
- Always provide fallback UI states. Show the loading spinner (`imgLoadingOverlay`) before heavy canvas processing.
- Handle invalid file uploads gracefully by showing error overlays (`imgErrorOverlay`) or toast notifications (`showToast`).

## 8. Commit & Contribution
- Ensure that no `console.log` statements are left in production code.
- Test new image processing filters against various input images (dark, light, high-contrast) to ensure stability.
- When adding new art types or filters, remember to add their definitions to the `randomizeWallpaper` and `applyMovementPreset`/`applyFunkyPreset` functions.