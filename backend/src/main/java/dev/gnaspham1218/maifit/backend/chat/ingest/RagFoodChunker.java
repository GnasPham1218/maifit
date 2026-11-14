package dev.gnaspham1218.maifit.backend.chat.ingest;

import dev.gnaspham1218.maifit.backend.food.entity.FoodSource;
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
    // Same words as the meal page (frontend constants/meal.ts)
    private static final Map<String, String> PREPARATION_LABELS = Map.of(
            "RAW", "Sống", "BOILED", "Luộc", "STEAMED", "Hấp",
            "FRIED", "Chiên", "BRAISED", "Kho", "GRILLED", "Nướng");

    private record FoodRow(String name, String preparation, BigDecimal kcal, BigDecimal proteinG,
                           BigDecimal carbG, BigDecimal fatG, BigDecimal fiberG,
                           String sourceName, String sourceRef, boolean estimated, String itemUrlTemplate) {

        // What the chat quotes as the source of this row
        String sourceText() {
            return estimated ? "ước tính từ " + sourceName : sourceName + " (mã " + sourceRef + ")";
        }

        String url() {
            return estimated ? null : FoodSource.itemUrl(itemUrlTemplate, sourceRef);
        }
    }

    private record AliasRow(String name, String preparation, String alias, boolean locksPreparation) {
    }

    private final JdbcClient jdbc;

    public RagFoodChunker(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<Document> chunk() {
        List<FoodRow> rows = jdbc.sql("""
                        SELECT f.name, f.preparation, f.kcal, f.protein_g, f.carb_g, f.fat_g, f.fiber_g,
                               s.name AS source_name, f.source_ref, f.estimated, s.item_url_template
                        FROM foods f JOIN food_sources s ON s.id = f.source_id
                        ORDER BY f.name, f.id""")
                .query((rs, i) -> new FoodRow(rs.getString("name"), rs.getString("preparation"),
                        rs.getBigDecimal("kcal"), rs.getBigDecimal("protein_g"), rs.getBigDecimal("carb_g"),
                        rs.getBigDecimal("fat_g"), rs.getBigDecimal("fiber_g"), rs.getString("source_name"),
                        rs.getString("source_ref"), rs.getBoolean("estimated"), rs.getString("item_url_template")))
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
                    .append("Nguồn: ").append(row.sourceText()).append('\n');
        }

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put(RagChunker.TYPE, RagChunker.TYPE_FOOD);
        metadata.put(RagChunker.SOURCE, SOURCE_FOODS);
        metadata.put(RagChunker.TITLE, TITLE);
        metadata.put(RagChunker.SECTION, name);
        metadata.put(RagChunker.URL, firstUrl(variants));
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

    /** The source page of the first row that has one, or "" (Document metadata rejects null). */
    private static String firstUrl(List<FoodRow> variants) {
        return variants.stream().map(FoodRow::url).filter(u -> u != null).findFirst().orElse("");
    }
}
