# CRAB Code / VS Code reference

The user explicitly requested an interface like Visual Studio Code with extra animations. This supersedes the earlier workshop poster direction.

The workbench now uses a compact title bar, functional Go to File control, activity rail, collapsible explorer, actual file tabs, outline navigation, compile toolbar, output/problems panel, and status bar. The supplied CRAB logo and red active/status accents carry the identity. There are no decorative menu items or invented project statistics.

Native system type handles UI. IBM Plex Mono handles code at 14px by default. The editor uses familiar C++ syntax colors. Students can change the code font size in Editor settings. Each sketch retains its own editor state and undo history when switching tabs.

## Motion

- Explorer width and outline groups interpolate over 220–240ms.
- Board guidance slides in and out over 240ms.
- New tabs enter over 180ms; actual file changes briefly fade and move 4px.
- Dialogs enter over 200ms and leave over 130ms.
- A line animates only while real compilation is pending; it does not imply a measured percentage.
- Actual successful compilation gives a brief confirmation flash.
- Notifications enter over 220ms. Hover and press feedback stays short.

Code stays still during typing. The operating system's reduced-motion preference is respected. The persistent Reduce interface motion checkbox also disables CSS and programmatic transitions. Go to File takes focus immediately and supports filtering, arrow navigation, Enter, and Escape. File tabs support arrow, Home, and End keys.

## Reference and verification

Inspected the installed Arduino IDE and a settled VS Code window. The reference informed the compact title bar, activity rail, file tabs, explorer, outline, and status bar. CRAB retains its own logo and red accents.

Browser checks verified the explorer's interpolated widths, reduced-motion zero-duration behavior, live compile animation, file search, per-file undo isolation, dialogs, responsive fit, and successful real Arduino compilation. The Netlify build and TypeScript checks passed. Backend hosting and SMTP requirements are unchanged; see README.md.

## Classroom access

The password screen inherits the workbench's charcoal surfaces, native UI type, Plex Mono details, square controls, and red CRAB accent. A compact application frame pairs the supplied logo with one password field. Entrance motion is short and the caret respects reduced motion. Mobile rearranges the logo and name above the form. The owner page uses the same frame and adds owner-key and new-password fields. Both screens were inspected at desktop and 390px mobile width.
