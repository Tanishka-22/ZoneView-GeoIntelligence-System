export interface ImportError {
  row: number;
  title?: string;
  reason: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;     // duplicates
  failed: number;      // validation errors
  total: number;       // total rows processed
  errors: ImportError[];
  duration: string;    // how long the import took
}