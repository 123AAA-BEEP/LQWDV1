# Rescission Form — 3111 Cawthra Road

Polished, professional version of the Kingridge (Cawthra) Inc. rescission form
(cancellation of an Agreement of Purchase & Sale).

## Files

| File | Purpose |
| --- | --- |
| `Rescission-Form-3111-Cawthra-Road.docx` | The finished form — edit this. |
| `preview.png` | Rendered preview of the layout. |
| `build_form.py` | Script that generates the `.docx` (run with `python-docx`). |

## Using it in Google Docs (stays fully editable)

1. Upload `Rescission-Form-3111-Cawthra-Road.docx` to Google Drive.
2. Right-click it → **Open with → Google Docs** (or in Google Docs:
   **File → Open → Upload**).

Google Docs converts it to a live, editable document. The layout is built only
from Google-Docs-native features — tables, cell shading, borders, and text
styling — so every field, colour, and signature line remains editable. No text
boxes or floating shapes were used (those are what break on import).

## What changed from the original

- Added a navy masthead (company name, title, subtitle) and a property /
  rescission-date strip.
- Reorganised the loose bold labels into clean two-column field tables grouped
  under section headers.
- Replaced the fragile drawing-shape signature lines with a proper signature
  grid (purchaser / witness / date, two rows).
- Boxed the "For Administrative Use Only" checklist.
- Fixed wording: **Recession → Rescission**, "Purchase & Sales" → "Purchase &
  Sale" (matches the form's own "APS"), tidied "Sqft", "Block/unit#",
  "For administration Use Only".

## Regenerating

```bash
pip install python-docx
python build_form.py
```
