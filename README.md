# ITI ERP Staff Panel

Apps Script web app starter generated from the handoff document and upgraded for speed plus a stronger UI.

## Included files

- `Code.gs`: backend read/write logic, caching, dashboard aggregation, document uploads
- `Index.html`: app shell and navigation
- `Styles.html`: responsive visual system
- `Dashboard.html`: dashboard cards and tables
- `Admission.html`: optimized admission form
- `Students.html`: filterable student list
- `Scripts.html`: client-side loading, filtering, save flow, and rendering
- `appsscript.json`: Apps Script manifest

## Deployment steps

1. Create an Apps Script project bound to your Google Sheet.
2. Paste each file into the Apps Script editor with the same name.
3. Confirm sheet names match:
   - `STUDENTS_MASTER`
   - `INSTITUTE_MASTER`
   - `TRADE_MASTER`
   - `AGENTS_MASTER`
   - `ADMISSION_DESK`
4. Confirm `CONFIG.docsRootFolderId` points to the correct Drive folder.
5. Deploy as a new web app version.

## Sheet note

Dashboard values depend on clean data in `STUDENTS_MASTER` and correct mirror/status formulas in `ADMISSION_DESK`, as described in the original handoff.
