package dev.gnaspham1218.maifit.backend.food.controller;

import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import dev.gnaspham1218.maifit.backend.food.dto.FoodResponse;
import dev.gnaspham1218.maifit.backend.food.dto.FoodSuggestion;
import dev.gnaspham1218.maifit.backend.food.service.FoodService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/foods") // full path: /api/foods
@RequiredArgsConstructor
public class FoodController {

    private final FoodService service;

    @GetMapping
    public ApiResponse<List<FoodResponse>> list() {
        return ApiResponse.ok(service.listAll());
    }

    // GET /api/foods/search?q=bún mọc -> close food names, for when the local search finds nothing.
    // defaultValue: a missing q is just "nothing to suggest", not an error
    @GetMapping("/search")
    public ApiResponse<List<FoodSuggestion>> search(@RequestParam(defaultValue = "") String q) {
        return ApiResponse.ok(service.suggest(q));
    }
}
