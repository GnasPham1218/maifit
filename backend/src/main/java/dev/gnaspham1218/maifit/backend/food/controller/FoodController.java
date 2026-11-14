package dev.gnaspham1218.maifit.backend.food.controller;

import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import dev.gnaspham1218.maifit.backend.food.dto.FoodDetailsResponse;
import dev.gnaspham1218.maifit.backend.food.dto.FoodMetaResponse;
import dev.gnaspham1218.maifit.backend.food.dto.FoodResponse;
import dev.gnaspham1218.maifit.backend.food.dto.FoodSuggestion;
import dev.gnaspham1218.maifit.backend.food.service.FoodDetailsService;
import dev.gnaspham1218.maifit.backend.food.service.FoodService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/foods") // full path: /api/foods
@RequiredArgsConstructor
public class FoodController {

    private final FoodService service;
    private final FoodDetailsService detailsService;

    @GetMapping
    public ApiResponse<List<FoodResponse>> list() {
        return ApiResponse.ok(service.listAll());
    }

    // GET /api/foods/meta -> groups and sources for the library filters. Changes only with a migration.
    @GetMapping("/meta")
    public ResponseEntity<ApiResponse<FoodMetaResponse>> meta() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePrivate())
                .body(ApiResponse.ok(service.meta()));
    }

    // GET /api/foods/search?q=bún mọc -> close food names, for when the local search finds nothing.
    // defaultValue: a missing q is just "nothing to suggest", not an error
    @GetMapping("/search")
    public ApiResponse<List<FoodSuggestion>> search(@RequestParam(defaultValue = "") String q) {
        return ApiResponse.ok(service.suggest(q));
    }

    // GET /api/foods/12/details -> every preparation of that food, its other names and sources.
    // Foods only change with a migration (a deploy), so the browser may reuse the answer for an hour.
    // private: the response sits behind a login, shared caches must not keep it.
    @GetMapping("/{id}/details")
    public ResponseEntity<ApiResponse<FoodDetailsResponse>> details(@PathVariable Long id) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePrivate())
                .body(ApiResponse.ok(detailsService.details(id)));
    }
}
