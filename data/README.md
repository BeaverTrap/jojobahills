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
