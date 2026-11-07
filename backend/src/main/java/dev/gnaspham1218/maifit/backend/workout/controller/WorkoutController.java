package dev.gnaspham1218.maifit.backend.workout.controller;

import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import dev.gnaspham1218.maifit.backend.workout.dto.CreateWorkoutRequest;
import dev.gnaspham1218.maifit.backend.workout.dto.DailyWorkoutsResponse;
import dev.gnaspham1218.maifit.backend.workout.dto.MonthlyWorkoutSummary;
import dev.gnaspham1218.maifit.backend.workout.dto.WorkoutResponse;
import dev.gnaspham1218.maifit.backend.workout.service.WorkoutService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.YearMonth;

@RestController
@RequestMapping("/workouts") // full path: /api/workouts
@RequiredArgsConstructor
public class WorkoutController {

    private final WorkoutService service;

    // Save one set counted in the browser. Sending the same clientId again returns the saved set.
    @PostMapping
    public ResponseEntity<ApiResponse<WorkoutResponse>> create(@AuthenticationPrincipal Jwt jwt,
                                                               @Valid @RequestBody CreateWorkoutRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.create(userId(jwt), request)));
    }

    // GET /api/workouts?date=2026-11-07 (default: today, Vietnam time)
    @GetMapping
    public ApiResponse<DailyWorkoutsResponse> listDay(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.ok(service.listDay(userId(jwt), date));
    }

    // GET /api/workouts/summary?month=2026-11 (default: this month): reps per day and exercise
    @GetMapping("/summary")
    public ApiResponse<MonthlyWorkoutSummary> monthlySummary(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return ApiResponse.ok(service.monthlySummary(userId(jwt), month));
    }

    // Only the owner's sets can be deleted (others answer 404)
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        service.delete(userId(jwt), id);
        return ApiResponse.ok("Set deleted", null);
    }

    private static Long userId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
