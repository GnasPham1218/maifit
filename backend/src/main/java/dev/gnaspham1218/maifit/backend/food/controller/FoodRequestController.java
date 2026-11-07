package dev.gnaspham1218.maifit.backend.food.controller;

import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import dev.gnaspham1218.maifit.backend.food.dto.CreateFoodRequest;
import dev.gnaspham1218.maifit.backend.food.dto.FoodRequestResponse;
import dev.gnaspham1218.maifit.backend.food.service.FoodRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/food-requests") // full path: /api/food-requests
@RequiredArgsConstructor
public class FoodRequestController {

    private final FoodRequestService service;

    // POST /api/food-requests {"name": "Bún mọc"}
    @PostMapping
    public ApiResponse<FoodRequestResponse> report(@AuthenticationPrincipal Jwt jwt,
                                                   @Valid @RequestBody CreateFoodRequest body) {
        Long userId = Long.valueOf(jwt.getSubject());
        return ApiResponse.ok(service.report(userId, body.name()));
    }
}
