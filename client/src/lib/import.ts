// Import utilities for CSV parsing

export interface ParseCSVResult<T> {
  data: T[];
  errors: string[];
}

export function parseCSV<T>(
  file: File,
  columnMapping: { csvHeader: string; field: keyof T }[],
  transform?: (row: Record<string, string>) => Partial<T>
): Promise<ParseCSVResult<T>> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Handle both Windows (CRLF) and Unix (LF) line endings
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length === 0) {
        resolve({ data: [], errors: ['CSV file is empty'] });
        return;
      }

      // Parse header
      const headerLine = lines[0];
      const headers = parseCSVLine(headerLine);
      
      // Find column indices
      const columnIndices = new Map<keyof T, number>();
      const errors: string[] = [];
      
      columnMapping.forEach(({ csvHeader, field }) => {
        const index = headers.findIndex(h => h.toLowerCase().trim() === csvHeader.toLowerCase().trim());
        if (index === -1) {
          errors.push(`Required column "${csvHeader}" not found in CSV`);
        } else {
          columnIndices.set(field, index);
        }
      });

      if (errors.length > 0) {
        resolve({ data: [], errors });
        return;
      }

      // Parse data rows
      const data: T[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        const rowData: Record<string, string> = {};
        
        columnMapping.forEach(({ csvHeader, field }) => {
          const index = columnIndices.get(field);
          if (index !== undefined) {
            rowData[csvHeader] = values[index] || '';
          }
        });

        try {
          const transformedRow = transform ? transform(rowData) : rowData;
          data.push(transformedRow as T);
        } catch (error) {
          errors.push(`Error on row ${i + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
        }
      }

      resolve({ data, errors });
    };

    reader.onerror = () => {
      resolve({ data: [], errors: ['Failed to read file'] });
    };

    reader.readAsText(file);
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  
  return result;
}

export function validateRequired(value: string, fieldName: string): string {
  if (!value || value.trim() === '') {
    throw new Error(`${fieldName} is required`);
  }
  return value.trim();
}

export function validateNumber(value: string, fieldName: string): number {
  const num = parseFloat(value);
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  return num;
}

export function validateInteger(value: string, fieldName: string): number {
  const num = parseInt(value);
  if (isNaN(num) || !Number.isInteger(num)) {
    throw new Error(`${fieldName} must be a valid integer`);
  }
  return num;
}

export function validateEmail(value: string, fieldName: string): string {
  const email = value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error(`${fieldName} must be a valid email address`);
  }
  return email;
}
