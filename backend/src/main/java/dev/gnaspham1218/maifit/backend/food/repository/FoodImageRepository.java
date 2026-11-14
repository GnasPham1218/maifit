package dev.gnaspham1218.maifit.backend.food.repository;

import dev.gnaspham1218.maifit.backend.food.entity.FoodImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface FoodImageRepository extends JpaRepository<FoodImage, Long> {

    // Main photo first within each food
    List<FoodImage> findAllByOrderByFoodIdAscSortOrderAsc();

    List<FoodImage> findByFoodIdInOrderByFoodIdAscSortOrderAsc(Collection<Long> foodIds);
}
