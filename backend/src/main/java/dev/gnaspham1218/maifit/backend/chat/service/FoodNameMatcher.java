package dev.gnaspham1218.maifit.backend.chat.service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Finds the foods a question names, by food name or alias. The exact half of the hybrid food search:
 * embedding a whole question that lists 5 foods gives one "average" vector, and some foods fall out
 * of the top results. A name written in the question is always found here.
 * Rules:
 * - with diacritics: without them "bơ" (avocado) and "bò" (beef) are both "bo"
 * - whole words only: "bơ" must not match inside "bơi"
 * - longest term first: "sữa chua" wins over "sữa" for the same words
 * - a question typed WITHOUT any diacritic ("200g com, 1 qua chuoi") is matched without diacritics, but only
 *   against terms that stay unambiguous once stripped ("chuoi" = Chuối; "bo" = bơ or bò: dropped, left to
 *   the semantic search) and have at least 3 letters
 * Pure: no Spring, no database, so every rule is unit tested.
 */
public final class FoodNameMatcher {

    private record Term(String text, String food, Pattern pattern) {
    }

    private record Hit(int start, String food) {
    }

    private static final int MIN_PLAIN_LETTERS = 3;

    private final List<Term> terms;        // longest first
    private final List<Term> plainTerms;   // without diacritics, unambiguous only, longest first

    /** @param termToFood food names and aliases, each mapped to its food name as in the foods table */
    public FoodNameMatcher(Map<String, String> termToFood) {
        List<Term> list = new ArrayList<>();
        Map<String, Set<String>> foodsByPlain = new TreeMap<>();
        termToFood.forEach((term, food) -> {
            String text = normalize(term);
            if (!text.isEmpty()) {
                list.add(term(text, food));
                foodsByPlain.computeIfAbsent(stripDiacritics(text), k -> new LinkedHashSet<>()).add(food);
            }
        });
        List<Term> plain = new ArrayList<>();
        foodsByPlain.forEach((text, foods) -> {
            // "bo" -> {Bơ, Thịt bò}: ambiguous without diacritics, never matched that way
            if (foods.size() == 1 && text.replaceAll("[^\\p{L}]", "").length() >= MIN_PLAIN_LETTERS) {
                plain.add(term(text, foods.iterator().next()));
            }
        });
        this.terms = sorted(list);
        this.plainTerms = sorted(plain);
    }

    /** Food names in the order they appear in the question, without duplicates, at most {@code limit}. */
    public List<String> find(String question, int limit) {
        String normalized = normalize(question);
        // Typed without any diacritic: the user does not type them, so compare without them (safe terms only)
        boolean plain = normalized.equals(stripDiacritics(normalized));
        return find(normalized, plain ? plainTerms : terms, limit);
    }

    private static List<String> find(String text, List<Term> terms, int limit) {
        boolean[] used = new boolean[text.length()];
        List<Hit> hits = new ArrayList<>();
        for (Term term : terms) {
            Matcher matcher = term.pattern().matcher(text);
            while (matcher.find()) {
                if (isFree(used, matcher.start(), matcher.end())) {
                    for (int i = matcher.start(); i < matcher.end(); i++) {
                        used[i] = true;   // these words belong to the longer term now
                    }
                    hits.add(new Hit(matcher.start(), term.food()));
                }
            }
        }
        hits.sort(Comparator.comparingInt(Hit::start));
        Set<String> foods = new LinkedHashSet<>();
        for (Hit hit : hits) {
            if (foods.size() == limit) {
                break;
            }
            foods.add(hit.food());
        }
        return new ArrayList<>(foods);
    }

    /** Number of terms (names + aliases), for the startup log. */
    public int size() {
        return terms.size();
    }

    /** Terms usable in a question typed without diacritics, for the startup log. */
    public int plainSize() {
        return plainTerms.size();
    }

    private static Term term(String text, String food) {
        // No letter or digit right before or after: a whole word (\\b does not handle Vietnamese letters)
        return new Term(text, food,
                Pattern.compile("(?<![\\p{L}\\p{N}])" + Pattern.quote(text) + "(?![\\p{L}\\p{N}])"));
    }

    private static List<Term> sorted(List<Term> list) {
        list.sort(Comparator.comparingInt((Term t) -> t.text().length()).reversed().thenComparing(Term::text));
        return List.copyOf(list);
    }

    /** "Cơm trắng đậu" -> "com trang dau" (text already normalized). */
    static String stripDiacritics(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .replace('đ', 'd').replace('Đ', 'D');
    }

    private static boolean isFree(boolean[] used, int start, int end) {
        for (int i = start; i < end; i++) {
            if (used[i]) {
                return false;
            }
        }
        return true;
    }

    /** NFC so a composed "ờ" and "o + ̀ + ̛" compare equal; lower case; single spaces. */
    static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFC).toLowerCase(Locale.ROOT).strip().replaceAll("\\s+", " ");
    }

    /** Builds a matcher from rows of (term, food); a term used by two foods keeps the first one. */
    public static FoodNameMatcher of(List<Map.Entry<String, String>> rows) {
        Map<String, String> map = new TreeMap<>();
        rows.forEach(row -> map.putIfAbsent(row.getKey(), row.getValue()));
        return new FoodNameMatcher(map);
    }
}
