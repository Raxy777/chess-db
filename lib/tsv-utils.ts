import fs from 'fs/promises';
import path from 'path';

export interface TSVOpening {
  eco: string;
  name: string;
  pgn: string;
  sourceFile: string; // To know which TSV file it came from
}

/**
 * Parses the string content of a TSV file.
 * @param content The string content of the TSV file.
 * @param fileName The name of the TSV file.
 * @returns An array of TSVOpening objects.
 */
export function parseTSV(content: string, fileName: string): TSVOpening[] {
  const lines = content.split('\n');
  const openings: TSVOpening[] = [];
  const expectedHeader = 'eco\tname\tpgn';

  if (lines.length === 0) {
    console.warn(`[parseTSV] File ${fileName} is empty.`);
    return openings;
  }

  // Validate or skip header
  const header = lines[0].trim(); // Trim to remove potential trailing carriage return
  if (header !== expectedHeader) {
    console.warn(`[parseTSV] File ${fileName} has an unexpected header: "${header}". Expected: "${expectedHeader}". Processing will continue by assuming column order.`);
    // We could choose to throw an error here or try to parse anyway.
    // For robustness, let's try to parse, assuming the order is correct.
  }

  // Start from index 1 if header is present and validated, or 0 if we treat all lines as data
  // Given the warning, we'll process from line 1 if header matched, else from line 0 if it didn't,
  // but since we are just warning and proceeding, we should consistently skip the first line if it's considered a header.
  const startIndex = header === expectedHeader ? 1 : (lines.length > 0 && lines[0].includes('eco\tname\tpgn') ? 1 : 0);
  // A more robust check for header might be just to skip if it contains 'eco', 'name', 'pgn'.
  // For this implementation, we'll assume the first line is always a header to be skipped if it doesn't match or to be skipped if it does.
  // If the first line IS the header, we skip it. If it's not the header, it's data.
  // Let's refine: if the first line looks like a header, skip it. Otherwise, process it.
  
  let lineStartIndex = 0;
  if (lines.length > 0 && lines[0].startsWith('eco\t')) { // Simple check if it's a header
      lineStartIndex = 1;
  }


  for (let i = lineStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { // Skip empty lines
      continue;
    }

    const columns = line.split('\t');
    if (columns.length === 3) {
      openings.push({
        eco: columns[0],
        name: columns[1],
        pgn: columns[2],
        sourceFile: fileName,
      });
    } else {
      console.warn(`[parseTSV] File ${fileName}, line ${i + 1}: Expected 3 columns, found ${columns.length}. Line: "${line}"`);
    }
  }

  return openings;
}

/**
 * Loads all TSV opening data from the app/data directory.
 * This function is intended for server-side use or at build time.
 * @returns A promise that resolves to an array of all TSVOpening objects.
 */
export async function loadAllTSVOpenings(): Promise<TSVOpening[]> {
  const dataDir = path.join(process.cwd(), 'app', 'data');
  let allOpenings: TSVOpening[] = [];

  try {
    const files = await fs.readdir(dataDir);
    const tsvFiles = files.filter(file => file.endsWith('.tsv'));

    if (tsvFiles.length === 0) {
      console.warn('[loadAllTSVOpenings] No .tsv files found in app/data directory.');
      return [];
    }

    for (const tsvFile of tsvFiles) {
      const filePath = path.join(dataDir, tsvFile);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        if (!content.trim()) {
          console.warn(`[loadAllTSVOpenings] File ${tsvFile} is empty.`);
          continue;
        }
        const openingsFromFile = parseTSV(content, tsvFile);
        allOpenings = allOpenings.concat(openingsFromFile);
      } catch (error) {
        console.error(`[loadAllTSVOpenings] Error reading or parsing file ${tsvFile}:`, error);
        // Continue to next file if one file fails
      }
    }
  } catch (error) {
    console.error('[loadAllTSVOpenings] Error reading app/data directory:', error);
    // If we can't read the directory, we can't load any openings.
    // Depending on requirements, could throw error or return empty array.
    // For now, returning empty as per "Handle cases where files might be empty or not found gracefully."
    return [];
  }

  return allOpenings;
}
