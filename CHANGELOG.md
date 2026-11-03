# Changelog

All notable changes to Warshati will be documented in this file.

## Next version (not released yet)

### ✨ Improvements
- **Ready-made choices on repair tickets:** Issue description, diagnosis and parts used each offer a list of the most common choices (40 issues, 31 diagnoses, 25 parts) in French, Arabic and English. Click the list button or start typing to filter; pick several, and add your own words anytime.
- **Accessory catalog:** 1,025 accessories (cases, chargers, cables, earphones, packs...) in 14 categories to pick when adding stock. Picking one fills in the name; its market price is only shown as a suggestion — your buy and sell prices stay yours to type. Photos (about 20 MB) are downloaded only after you agree: all of them, or only the accessories you choose (Settings → Device Catalog too). Browse them all from Inventory → Accessory catalog (search, category, sort by price, "Add to stock").

### 🛠️ Fixed (inventory)
- Adding an accessory no longer asks for a phone brand and model.
- Long forms now scroll inside their window: the Save button is always reachable, even on small screens.
- **Default warranty is 5 days:** New tickets now use the shop's default warranty from Settings → Store (it was always 30 before). Shops still on the old 30-day default move to 5 days once; a shop that chose another number keeps it.

### 🛠️ Fixed
- The issue of an existing ticket looked editable, but changes were not saved. It is now shown as fixed.
- "Customer name" and "Issue description" showed two asterisks.

## v1.7.0 — 01/11/2026
New Look, Shop Network & Barcode Labels

### 🚀 Major Upgrades
- **New Design:** Warshati has its final look: the green and lime Trace logo, a new Windows icon, IBM Plex fonts (French and Arabic), clearer colours and status labels in your language. Receipts, tickets and reports are redesigned too.
- **Shop Network (VIP plan):** Several PCs in the shop work on the same data. One main PC shares (Settings → Shop network → Share); the others connect with a pairing code, from the activation screen or from Settings. The main PC is found automatically on the shop's network.
- **Barcode Labels:** Print small labels with barcode, item name, price and shop name (30×20 to 58×40 mm) from Inventory, for one item or many. Items without a barcode get one automatically, and the POS scanner finds them.
- **Forgot Email or Password:** The owner can recover their account on the sign-in screen with the shop's license key: Warshati shows the email and lets them choose a new password. Works without internet.
- **Keyboard Shortcuts:** F2 POS, F3 new ticket, F4 new check-in, F6 tickets, F7 inventory, F8 debts, F9 daily close, F10 complete a sale, Ctrl+S / Ctrl+P on a ticket, and F1 to see them all.

### ✨ Improvements
- **Daily Close:** The owner now sees the parts cost and the real net profit of the day.
- **New Installer:** Welcome page and wording in French, Arabic and English.
- **Plans:** Licenses now carry their plan (Lifetime, Cloud, VIP); features follow the plan.

### ℹ️ Good to Know
- Updating keeps all your data. The guide at warshatydz.com/guide explains every feature with screenshots.

## v1.6.0 — 20/10/2026
Rakam is now Warshati — ورشتي

### 🚀 Major Upgrades
- **New Name:** Rakam becomes **Warshati — ورشتي** ("my workshop"). The new name is on the window, installer, receipts, menus and every message. Website: warshatydz.com.
- **New Icon:** A gold و on navy replaces the old logo (temporary until the final logo is ready).
- **Includes Everything From v1.5.2:** Existing debts, cancelling a wrong payment, safe partial payments, payment receipts, WhatsApp messages, the Devices page and value-for-money ratings (v1.5.2 was never released on its own).

### 🔧 Fixed
- **Cleaner Installer:** The installer no longer contains the developer's test database, only the empty starting database.

### ℹ️ Good to Know
- Warshati is installed as a new program, with its own data folder (`%APPDATA%\Warshati`). Existing activation keys keep working (the key format is not checked, only the key itself).
## v1.5.2 — 20/10/2026
Debts & Customer Messages

### 🚀 Major Upgrades
- **Add Existing Debts:** Enter what customers (and suppliers) already owed before you started using Warshati — with the original date and a note. It is not counted as today's sales or cash; their payments are.
- **Cancel a Wrong Payment:** The owner can cancel a mistaken payment (with a reason). Nothing is deleted: a cancelling entry is recorded today, the amount owed goes back up and today's cash is corrected.
- **Customers Who Can't Pay Everything:** At the POS, a short cash payment can no longer be saved by mistake — Warshati shows what is missing and turns the rest into a debt in one click. The amount that will be owed is shown before you confirm.
- **New Customer at the POS:** If the phone number is not found, add the customer right there without losing the cart.
- **Payment Receipts:** Print a receipt for every debt payment (offered right after recording it), showing what was paid and what is left.
- **WhatsApp Messages:** Send a debt reminder, or tell the customer their device is repaired and ready (with the amount to pay), in one click.
- **Devices Page:** Every phone, laptop and console with its full specifications — search, filter by brand, and open a complete spec sheet with photo. Available to sellers too.
- **Value-for-Money Ratings:** Each phone shows a value score (0–100) and a rating — *Performance Beast*, *Value King*, *Average Value* or *Overpriced* — to help customers choose. Filter and sort by best value.
- **Device Details from Any Form:** Open a device's full specs while filling a ticket, trade-in or inventory form, without leaving it.

### 🛠️ Fixed
- A cash sale paid short was saved as fully paid and the rest was lost.
- After a sale, the previous customer stayed selected for the next sale.
- Some tables (Customers, Warranty) could show a value in the wrong column.
- Saving a new repair ticket with missing information now explains what is missing, in your language.
- A window opened from inside another (e.g. device details) could be cut off, and Escape closed both.
- Debt types now appear in your language.

---

## v1.5.1 — 19/10/2026
Device Catalog

### 🚀 Major Upgrades
- **Device Catalog:** Choose the device from a ready list instead of typing it — **617 phones, 578 laptop models and 18 consoles** are built in. Pick a category (Phone / Laptop / Console), then a brand and a model, each with search. Typing "iphone 13" finds every iPhone 13 at once.
- **Available Everywhere:** The device picker is on repair tickets, check-ins, trade-ins and inventory. Picking a phone fills in its storage (and the item name in inventory).
- **Type Manually Anytime:** A device that is not in the list can always be typed by hand. Warshati remembers it, so it appears in the list next time.
- **Device Images (optional):** After you agree, Warshati downloads phone photos once and shows them in the lists. Manage them in **Settings → Device Catalog** (download missing images, delete images, remove devices added by hand).

### ✨ Improvements
- **Check-In page in the menu:** Register a device at the counter, print the slip, then turn it into a repair ticket in one click.
- Clean device data: duplicates removed, storage shown correctly (e.g. 2 TB), impossible values removed.

### 🛠️ Fixed
- Printing a check-in slip crashed.
- An existing repair ticket appeared to allow changing its device, but the change was never saved. The device is now shown as fixed.

---

## v1.5.0 — 19/10/2026
Trusted Numbers & Shop Control

### 🚀 Major Upgrades
- **Accurate Daily Close & Monthly Report:** Rebuilt from the ground up. Repairs are counted once (on delivery), credit is never counted as cash, supplier payments and refunds are included, and the monthly report includes every day — even days you forgot to close.
- **Real Profit vs. Cash:** The dashboard and monthly report now show true **Net Profit** (sales − cost of items sold − running costs) separately from **Net Cash** in the drawer. Buying stock no longer looks like a loss.
- **Repair Deposits:** Deposits are recorded on the day they are received and automatically deducted from the final invoice and the customer's debt.
- **Refunds:** Refund a sale in one click — items go back to stock, the customer gets back exactly what they paid, and any open debt is closed.
- **Purchase Orders:** Order stock from suppliers, paid in cash or on credit. Stock updates instantly and credit orders appear in the supplier's debt ledger.
- **Parts From Stock in Repairs:** Take parts from inventory directly on a repair ticket. Stock goes down and the part cost is used for the repair's profit.
- **Staff Permissions:** Staff can sell, repair and close the day, but cannot see profit or buy prices, change prices, delete records, or open suppliers, reports, users, settings and backups.
- **Automatic Daily Backups:** Warshati saves a copy of your data every day and keeps the last 14 days. Manual Backup & Restore now work too, with a safety copy before every restore.
- **Export to Excel:** Export invoices, expenses, inventory, debts and daily closes to a real Excel file (Arabic, French and English supported).

### ✨ Improvements
- **Edit Expenses:** Owners can correct an expense's amount, date, category or description.
- **Trade-In Payout:** Choose "cash from the drawer" or "store credit" so trade-ins are never counted twice.
- **Existing Stock:** When adding items you already own (e.g. on first setup), untick "I paid for this stock today" so it is not recorded as an expense.
- **Your Currency Everywhere:** Every screen, receipt and report now uses the store's currency (د.ج in Arabic for the dinar).
- **Setup Wizard:** Currency is now chosen from a list.

### 🔐 Security
- **Protected Local Data:** Only the Warshati window can access your shop data — other programs and web pages are blocked.
- **Login Protection:** 5 wrong passwords lock that account for 5 minutes.
- **Owner Lock-Out Prevention:** An owner can no longer remove their own access, and the store always keeps at least one owner.
- **Stronger Licensing:** License checks run inside the app's secure core. Warshati works offline for up to 30 days, then asks to reconnect once.

### 🛠️ Fixed
- Customer debt payments, supplier pages and supplier payments failed to save.
- Credit sales recorded a debt of 0.
- Inventory items and some sales failed to save (warranty field).
- Sales could sell more than the stock available; a failed step could leave half-saved records — every operation is now saved all-or-nothing.
- A blank screen appeared when the login session expired.
- Invoice, ticket and check-in numbers broke after number 9999.
- The installer could ship with existing store data; new installs now always start empty.
- The startup database upgrade could stop early on very old databases.

### ⚠️ Good to Know
- **Everyone must log in again once** after updating.
- Old saved daily closes keep their original figures; the monthly report recalculates everything from your transactions.

---

## v1.4.2 — 25/03/2026
Printing & Stability Engine

### 🚀 Major Improvements
- **Thermal Printing Overhaul:** Significant improvements to printing accuracy and paper size handling (80mm & 58mm).
- **Print Dialog Reliability:** Fixed issues where the print dialog would appear behind the app or disappear before the user could click "Print."
- **Crash Recovery:** Introduced a new "Report Problem" screen to help you recover quickly and send us details if something goes wrong.
- **Improved Feedback:** Added a "Send Feedback" button to the sidebar to easily report issues or suggest improvements.

### 🛠️ Stability & Maintenance
- **Report Stability:** Fixed a crash when viewing Monthly Reports.
- **Inventory Settings:** Fixed a bug that prevented Inventory Warranty settings from saving correctly.
- **Readable Tables:** Cleaned up several management tables for better readability.
- **Language Hub:** Fixed missing or broken text and labels across several pages in Arabic, French, and English.
- **Automatic Repairs:** Improved system reliability by automatically repairing and updating the database during application startup.
- **Reliable Printing:** Enhanced print reliability for long receipts to ensure they finish printing completely.
- **Spooler Stability:** Fixed a freeze that happened when opening the print dialog for small thermal receipts.
- **Security Check:** Enhanced data security and system connection management.
- **Optimization:** Optimized system logging to help find and resolve issues faster.

---

## v1.4.1 — 25/03/2026
Initial Regression Patch

### 🛠️ Fixed
- **Monthly Report Crash:** Fixed the backend error where the report tried to query `createdAt` and changed it to `receivedAt`.
- **Inventory Warranty Bug:** Fixed the logic in `inventory.js` so that `warrantyDays` are now successfully saved.
- **Trade-In List Cleanup:** Removed duplicate Status and Date columns from the Trade-In management table.

---

## v1.4.0 — 25/03/2026
Advanced Logistics

### 🚀 Added
- **Multi-size Thermal Printing:** Support for switching between 58mm, 80mm, and A4 prints.
- **Automated Trade-In Workflow:** Process trade-ins with automatic inventory creation.
- **Printer Configuration:** Set specific paper widths per workstation in Store Settings.
- **Smart Receipt Layouts:** Narrow receipt format for thermal rolls.

---

## v1.3.0 — 20/03/2026
Security & RTL Architecture

### 🛡️ Added
- **History View:** Native "About App" & Release History page.
- **Security:** Locked DevTools in production for enhanced security.

### 🛠️ Fixed
- **RTL Engine:** Overhauled RTL CSS for perfect Arabic layout mirroring.
- **Digit Normalization:** Standardized digit display across all views.

---

## v1.2.2 — 18/03/2026
Desktop Polish

### ✨ What's New
- **Internal Timeline:** Added the first version of the internal reference timeline.
- **Native Polish:** Polished the Electron environment and improved app security.

---

## v1.2.1 — 16/03/2026
Multilingual & Reports

### 🌍 Features
- **Multilingual Support:** Instant switching between English, Français, and العربية (RTL).
- **Monthly Reports:** New analytical charts for revenue, profit, and debt.
- **Thermal Support:** Initial direct-to-USB thermal printing implementation.

---

## v1.0.3 — 10/03/2026
Foundation & Activation

### 🧱 Core
- **Licensing:** Machine binding activation system.
- **Auto-Update:** Silent background background update delivery.
- **Self-Healing:** Database initialization and auto-repair.
