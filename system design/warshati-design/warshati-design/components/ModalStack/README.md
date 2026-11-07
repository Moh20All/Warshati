# ModalStack

How the app's stacked dialogs look (e.g. *Payments → Cancel this payment?*). Each level has its own overlay, so the lower dialog dims. Escape closes only the top one — unchanged.

**Provide** modals as children, bottom first.

**Keep the app's structure.** This restyles the existing component; it does not add, remove or rename props, fields, buttons or behaviour.
