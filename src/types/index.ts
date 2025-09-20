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
