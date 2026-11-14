package dev.gnaspham1218.maifit.backend.food.repository;

import dev.gnaspham1218.maifit.backend.food.entity.FoodSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FoodSourceRepository extends JpaRepository<FoodSource, Long> {

    List<FoodSource> findAllByOrderByIdAsc();
}
