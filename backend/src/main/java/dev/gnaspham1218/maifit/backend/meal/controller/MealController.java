package dev.gnaspham1218.maifit.backend.meal.controller;

import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import dev.gnaspham1218.maifit.backend.meal.dto.CreateMealRequest;
import dev.gnaspham1218.maifit.backend.meal.dto.DailyMealsResponse;
import dev.gnaspham1218.maifit.backend.meal.dto.MealItemRequest;
import dev.gnaspham1218.maifit.backend.meal.dto.MealResponse;
import dev.gnaspham1218.maifit.backend.meal.dto.UpdateMealItemRequest;
import dev.gnaspham1218.maifit.backend.meal.service.MealService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/meals") // full path: /api/meals
@RequiredArgsConstructor
public class MealController {

    private final MealService service;

    @PostMapping
    public ResponseEntity<ApiResponse<MealResponse>> create(@AuthenticationPrincipal Jwt jwt,
                                                            @Valid @RequestBody CreateMealRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.create(userId(jwt), request)));
    }

    // GET /api/meals?date=2026-11-03 (default: today, Vietnam time)
    @GetMapping
    public ApiResponse<DailyMealsResponse> listDay(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.ok(service.listDay(userId(jwt), date));
    }

    @PostMapping("/{mealId}/items")
    public ResponseEntity<ApiResponse<MealResponse>> addItem(@AuthenticationPrincipal Jwt jwt,
                                                             @PathVariable Long mealId,
                                                             @Valid @RequestBody MealItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.addItem(userId(jwt), mealId, request)));
    }

    // Returns the whole meal so the screen can update its totals right away
    @PatchMapping("/{mealId}/items/{itemId}")
    public ApiResponse<MealResponse> updateItem(@AuthenticationPrincipal Jwt jwt,
                                                @PathVariable Long mealId,
                                                @PathVariable Long itemId,
                                                @Valid @RequestBody UpdateMealItemRequest request) {
        return ApiResponse.ok(service.updateItemGrams(userId(jwt), mealId, itemId, request));
    }

    // Removing the last item deletes the meal too
    @DeleteMapping("/{mealId}/items/{itemId}")
    public ApiResponse<Void> removeItem(@AuthenticationPrincipal Jwt jwt,
                                        @PathVariable Long mealId,
                                        @PathVariable Long itemId) {
        service.removeItem(userId(jwt), mealId, itemId);
        return ApiResponse.ok("Item removed", null);
    }

    @DeleteMapping("/{mealId}")
    public ApiResponse<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long mealId) {
        service.delete(userId(jwt), mealId);
        return ApiResponse.ok("Meal deleted", null);
    }

    private static Long userId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
