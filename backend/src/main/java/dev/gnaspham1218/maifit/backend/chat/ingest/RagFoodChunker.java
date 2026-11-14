package dev.gnaspham1218.maifit.backend.chat.ingest;

import org.springframework.ai.document.Document;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Turns the foods table into chunks: one chunk per food NAME, with every preparation and every alias.
 * One chunk per name (not per row) so a question about several foods gets several foods: with one
 * chunk per row, "cơm + trứng" could fill all the food slots with rice variants.
 * Read from the database, never copied by hand: the chat quotes the same numbers as the meal page.
 */
@Component
@Profile("ingest")
public class RagFoodChunker {

    /** Value of the "source" metadata of every food chunk: deleted and written again on each ingest. */
    public static final String SOURCE_FOODS = "foods";
    /** Metadata key with the food name exactly as in the foods table (used to resolve a portion). */
    public static final String FOOD = "food";

    private static final String TITLE = "Bảng thực phẩm MAIFit (USDA FoodData Central)";
    private static final String LICENSE = "Public domain (USDA FoodData Central)";
    private static final Pattern FDC_ID = Pattern.compile("USDA FDC (\\d+)");
    // Same words as the meal page (frontend constants/meal.ts)
    private static final Map<String, String> PREPARATION_LABELS = Map.of(
            "RAW", "Sống", "BOILED", "Luộc", "STEAMED", "Hấp",
            "FRIED", "Chiên", "BRAISED", "Kho", "GRILLED", "Nướng");

    private record FoodRow(String name, String preparation, BigDecimal kcal, BigDecimal proteinG,
                           BigDecimal carbG, BigDecimal fatG, BigDecimal fiberG, String source) {
    }

    private record AliasRow(String name, String preparation, String alias, boolean locksPreparation) {
    }

    private final JdbcClient jdbc;

    public RagFoodChunker(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<Document> chunk() {
        List<FoodRow> rows = jdbc.sql("""
                        SELECT name, preparation, kcal, protein_g, carb_g, fat_g, fiber_g, source
                        FROM foods ORDER BY name, id""")
                .query((rs, i) -> new FoodRow(rs.getString("name"), rs.getString("preparation"),
                        rs.getBigDecimal("kcal"), rs.getBigDecimal("protein_g"), rs.getBigDecimal("carb_g"),
                        rs.getBigDecimal("fat_g"), rs.getBigDecimal("fiber_g"), rs.getString("source")))
                .list();
        List<AliasRow> aliases = jdbc.sql("""
                        SELECT f.name, f.preparation, a.alias, a.locks_preparation
                        FROM food_aliases a JOIN foods f ON f.id = a.food_id ORDER BY a.alias""")
                .query((rs, i) -> new AliasRow(rs.getString("name"), rs.getString("preparation"),
                        rs.getString("alias"), rs.getBoolean("locks_preparation")))
                .list();

        Map<String, List<FoodRow>> byName = new LinkedHashMap<>();
        rows.forEach(row -> byName.computeIfAbsent(row.name(), k -> new ArrayList<>()).add(row));
        Map<String, List<AliasRow>> aliasesByName = new LinkedHashMap<>();
        aliases.forEach(a -> aliasesByName.computeIfAbsent(a.name(), k -> new ArrayList<>()).add(a));

        List<Document> chunks = new ArrayList<>();
        byName.forEach((name, variants) ->
                chunks.add(toDocument(name, variants, aliasesByName.getOrDefault(name, List.of()))));
        return chunks;
    }

    private static Document toDocument(String name, List<FoodRow> variants, List<AliasRow> aliases) {
        StringBuilder text = new StringBuilder("Thực phẩm: ").append(name).append('\n');
        if (!aliases.isEmpty()) {
            // "Cơm (luộc)": the alias already says how it is cooked, so the model must not ask
            List<String> names = aliases.stream()
                    .map(a -> a.locksPreparation() ? a.alias() + " (" + label(a.preparation()).toLowerCase(Locale.ROOT) + ")" : a.alias())
                    .toList();
            text.append("Còn gọi: ").append(String.join(", ", names)).append('\n');
        }
        text.append("Giá trị dinh dưỡng trên 100 g phần ăn được:\n");
        for (FoodRow row : variants) {
            text.append("- ").append(label(row.preparation())).append(": ")
                    .append(number(row.kcal())).append(" kcal; ")
                    .append("đạm ").append(grams(row.proteinG())).append("; ")
                    .append("tinh bột ").append(grams(row.carbG())).append("; ")
                    .append("chất béo ").append(grams(row.fatG())).append("; ")
                    .append("chất xơ ").append(grams(row.fiberG())).append(". ")
                    .append("Nguồn: ").append(row.source()).append('\n');
        }

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put(RagChunker.TYPE, RagChunker.TYPE_FOOD);
        metadata.put(RagChunker.SOURCE, SOURCE_FOODS);
        metadata.put(RagChunker.TITLE, TITLE);
        metadata.put(RagChunker.SECTION, name);
        metadata.put(RagChunker.URL, fdcUrl(variants.getFirst().source()));
        metadata.put(RagChunker.LICENSE, LICENSE);
        metadata.put(FOOD, name);
        return Document.builder().text(text.toString().strip()).metadata(metadata).build();
    }

    private static String label(String preparation) {
        return PREPARATION_LABELS.getOrDefault(preparation, preparation);
    }

    // Missing value: said out loud, never 0 (same rule as the foods table)
    private static String grams(BigDecimal value) {
        return value == null ? "chưa có số liệu" : number(value) + " g";
    }

    // 7.130 -> "7,13" (Vietnamese decimal comma, no trailing zeros)
    private static String number(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString().replace('.', ',');
    }

    /** The USDA page of the first row, or "" when its source has no FDC id (Document metadata rejects null). */
    private static String fdcUrl(String source) {
        Matcher id = FDC_ID.matcher(source);
        return id.find() ? "https://fdc.nal.usda.gov/food-details/" + id.group(1) + "/nutrients" : "";
    }
}
