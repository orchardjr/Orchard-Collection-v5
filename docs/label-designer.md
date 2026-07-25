# Label Designer & Printing

Label Studio creates plant labels from reusable built-in or custom templates. Open **Label Studio**, select plants (individually, from a filtered view, or as the entire collection), choose fields, verify the live preview, and print or download the batch.

## Output formats

- Browser print creates one physical-size page per label.
- PDF creates one label per page at the template dimensions.
- PNG creates a 3× rasterized export suitable for thermal-printer software.
- SVG preserves vectors for design and print workflows.

For DYMO and standard thermal printers, select the paper size matching the template, margins **none**, and **100% scale**. Browser “fit to page” can change the physical dimensions.

QR labels contain the permanent public NFC URL (`https://app.orchardcollection.ca/nfc/<public_token>`). A plant without an assigned NFC tag displays an explicit “NFC not assigned” preview instead of generating an unusable QR code.

## Templates

Built-in templates are immutable starting points. Edit one and choose **Save as custom**, or duplicate any template. Custom templates are stored locally in Dexie when offline and in Supabase when cloud mode is configured. They can be renamed, updated, duplicated, deleted, or set as the default.

The `LabelTemplate` model stores dimensions, selected fields, typography and machine-readable-code sizes. New templates and fields can be added without changing the rendering or export UI.

## Cloud migration

Apply `supabase/migrations/202607260001_label_templates.sql` to enable cloud template storage. The table uses owner-scoped RLS (`auth.uid() = user_id`). The rollback removes only the label-template table and does not affect plants, media, NFC tags, or timeline history.
