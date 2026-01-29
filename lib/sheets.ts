import { google } from "googleapis";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV !== "development") {
    throw new Error(`Missing ${name}`);
  }
  return value || "";
}

// Check if Google Sheets is configured
function isGoogleSheetsConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SHEETS_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  );
}

// Initialize Google Sheets API client
function getSheetsClient() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

/**
 * Read from local Excel file as fallback
 */
async function fetchFromLocalFile(sheetName: string): Promise<string[][]> {
  try {
    // In Next.js, process.cwd() should point to the project root
    const filePath = path.join(process.cwd(), "data", "Master Zone & Valve Database.xlsx");
    
    console.log(`Looking for Excel file at: ${filePath}`);
    console.log(`Current working directory: ${process.cwd()}`);
    
    if (!fs.existsSync(filePath)) {
      // Try alternative path resolution
      const altPath = path.resolve("data", "Master Zone & Valve Database.xlsx");
      console.log(`Trying alternative path: ${altPath}`);
      
      if (!fs.existsSync(altPath)) {
        throw new Error(`Local data file not found at ${filePath} or ${altPath}. Current dir: ${process.cwd()}`);
      }
      
      const workbook = await readExcelFile(altPath);
      return processSheet(workbook, sheetName);
    }

    const workbook = await readExcelFile(filePath);
    return processSheet(workbook, sheetName);
  } catch (error: any) {
    console.error(`Error reading local file for sheet "${sheetName}":`, error);
    throw error;
  }
}

function processSheet(workbook: XLSX.WorkBook, sheetName: string): string[][] {
  // Find the sheet by name (case-insensitive)
  const sheet = workbook.SheetNames.find(
    (name) => name.toLowerCase() === sheetName.toLowerCase()
  );

  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in Excel file. Available sheets: ${workbook.SheetNames.join(", ")}`);
  }

  const worksheet = workbook.Sheets[sheet];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
  
  if (!data || data.length === 0) {
    throw new Error(`Sheet "${sheetName}" is empty`);
  }
  
  // Convert all values to strings
  return data.map((row) => row.map((cell) => String(cell || "")));
}

async function readExcelFile(filePath: string): Promise<XLSX.WorkBook> {
  try {
    // Try reading with buffer first (more reliable for locked files)
    const fileBuffer = fs.readFileSync(filePath);
    return XLSX.read(fileBuffer, { type: 'buffer' });
  } catch (error: any) {
    // Fallback to direct file read
    console.log(`Buffer read failed, trying direct read: ${error.message}`);
    return XLSX.readFile(filePath);
  }
}

/**
 * Fetch values from a specific sheet tab
 * @param sheetName - Name of the sheet tab (e.g., "Valve Sheet")
 * @param range - Range to fetch (default: "A:Z" to get all columns) - ignored for local files
 * @returns 2D array of values
 */
export async function fetchSheetValues(
  sheetName: string,
  range: string = "A:Z"
): Promise<string[][]> {
  // Use local file if Google Sheets is not configured
  if (!isGoogleSheetsConfigured()) {
    console.log(`Using local Excel file (Google Sheets not configured)`);
    return fetchFromLocalFile(sheetName);
  }

  // Use Google Sheets API
  const sheets = getSheetsClient();
  const spreadsheetId = getEnvVar("GOOGLE_SHEETS_ID");
  
  const fullRange = `${sheetName}!${range}`;
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: fullRange,
    });

    const values = response.data.values;
    if (!values || values.length === 0) {
      return [];
    }

    return values as string[][];
  } catch (error) {
    console.error(`Error fetching sheet "${sheetName}" from Google Sheets:`, error);
    console.log(`Falling back to local Excel file...`);
    // Fallback to local file on error
    return fetchFromLocalFile(sheetName);
  }
}

/**
 * Convert 2D array of values to array of objects using first row as headers
 * @param values - 2D array from Google Sheets
 * @returns Array of objects with keys from first row
 */
export function toObjects(values: string[][]): Record<string, string>[] {
  if (values.length === 0) {
    return [];
  }

  const headers = values[0].map((h) => h.trim());
  const rows = values.slice(1);

  return rows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = row[index]?.trim() || "";
    });
    return obj;
  });
}
