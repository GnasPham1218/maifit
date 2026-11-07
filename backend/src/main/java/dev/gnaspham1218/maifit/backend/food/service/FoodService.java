package dev.gnaspham1218.maifit.backend.food.service;

import dev.gnaspham1218.maifit.backend.food.dto.FoodResponse;
import dev.gnaspham1218.maifit.backend.food.dto.FoodSuggestion;
import dev.gnaspham1218.maifit.backend.food.mapper.FoodMapper;
import dev.gnaspham1218.maifit.backend.food.repository.FoodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FoodService {

    // Tuned on real searches: below 0.45 the list fills with noise ("chả lụa" -> "Chanh")
    static final float SUGGEST_MIN_SCORE = 0.45f;
    static final int SUGGEST_LIMIT = 6;
    static final int MAX_TERM_LENGTH = 60;

    private final FoodRepository repository;
    private final FoodMapper mapper;

    // The whole table (a few hundred rows): the frontend searches it locally, accent-insensitive
    // ("ga" finds "gà"), and calls suggest() only when that finds nothing.
    // Move all search to the server only when the table grows to thousands of rows.
    @Transactional(readOnly = true)
    public List<FoodResponse> listAll() {
        return mapper.toResponses(repository.findAllByOrderByNameAscPreparationAsc());
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
