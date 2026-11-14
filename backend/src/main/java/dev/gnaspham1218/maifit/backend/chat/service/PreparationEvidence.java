package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.food.entity.Preparation;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Checks in code that a preparation chosen by the model is really in the question. The prompt already says
 * "never guess", but the eval caught the model setting RAW for "100g ức gà": a rule the model can break is
 * enforced here. Accepted only when the question has a cooking word for it ("luộc", "chiên"...) or an alias
 * that fixes it for this food ("cơm" = rice, boiled). Anything else goes back to null: the user picks.
 * Pure: no Spring, no database.
 */
public final class PreparationEvidence {

    /** Words that say how a food is cooked, compared as whole words with diacritics. */
    private static final Map<Preparation, List<String>> WORDS = new EnumMap<>(Map.of(
            Preparation.RAW, List.of("sống", "chưa nấu"),
            Preparation.BOILED, List.of("luộc", "hầm"),
            Preparation.STEAMED, List.of("hấp"),
            Preparation.FRIED, List.of("chiên", "rán", "ốp la"),
            Preparation.BRAISED, List.of("kho"),
            Preparation.GRILLED, List.of("nướng", "quay")));

    /**
     * The same, for a question typed without diacritics. Only words that stay unambiguous once stripped:
     * "kho" (khô, khó), "song" (sông, sóng), "ran" (rắn), "quay" (to turn) are left out.
     */
    private static final Map<Preparation, List<String>> PLAIN_WORDS = new EnumMap<>(Map.of(
            Preparation.RAW, List.of("chua nau"),
            Preparation.BOILED, List.of("luoc"),
            Preparation.STEAMED, List.of("hap"),
            Preparation.FRIED, List.of("chien", "op la"),
            Preparation.GRILLED, List.of("nuong")));

    /** An alias with locks_preparation: saying it means this food, cooked this way. */
    public record LockedAlias(String food, Preparation preparation, String alias) {
    }

    private final List<LockedAlias> lockedAliases;

    public PreparationEvidence(List<LockedAlias> lockedAliases) {
        this.lockedAliases = List.copyOf(lockedAliases);
    }

    public boolean isStated(String question, String food, Preparation preparation) {
        String text = FoodNameMatcher.normalize(question);
        boolean plain = text.equals(FoodNameMatcher.stripDiacritics(text));
        for (String word : (plain ? PLAIN_WORDS : WORDS).getOrDefault(preparation, List.of())) {
            if (containsWord(text, word)) {
                return true;
            }
        }
        for (LockedAlias alias : lockedAliases) {
            String aliasText = FoodNameMatcher.normalize(alias.alias());
            if (alias.food().equals(food) && alias.preparation() == preparation
                    && containsWord(text, plain ? FoodNameMatcher.stripDiacritics(aliasText) : aliasText)) {
                return true;
            }
        }
        return false;
    }

    private static boolean containsWord(String text, String word) {
        return Pattern.compile("(?<![\\p{L}\\p{N}])" + Pattern.quote(word) + "(?![\\p{L}\\p{N}])")
                .matcher(text).find();
    }
}
