// Mirrors the backend's ApiResponse<T> (common/response/ApiResponse.java)
export interface ApiResponse<T> {
  success: boolean;
  code?: string; // only on error, e.g. "EMAIL_ALREADY_EXISTS"
  message?: string;
  data?: T; // only on success
  errors?: Record<string, string>; // only on validation errors: field -> message
  timestamp: string;
}
