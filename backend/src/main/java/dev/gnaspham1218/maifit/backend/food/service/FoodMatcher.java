package dev.gnaspham1218.maifit.backend.food.service;

import dev.gnaspham1218.maifit.backend.food.entity.Food;
import dev.gnaspham1218.maifit.backend.food.entity.Preparation;
import dev.gnaspham1218.maifit.backend.food.repository.FoodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Maps a free-text food name (from the AI) to a row of the foods table.
 * Thresholds were tuned on real names: "canh chua" vs "Cà chua" scores 0.60, a wrong match,
 * so anything below 0.75 is returned but flagged for the user to check.
 */
@Service
@RequiredArgsConstructor
public class FoodMatcher {

    static final float MIN_SCORE = 0.45f;       // below: no match at all
    static final float CONFIDENT_SCORE = 0.75f; // below: matched, but "please check"

    public record Match(Food food, boolean lowConfidence) {}

    private final FoodRepository foodRepository;

    /**
     * @param name        what the AI saw, e.g. "cơm trắng", "ức gà"
     * @param preparation what the AI thinks, may be null
     * @param catalog     all foods (loaded once per request), to find the other preparations of a food
     */
    @Transactional(readOnly = true)
    public Optional<Match> match(String name, Preparation preparation, Collection<Food> catalog) {
        List<Object[]> rows = foodRepository.searchByNameOrAlias(name);
        if (rows.isEmpty()) return Optional.empty();

        Object[] best = rows.getFirst();
        long foodId = ((Number) best[0]).longValue();
        float score = ((Number) best[1]).floatValue();
        boolean locks = (Boolean) best[2];
        if (score < MIN_SCORE) return Optional.empty();

        Food top = catalog.stream().filter(f -> f.getId() == foodId).findFirst().orElse(null);
        if (top == null) return Optional.empty();

        // The alias already says how it is cooked ("cơm" = boiled rice): trust it over the AI
        if (locks) return Optional.of(new Match(top, score < CONFIDENT_SCORE));

        // Otherwise pick the variant of the same food with the AI's preparation, if we have it
        Optional<Food> sameCooking = catalog.stream()
                .filter(f -> f.getName().equals(top.getName()) && f.getPreparation() == preparation)
                .findFirst();
        Food chosen = sameCooking.orElse(top);
        boolean low = score < CONFIDENT_SCORE || sameCooking.isEmpty();
        return Optional.of(new Match(chosen, low));
    }
}
