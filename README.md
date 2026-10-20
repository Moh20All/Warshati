# Rakam — رقم | The Digital Nervous System for Repair Stores

![Rakam Logo](assets/r.png)

**Rakam — رقم** is a high-end, "Artisan Premium" desktop application designed exclusively for phone repair shops. It replaces chaotic paper trails and scattered spreadsheets with a sleek, unified, and **Offline-First** management ecosystem.

Built with **Electron**, **React**, and **Prisma**, Rakam provides a blistering fast, secure, and native experience that works flawlessly with or without an internet connection.

---

## 🏛️ The 6 Pillars of Rakam

### 1. High-Precision Repair Tracking
The core of your shop. Seamlessly transition devices from "Check-In" to "Completed" and "Collected".
*   **Check-In Wizard**: Capture customer details, device IMEI, specific faults, and estimated costs in seconds.
*   **Live Status**: Monitor the status of every device in your workshop with visual progress markers.
*   **Warranty Cycle**: Automatically track and manage warranty periods for every repair, ensuring professional after-sales support.

### 2. POS & Inventory Mastery
A full-featured Point of Sale (POS) system integrated directly with your parts stock.
*   **Barcode Integration**: Scan items for lightning-fast sales and restock operations.
*   **Trade-In / IMEI Support**: Manage used device exchanges with condition grading and unique serial number tracking.
*   **Low Stock Alerts**: Never run out of a critical screen or battery again with automated inventory notifications.

### 3. Financial Intelligence
Built-in accounting that makes sense for repair artisans.
*   **Daily Close (Z-Report)**: Finalize your register every evening with a single click to calculate exact cash on hand.
*   **Net Profit Analytics**: Real-time reporting on your revenue versus expenses.
*   **Monthly Summaries**: Elegant charts that reveal your sales trends and most profitable categories.

### 4. Professional Debt & Credit Ledger
Stay on top of every penny owed to you or your suppliers.
*   **Customer Debts**: Track partial payments and keep a clear history of what clients owe.
*   **Supplier Ledger**: Manage your debts to parts suppliers, linked directly to your inventory purchases.

### 5. Native Hardware & Local Privacy
Your data is **yours**.
*   **Offline-First**: Rakam stores everything locally on your machine via SQLite. No cloud outages, no data snooping, no monthly subscriptions required to access your information.
*   **Machine-ID Security**: Each license is cryptographically bound to a single hardware machine, ensuring maximum security and licensing integrity.
*   **Thermal Printing**: Built-in support for 58mm and 80mm thermal printers to provide professional receipts instantly.

### 6. Perfect Bilingual (FR/AR) & RTL Support
Designed for the local market with deep Arabic integration.
*   **Native Arabic (RTL)**: Not just translated text, but a completely mirrored layout (Right-to-Left) that feels natural and intuitive.
*   **Instant Toggle**: Switch between French, Arabic, and English at any time without restarting the app.

---

## 🚀 Getting Started (How to Use)

### First Launch: The Activation Gate
Rakam is a premium tool. On first launch, the app will generate a unique **Machine ID**.
1.  **Activate**: Enter your valid **Activation Key** provided after purchase.
2.  **Setup Wizard**: Follow the 3-step guide to enter your Store Name, Currency (DA/EUR/USD), and create your Administrator account.

### Workflow: A Typical Day with Rakam
1.  **Morning**: Open Rakam. Check the "Repairs Pending" section on the Dashboard.
2.  **Check-In**: A customer brings a broken iPhone. Use **Check-In** to log the ticket. Print a receipt for the customer to keep.
3.  **Repair**: Once fixed, update the status to "Ready". The customer receives their device, and you mark it as "Collected".
4.  **Sales**: Use the **POS** to sell chargers or accessories. Scan the barcode, select the payment method, and done.
5.  **Evening**: Go to **Daily Close**. Verify your earnings, and hit "Close Day". Rakam securely saves your daily performance history.

---

## 🛠️ Technical Setup (Developer Info)

### Prerequisites
*   Node.js (v20+)
*   npm or yarn

### Installation
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment: Create a `.env` in the root and in `rakam-dashboard`.
4.  Generate database client:
    ```bash
    npm run prisma:generate
    npm run prisma:push
    ```

### Build & Package
To generate the final Windows installer (`.exe`):
```bash
npm run electron:build
```
The installer will be generated in the `/release` directory.

---

## 📜 Release History (Changelog)

*   **v1.5.2 (Current)**: Add existing debts, cancel a wrong payment, payment receipts, safe partial payments and new customers at the POS, WhatsApp reminders and "device ready" messages, Devices page with full specs and value-for-money ratings.
*   **v1.5.1**: Device catalog — choose phones, laptops and consoles from a built-in searchable list (or type them by hand), optional device photos, Check-In page in the menu.
*   **v1.5.0**: Accurate daily close & real profit, refunds, purchase orders, parts from stock, staff permissions, automatic backups, Excel export and stronger security. See [CHANGELOG.md](CHANGELOG.md).
*   **v1.4.x**: Thermal printing overhaul, trade-in workflow, crash recovery & feedback.
*   **v1.2.2**:
    *   Added Native "About App" & Changelog page.
    *   Locked DevTools in production for security.
    *   Overhauled RTL CSS Engine for perfect Arabic layout mirroring.
    *   Digit normalization (Standardizing 0-9 across all views).
*   **v1.2.1**: Introduced Hardware Binding security and thermal printing improvements.
*   **v1.1.0**: New POS UI and Analytics charts.
*   **v1.0.0**: Initial Release (Core engine launch).

---

## 👨‍🎨 Attribution
*   Design: Artisan Premium Philosophy.
*   Icons: Lucide React.
*   Avatars: [pngtree.com](https://pngtree.com/freepng/cartoon-color-simple-male-avatar_5230557.html).

---

© 2026 **Rakam — رقم**. Developed with dedication by **Allali Mohamed**.
*The completes ecosystem for phone repair stores.*
