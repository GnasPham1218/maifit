package dev.gnaspham1218.maifit.backend.food.service;

import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.food.dto.FoodDetailsResponse;
import dev.gnaspham1218.maifit.backend.food.dto.FoodVariantResponse;
import dev.gnaspham1218.maifit.backend.food.entity.Food;
import dev.gnaspham1218.maifit.backend.food.entity.Preparation;
import dev.gnaspham1218.maifit.backend.food.repository.FoodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// The food detail page: one food name, all its preparations side by side, where the numbers come from.
@Service
@RequiredArgsConstructor
public class FoodDetailsService {

    // Same order as the frontend choices: raw first, then the usual ways of cooking
    static final List<Preparation> PREPARATION_ORDER = List.of(
            Preparation.RAW, Preparation.BOILED, Preparation.STEAMED,
            Preparation.GRILLED, Preparation.FRIED, Preparation.BRAISED);

    // Only a row backed by ONE USDA item gets a link; an estimate names two ids and links to neither
    private static final Pattern USDA_ITEM = Pattern.compile("^USDA FDC (\\d+) \\(");
    private static final String ESTIMATED_PREFIX = "ƯỚC TÍNH";

    private final FoodRepository repository;

    @Transactional(readOnly = true)
    public FoodDetailsResponse details(Long id) {
        Food selected = repository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Food not found"));
        String name = selected.getName();

        List<FoodVariantResponse> variants = repository.findByNameOrderById(name).stream()
                .sorted(Comparator.comparingInt(f -> PREPARATION_ORDER.indexOf(f.getPreparation())))
                .map(FoodDetailsService::toVariant)
                .toList();
        List<String> aliases = repository.findAliasesByFoodName(name).stream()
                .filter(alias -> !alias.equalsIgnoreCase(name))
                .toList();
        return new FoodDetailsResponse(name, aliases, selected.getId(), variants);
    }

    // Built here, not in the frontend: the link format lives in one place, next to the data it reads
    static String sourceUrl(String source) {
        Matcher m = USDA_ITEM.matcher(source);
        return m.find() ? "https://fdc.nal.usda.gov/food-details/" + m.group(1) + "/nutrients" : null;
    }

    private static FoodVariantResponse toVariant(Food f) {
        return new FoodVariantResponse(
                f.getId(), f.getPreparation(), f.getKcal(),
                f.getProteinG(), f.getCarbG(), f.getFatG(), f.getFiberG(),
                f.getSource(), f.getSourceDescription(), sourceUrl(f.getSource()),
                f.isSourceApproximate(), f.getSource().startsWith(ESTIMATED_PREFIX),
                f.getLeanVersionId());
    }
}
