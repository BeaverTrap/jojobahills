# Mock Data

Place your mock data files here.

## File Format

You can provide the data in one of these formats:

1. **CSV files** (recommended):
   - `valve-sheet.csv` - Valve data with columns: Valve, Location, Location Notes, Function
   - `zone-sheet.csv` - Zone data with columns: Zone, Lot #, Valve

2. **JSON files**:
   - `valve-sheet.json` - Array of objects with keys: Valve, Location, Location Notes, Function
   - `zone-sheet.json` - Array of objects with keys: Zone, Lot #, Valve

3. **Single Excel/CSV file**:
   - If you have both sheets in one file, name it `mock-data.csv` or `mock-data.xlsx`
   - The app will look for tabs named "Valve Sheet" and "Zone Sheet"

Once you place the file(s) here, the app will automatically use them when Google Sheets credentials are not configured.

## Future: Places / Facilities sheet

To add info for map facilities (Wood Shop, Metal Shop, Garden & Greenhouse, Golf Range, etc.), you can add a **Places Sheet** (or **Facilities Sheet**) to the same Excel file or Google Sheet. Suggested columns:

- **Name** – matches the place label on the map (e.g. "Wood Shop", "Pond 1")
- **Description** – short blurb
- **Contact** or **Hours** – optional
- **Notes** – maintenance or other notes

The app can later read this sheet and show the info when a user clicks a facility on the map.
