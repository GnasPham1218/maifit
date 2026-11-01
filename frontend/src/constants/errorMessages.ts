import { ApiError } from '../apis/client';

// The backend sends English messages + a stable `code`; the UI shows Vietnamese text chosen by code.
const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Không kết nối được tới máy chủ. Vui lòng thử lại.',
  BAD_REQUEST: 'Yêu cầu không hợp lệ.',
  VALIDATION_FAILED: 'Vui lòng kiểm tra lại thông tin đã nhập.',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu.',
  TOO_MANY_REQUESTS: 'Bạn thao tác quá nhiều. Vui lòng thử lại sau.',
  INTERNAL_ERROR: 'Đã có lỗi xảy ra. Vui lòng thử lại sau.',
  EMAIL_ALREADY_EXISTS: 'Email này đã được sử dụng.',
  USERNAME_ALREADY_EXISTS: 'Username này đã có người dùng.',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
  EMAIL_NOT_VERIFIED: 'Bạn cần xác thực email trước khi đăng nhập. Hãy kiểm tra hộp thư.',
  INVALID_TOKEN: 'Liên kết không hợp lệ hoặc đã hết hạn.',
};

export function getErrorMessage(error: unknown): string {
  const code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR';
  return MESSAGES[code] ?? MESSAGES.INTERNAL_ERROR;
}

const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  username: 'Username',
  password: 'Mật khẩu',
  newPassword: 'Mật khẩu mới',
  displayName: 'Tên hiển thị',
};

// Field-level messages for forms (VALIDATION_FAILED from the backend)
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.errors) return {};
  return Object.fromEntries(
    Object.keys(error.errors).map((field) => [field, `${FIELD_LABELS[field] ?? field} không hợp lệ`]),
  );
}
