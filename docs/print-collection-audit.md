# Print Collection completeness filters

The existing Print Collection setup now includes a missing-information filter.
“All plants” means no completeness restriction; Active remains the default
plant-status scope. The filters combine with existing sorting and field choices.

- NFC assignment follows the existing NFC relationship: a tag with
  `resourceType = plant` and a matching `resourceId`. Unassigned/replaced tags
  with a cleared resource link do not count. The optional identifier line uses
  the hardware UID when available, otherwise the public token.
- Photo status counts actual plant media records, irrespective of hero choice
  or thumbnail availability. Hero URLs and placeholder artwork alone never
  count. The labels follow the requested “photo/photos” wording for these media
  records.
- NFC Status and Photo Status are opt-in fields. The audit summary appears when
  either field or a completeness filter is selected. All four summary counts
  describe the final report after both status and completeness filtering.
- Reads are paginated in batches of 500 for plants, spaces, NFC and media.
  Thumbnails are signed in batches, never with a request for each plant or media
  record. Original-resolution images are not loaded for this report. A record
  without a thumbnail still counts; its preview can be unavailable.
- Read failures disable printing and do not masquerade as missing information.
  Explicit local collection mode reads local repositories; cloud failures do
  not silently switch the audit to a different collection.
- The existing Letter/A4 print layout is reused. Controls are hidden in print,
  identifiers wrap, and report rows/audit summaries avoid page breaks.

No migration, schema, RLS, credentials, Storage policy, or plant-data change is
required.
