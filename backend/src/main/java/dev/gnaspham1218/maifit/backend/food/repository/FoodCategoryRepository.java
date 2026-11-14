package dev.gnaspham1218.maifit.backend.food.repository;

import dev.gnaspham1218.maifit.backend.food.entity.FoodCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FoodCategoryRepository extends JpaRepository<FoodCategory, Long> {

    List<FoodCategory> findAllByOrderBySortOrderAsc();
}
