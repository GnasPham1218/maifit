package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.food.entity.Preparation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Food names and aliases from the database, loaded once on first use.
 * Never stale: foods only change through a Flyway migration, which only runs when the app restarts.
 * Lazy (not at startup) so the app still starts if this query fails, and the chat-eval / ingest runs pay nothing.
 */
@Component
public class FoodNames {

    private static final Logger log = LoggerFactory.getLogger(FoodNames.class);

    private final JdbcClient jdbc;
    private record Loaded(FoodNameMatcher matcher, PreparationEvidence evidence) {
    }

    private volatile Loaded loaded;

    public FoodNames(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<String> find(String question, int limit) {
        return loaded().matcher().find(question, limit);
    }

    /** True when the question itself says this food is cooked this way (see PreparationEvidence). */
    public boolean isPreparationStated(String question, String food, Preparation preparation) {
        return loaded().evidence().isStated(question, food, preparation);
    }

    private Loaded loaded() {
        Loaded current = loaded;
        if (current == null) {
            synchronized (this) {
                current = loaded;
                if (current == null) {
                    current = load();
                    loaded = current;
                }
            }
        }
        return current;
    }

    private Loaded load() {
        List<Map.Entry<String, String>> rows = new ArrayList<>(jdbc.sql("SELECT DISTINCT name FROM foods")
                .query((rs, i) -> Map.entry(rs.getString(1), rs.getString(1)))
                .list());
        // Names first: when an alias equals another food's name, the name wins
        rows.addAll(jdbc.sql("SELECT a.alias, f.name FROM food_aliases a JOIN foods f ON f.id = a.food_id ORDER BY a.id")
                .query((rs, i) -> Map.entry(rs.getString(1), rs.getString(2)))
                .list());
        FoodNameMatcher matcher = FoodNameMatcher.of(rows);
        List<PreparationEvidence.LockedAlias> locked = jdbc.sql("""
                        SELECT f.name, f.preparation, a.alias
                        FROM food_aliases a JOIN foods f ON f.id = a.food_id
                        WHERE a.locks_preparation""")
                .query((rs, i) -> new PreparationEvidence.LockedAlias(rs.getString(1),
                        Preparation.valueOf(rs.getString(2)), rs.getString(3)))
                .list();
        log.info("Chat food names loaded: {} terms ({} usable without diacritics), {} aliases that fix a preparation",
                matcher.size(), matcher.plainSize(), locked.size());
        return new Loaded(matcher, new PreparationEvidence(locked));
    }
}
