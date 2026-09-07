# Plant label sheets

Open **Plant Labels** from Collection or Print Collection. This is separate from
the detailed collection report and the existing individual-label Label Studio
exporter. It uses the same bulk collection data hook, audit map, and plant picker.
No database migration, policy, credentials, backend, or plant-data changes.

## Physical layout

All layout calculations and PDF drawing use points (72 points = 1 inch):

| Measurement               | Inches    | Points    |
| ------------------------- | --------- | --------- |
| Letter page               | 8.5 × 11  | 612 × 792 |
| Individual label          | 2.5 × 0.5 | 180 × 36  |
| Left/right margin         | 0.375     | 27        |
| Top/bottom minimum margin | 0.5       | 36        |
| Horizontal gap            | 0.125     | 9         |
| Vertical gap              | 0.0625    | 4.5       |

Capacity is calculated: **3 columns × 17 rows = 51 labels per page**.
The last row ends at 10 inches, leaving 1 inch below the grid. Extra space is
left blank, never used to scale labels. Borders are 0.25-point strokes inset by
half the stroke width, keeping their outside dimensions exactly 180 × 36 points.

Print at **Actual Size / 100%**, never Fit to Page. Printer-driver scaling can
override the PDF's no-scaling preference; verify with a ruler on a test sheet.

## Selection and output

All active plants and audit presets use active scope. Current filtered collection
uses the snapshot of IDs passed from Collection (including search, space, tags,
and status) or the currently filtered Print Collection report. Explicit selection
can include archived plants. Global copies support 1–10, grouped by plant after
sorting; per-plant copy overrides are not provided.

Fields are opt-in except name, botanical name, and cultivar. Botanical/cultivar
share a line; selected ID, NFC, and space each get their own line when available.
The name has stronger weight and size. Text is measured using the embedded font
and shrinks only as needed, with a 6-point minimum. Names and secondary fields
prefer one line and can wrap to two balanced lines without losing text. Vertical
space is reserved for every enabled field. If full text cannot fit in two lines,
or the complete set of fields exceeds the fixed height at the minimum size,
generation stops with a clear message to reduce fields or remove QR; it never
silently truncates, clips, or prints unreadably small text.
The sheet preview uses the same fitted strings, font, coordinates, and QR modules
as the PDF. Changing settings invalidates the prior downloadable PDF.

Optional QR uses the existing authenticated plant-detail URL, not NFC token
redirects or new public sharing. Cloud UUID plant IDs receive QR; local collection
mode never generates QR, even for UUID-shaped IDs. QR includes a four-module quiet zone. At this small physical size,
test scanning with the intended printer/phone is important.

Text, cutting guides, and QR modules are vector PDF output. Bitstream Vera fonts
are embedded; redistribution license is included in public/fonts. No photos,
logos, decorative page headers, or footers are included. The application creates
and downloads the PDF entirely client-side.
