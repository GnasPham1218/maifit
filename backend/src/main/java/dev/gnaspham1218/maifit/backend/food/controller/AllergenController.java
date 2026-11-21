package dev.gnaspham1218.maifit.backend.food.controller;

import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import dev.gnaspham1218.maifit.backend.food.dto.AllergenResponse;
import dev.gnaspham1218.maifit.backend.food.service.AllergenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/allergens") // full path: /api/allergens
@RequiredArgsConstructor
public class AllergenController {

    private final AllergenService service;

    // GET /api/allergens -> the allergen groups. Public (the "about allergen data" page needs no login):
    // reference data, nothing about a user. Changes only with a migration, so caches may keep it an hour.
    @GetMapping
    public ResponseEntity<ApiResponse<List<AllergenResponse>>> list() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
                .body(ApiResponse.ok(service.list()));
    }
}
