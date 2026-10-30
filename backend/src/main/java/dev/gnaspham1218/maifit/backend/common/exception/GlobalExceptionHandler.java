package dev.gnaspham1218.maifit.backend.common.exception;

import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // 1. Lỗi nghiệp vụ do mình chủ động ném trong service
    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleApp(AppException ex) {
        ErrorCode code = ex.getErrorCode();
        return build(code.getStatus(), code, ex.getMessage(), null);
    }

    // 2. @Valid trên request body không đạt -> trả lỗi theo từng field
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            errors.putIfAbsent(fe.getField(), fe.getDefaultMessage()); // mỗi field 1 lỗi đầu tiên
        }
        ErrorCode code = ErrorCode.VALIDATION_FAILED;
        return build(code.getStatus(), code, code.getDefaultMessage(), errors);
    }

    // JSON sai cú pháp, hoặc tham số sai kiểu (vd. /meals/abc thay vì /meals/1)
    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(Exception ex) {
        ErrorCode code = ErrorCode.BAD_REQUEST;
        return build(code.getStatus(), code, code.getDefaultMessage(), null);
    }

    // Đã đăng nhập nhưng không đủ quyền (vd. @PreAuthorize("hasRole('ADMIN')"))
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        ErrorCode code = ErrorCode.FORBIDDEN;
        return build(code.getStatus(), code, code.getDefaultMessage(), null);
    }

    // 3. Mọi lỗi còn lại
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleOther(Exception ex) {
        // Lỗi có sẵn của Spring (404, 405, 415...) tự biết status của nó
        if (ex instanceof ErrorResponse er) {
            HttpStatusCode status = er.getStatusCode();
            ErrorCode code = ErrorCode.fromStatus(status.value());
            return build(status, code, code.getDefaultMessage(), null);
        }
        // Lỗi không lường trước: ghi đủ vào log, KHÔNG trả chi tiết ra ngoài
        log.error("Unhandled exception", ex);
        ErrorCode code = ErrorCode.INTERNAL_ERROR;
        return build(code.getStatus(), code, code.getDefaultMessage(), null);
    }

    private ResponseEntity<ApiResponse<Void>> build(HttpStatusCode status, ErrorCode code,
                                                    String message, Map<String, String> errors) {
        return ResponseEntity.status(status).body(ApiResponse.error(code, message, errors));
    }
}