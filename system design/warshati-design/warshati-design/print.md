# Print

The app's eight print templates (reference section 5), restyled under **Print templates**. Every template keeps its lines and their order. What changes:

- **Font:** IBM Plex Sans 500 (700 for titles and totals) instead of Courier New; IBM Plex Mono for document numbers. Plex Sans Arabic covers the Arabic titles.
- **Logo:** the black Trace mark (`mark-trace-black.svg`) instead of the black "R" circle, 40 px high on 80 mm, 30 px on 58 mm.
- **No emoji:** "📍 address" and "📞 phone" become plain lines (most thermal printers drop or garble emoji).
- **Black only:** the Monthly report's green/red and the A4 greys (#333, #666, #ddd) become black, weight and rules; negatives print with "−".
- **Rules:** a solid 2 px rule under the header, dashed rules between blocks, a box around the customer block of the repair ticket — as today.

| # | Template | Paper setting | Lines (unchanged) |
|---|---|---|---|
| 5.1 | Check-in receipt | Ticket size | logo · store · address · phone · rule · "Check-In Receipt / ايصال" · CI # · Date · Customer · Phone · Device · IMEI · Issue · Condition · thank-you |
| 5.2 | Repair ticket | Ticket size | logo · store · address · phone · rule · "REPAIR TICKET / تذكرة إصلاح" · number · box (Customer Name, Customer Phone) · DEVICE INFO · PROBLEM · DIAGNOSIS · Cost · Deposit · thank-you |
| 5.3 | Sales receipt | Receipt size | logo · store · rule · "Sales Receipt / فاتورة" · INV# · Date · Customer · ITEM/QTY/PRICE/TOTAL · Subtotal · Total · Paid · Method · Change · Warranty block · thank-you |
| 5.4 | Debt payment receipt | Receipt size | store · address · phone · rule · "Payment Receipt / وصل دفع" · Date · Customer · For · Total debt · Amount paid · Remaining balance · thank-you |
| 5.5 | Daily X-report | A4 | store · title · date · 6 figures in a 2-column grid · two signature lines |
| 5.6 | Monthly summary | A4 | store · title · month · generated · 5 figures · Repairs Stats · Top Items Sold |
| 5.7 | Dashboard overview | A4 | store · title · date · 4 cards · Recent Active Tickets · Recent Shop Sales |
| 5.8 | Test print | Receipt size | logo · store · title · Printer · Receipt Width · Date · "✓ Working correctly!" |

Paper sizes, silent printing, the 1 s wait and the 120 s timeout stay as they are.

## Thermal rules

- Printable width: `paper-80` 72 mm (576 dots), `paper-58` 48 mm (384 dots). Previews: 302 px and 219 px wide.
- Only `color-print-ink` on `color-print-paper`. No greys: thermal heads dither them.
- Weight 500 minimum; nothing under 10 px.
- Amounts and document numbers stay left-to-right on Arabic lines.

## Installer and Windows icon

- `AppIcon`: PNG frames 16, 20, 24, 32, 40, 48, 64, 96, 128, 256 from the Trace tile, to pack into `warshati.ico` (16–32 use the heavier small-size drawing).
- `Installer`: welcome/finish 164×314 (+ 328×628) and header 150×57 (+ 300×114). NSIS and Inno Setup want 24-bit BMP: convert without alpha.
