package dev.gnaspham1218.maifit.backend.common.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    // ---- Common ----
    BAD_REQUEST(HttpStatus.BAD_REQUEST, "Invalid request"),
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "Validation failed"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Authentication required"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "You do not have permission to perform this action"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "Resource not found"),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "Method not allowed"),
    TOO_MANY_REQUESTS(HttpStatus.TOO_MANY_REQUESTS, "Daily limit reached"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred, please try again later"),

    // ---- Auth ----
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "Email is already in use"),
    USERNAME_ALREADY_EXISTS(HttpStatus.CONFLICT, "Username is already taken"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Invalid email or password"),
    EMAIL_NOT_VERIFIED(HttpStatus.FORBIDDEN, "Please verify your email before signing in"),
    INVALID_TOKEN(HttpStatus.BAD_REQUEST, "The link is invalid or has expired");
    private final HttpStatus status;
    private final String defaultMessage;
    ErrorCode(HttpStatus status, String defaultMessage){
        this.status = status;
        this.defaultMessage = defaultMessage;
    }
    public HttpStatus getStatus() {return status;}
    public String getDefaultMessage() {return defaultMessage;}

    public static ErrorCode fromStatus(int status){
        return switch (status){
            case 401 -> UNAUTHORIZED;
            case 403 -> FORBIDDEN;
            case 404 -> NOT_FOUND;
            case 405 -> METHOD_NOT_ALLOWED;
            case 429 -> TOO_MANY_REQUESTS;
            default -> status >=500 ? INTERNAL_ERROR : BAD_REQUEST;
        };
    }


}
