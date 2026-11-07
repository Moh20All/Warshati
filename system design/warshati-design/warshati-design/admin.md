# Admin portal

Warshati Admin is your private website at **warshatydz.com/dashboard** (the same site serves the landing page at `/` and the user guide at `/guide`). Only you use it, with one password, on a laptop or a phone. It uses this same design system; the cards are under **Admin portal**.

## Keep its structure

Same rule as the app: restyle, never restructure. Layout, screens, fields, buttons, filters, chips, counts and messages stay as in the portal today — Login, Overview, Licenses, New license (+ success), Customer, Feedback, Crashes, plus empty, loading and error states and type-"delete" confirmations.

## What changes

- **Navy #0c0f1a and gold #c9972b go.** The sidebar and phone top bar use `color-inverse` graphite; the *New license* button, the sidebar counts (Feedback, Crashes) and the success check use `color-flux` lime; the active sidebar item is `color-inverse-raised` with a lime icon.
- **The logo** is the Trace tile, with "Warshati ورشتي · Admin" (the brief had the Arabic name reversed as "يتشرو").
- **Gold buttons** (New license, Sign in, Create key) become `flux`; other actions use the normal Button variants.
- **The dashed gold key box** on the success screen becomes `KeyField dashed` (lime-soft ground, dashed dark-lime border, mono 16px).
- **Statuses** use `license-*`, `feedback-*`, `fbtype-*` and `crash-*` tokens (see **Status colors**). Revoked keys are grey and struck through.
- **Stack trace box** is `color-inverse` with Plex Mono (was navy).
- **Toasts** bottom-right (green done, red error), and **confirm dialogs** use the same `Toast` and `Modal` as the app.
- Light and dark mode both stay, as today.

## Components added for the portal

`AdminShell` (desktop sidebar 240 px; phone: top bar + slide-in sidebar), `AdminSidebar`, `Initials`, `KeyField` (mono key + copy; `dashed`, `revoked`), `FilterChips` (status chips with counts), `ActivityFeed`, `BarList` (versions in use), `Stepper` (number of PCs), `Skeleton` (loading blocks).

## Phone

Below about 760 px the sidebar becomes a top bar with a menu button, and each license row becomes a card (customer, status, key with copy, last seen · price, WhatsApp and ⋯). Buttons on the success screen go full width so a key can be sent from a customer's shop with one thumb.
