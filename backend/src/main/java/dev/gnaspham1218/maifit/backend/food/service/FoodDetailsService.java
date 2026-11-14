package dev.gnaspham1218.maifit.backend.food.service;

import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.food.dto.FoodDetailsResponse;
import dev.gnaspham1218.maifit.backend.food.dto.FoodVariantResponse;
import dev.gnaspham1218.maifit.backend.food.entity.Food;
import dev.gnaspham1218.maifit.backend.food.entity.FoodImage;
import dev.gnaspham1218.maifit.backend.food.entity.Preparation;
import dev.gnaspham1218.maifit.backend.food.mapper.FoodMapper;
import dev.gnaspham1218.maifit.backend.food.repository.FoodImageRepository;
import dev.gnaspham1218.maifit.backend.food.repository.FoodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// The food detail page: one food name, all its preparations side by side, where the numbers come from.
@Service
@RequiredArgsConstructor
public class FoodDetailsService {

    // Same order as the frontend choices: raw first, then the usual ways of cooking
    static final List<Preparation> PREPARATION_ORDER = List.of(
            Preparation.RAW, Preparation.BOILED, Preparation.STEAMED,
            Preparation.GRILLED, Preparation.FRIED, Preparation.BRAISED);

    private final FoodRepository repository;
    private final FoodImageRepository imageRepository;
    private final FoodMapper mapper;

    @Transactional(readOnly = true)
    public FoodDetailsResponse details(Long id) {
        Food selected = repository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Food not found"));
        String name = selected.getName();

        List<Food> rows = repository.findByNameOrderById(name).stream()
                .sorted(Comparator.comparingInt(f -> PREPARATION_ORDER.indexOf(f.getPreparation())))
                .toList();
        // One query for the photos of every preparation, grouped by food row (main photo first)
        Map<Long, List<FoodImage>> images = imageRepository
                .findByFoodIdInOrderByFoodIdAscSortOrderAsc(rows.stream().map(Food::getId).toList()).stream()
                .collect(Collectors.groupingBy(FoodImage::getFoodId));
        List<FoodVariantResponse> variants = rows.stream()
                .map(f -> mapper.toVariant(f, images.getOrDefault(f.getId(), List.of())))
                .toList();
        List<String> aliases = repository.findAliasesByFoodName(name).stream()
                .filter(alias -> !alias.equalsIgnoreCase(name))
                .toList();
        return new FoodDetailsResponse(name, mapper.toCategory(selected.getCategory()), aliases, selected.getId(), variants);
    }
}
