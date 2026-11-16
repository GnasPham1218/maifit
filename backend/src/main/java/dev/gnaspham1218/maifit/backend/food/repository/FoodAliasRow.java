package dev.gnaspham1218.maifit.backend.food.repository;

// One row of food_aliases, read with a native query (there is no JPA entity for that table)
public interface FoodAliasRow {
    Long getFoodId();

    String getAlias();

    Boolean getLocksPreparation();
}
