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
    INVALID_TOKEN(HttpStatus.BAD_REQUEST, "The link is invalid or has expired"),
    LOGIN_TEMPORARILY_LOCKED(HttpStatus.TOO_MANY_REQUESTS, "Too many failed sign-in attempts, please try again later"),

    // ---- Profile & body ----
    PROFILE_NOT_FOUND(HttpStatus.NOT_FOUND, "Profile has not been set up yet"),
    AGE_OUT_OF_RANGE(HttpStatus.BAD_REQUEST, "Age must be between 13 and 100"),
    CHECKIN_IN_FUTURE(HttpStatus.BAD_REQUEST, "Check-in time cannot be in the future"),
    INVALID_DATE_RANGE(HttpStatus.BAD_REQUEST, "Invalid date range (max 366 days)"),

    // ---- Meals ----
    FOOD_NOT_FOUND(HttpStatus.BAD_REQUEST, "One or more foods do not exist"),
    MEAL_IN_FUTURE(HttpStatus.BAD_REQUEST, "Meal time cannot be in the future"),
    MEAL_ITEMS_LIMIT(HttpStatus.BAD_REQUEST, "A meal can have at most 30 items"),
    MEAL_DAILY_LIMIT(HttpStatus.TOO_MANY_REQUESTS, "At most 10 meals can be logged per day"),
    FOOD_REQUEST_DAILY_LIMIT(HttpStatus.TOO_MANY_REQUESTS, "Daily limit for reporting missing foods reached"),
    FAT_PERCENT_NOT_APPLICABLE(HttpStatus.BAD_REQUEST, "This food has no lean/fat trim option"),

    // ---- Workouts ----
    WORKOUT_TIME_INVALID(HttpStatus.BAD_REQUEST, "A set must be saved within 24 hours and cannot be in the future"),
    WORKOUT_PACE_INVALID(HttpStatus.BAD_REQUEST, "Too many reps for the duration of the set"),
    WORKOUT_DAILY_LIMIT(HttpStatus.TOO_MANY_REQUESTS, "At most 20 sets can be saved per day"),
    WORKOUT_REPS_DAILY_LIMIT(HttpStatus.TOO_MANY_REQUESTS, "Daily rep limit for this exercise reached"),

    // ---- AI ----
    AI_DAILY_LIMIT(HttpStatus.TOO_MANY_REQUESTS, "Daily AI usage limit reached"),
    AI_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "The AI service is unavailable, please try again later"),
    IMAGE_INVALID(HttpStatus.BAD_REQUEST, "Only JPEG, PNG or WebP images up to 2 MB are accepted");

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
