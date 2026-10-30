package dev.gnaspham1218.maifit.backend.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;

import java.time.Instant;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        boolean success,
        String code,                 // only on error, e.g. "EMAIL_ALREADY_EXISTS"
        String message,
        T data,                      // only on success
        Map<String, String> errors,  // only on validation errors: field -> message
        Instant timestamp
) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, null, null, data, null, Instant.now());
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, null, message, data, null, Instant.now());
    }

    public static ApiResponse<Void> error(ErrorCode code, String message, Map<String, String> errors) {
        return new ApiResponse<>(false, code.name(), message, null, errors, Instant.now());
    }
}