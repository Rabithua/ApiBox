/**
 * Simplified type definitions - proxy-only mode
 */

// Error detail type for validation errors
export interface ApiError {
  field?: string;
  code: string;
  message: string;
}

// GitHub-style HTTP response type
export interface ApiResponse<T = unknown> {
  status: "success" | "error";
  data?: T;
  message?: string;
  errors?: ApiError[];
}

// Forex quote data structure
export interface ForexQuote {
  id?: number;
  instrument: string;
  currency: string;
  timestamp: Date;
  data: any; // Raw forex data from API
  created_at?: Date;
}

// Forex history query parameters
export interface ForexHistoryQuery {
  instrument: string;
  currency: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  page?: number;
}
