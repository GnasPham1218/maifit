package dev.gnaspham1218.maifit.backend.food.service;

import dev.gnaspham1218.maifit.backend.food.dto.FoodMetaResponse;
import dev.gnaspham1218.maifit.backend.food.dto.FoodResponse;
import dev.gnaspham1218.maifit.backend.food.dto.FoodSuggestion;
import dev.gnaspham1218.maifit.backend.food.entity.FoodImage;
import dev.gnaspham1218.maifit.backend.food.mapper.FoodMapper;
import dev.gnaspham1218.maifit.backend.food.repository.FoodCategoryRepository;
import dev.gnaspham1218.maifit.backend.food.repository.FoodImageRepository;
import dev.gnaspham1218.maifit.backend.food.repository.FoodRepository;
import dev.gnaspham1218.maifit.backend.food.repository.FoodSourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FoodService {

    // Tuned on real searches: below 0.45 the list fills with noise ("chả lụa" -> "Chanh")
    static final float SUGGEST_MIN_SCORE = 0.45f;
    static final int SUGGEST_LIMIT = 6;
    static final int MAX_TERM_LENGTH = 60;

    private final FoodRepository repository;
    private final FoodImageRepository imageRepository;
    private final FoodCategoryRepository categoryRepository;
    private final FoodSourceRepository sourceRepository;
    private final FoodMapper mapper;

    // The whole table (a few hundred rows): the frontend searches and filters it locally, accent-insensitive
    // ("ga" finds "gà"), and calls suggest() only when that finds nothing.
    // Three queries in all (foods with group + source, images), whatever the number of foods.
    // Move all search to the server only when the table grows to thousands of rows.
    @Transactional(readOnly = true)
    public List<FoodResponse> listAll() {
        Map<Long, FoodImage> mainImage = new HashMap<>();
        for (FoodImage image : imageRepository.findAllByOrderByFoodIdAscSortOrderAsc()) {
            mainImage.putIfAbsent(image.getFoodId(), image); // sorted: the first one is the main photo
        }
        return repository.findAllByOrderByNameAscPreparationAsc().stream()
                .map(food -> mapper.toResponse(food, mainImage.get(food.getId())))
                .toList();
    }

    // The filter choices of the food library
    @Transactional(readOnly = true)
    public FoodMetaResponse meta() {
        return new FoodMetaResponse(
                categoryRepository.findAllByOrderBySortOrderAsc().stream().map(mapper::toCategory).toList(),
                sourceRepository.findAllByOrderByIdAsc().stream().map(mapper::toSource).toList());
    }

    // Too short to mean anything -> no query; too long -> cut (trigrams of a whole sentence match everything)
    @Transactional(readOnly = true)
    public List<FoodSuggestion> suggest(String term) {
        String q = term == null ? "" : term.strip();
        if (q.length() < 2) return List.of();
        if (q.length() > MAX_TERM_LENGTH) q = q.substring(0, MAX_TERM_LENGTH);
        return repository.suggestNames(q, SUGGEST_MIN_SCORE, SUGGEST_LIMIT).stream()
                .map(row -> new FoodSuggestion((String) row[0], ((Number) row[1]).doubleValue()))
                .toList();
    }
}
