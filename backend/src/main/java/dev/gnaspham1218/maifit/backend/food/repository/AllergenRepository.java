package dev.gnaspham1218.maifit.backend.food.repository;

import dev.gnaspham1218.maifit.backend.food.entity.Allergen;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AllergenRepository extends JpaRepository<Allergen, String> {

    List<Allergen> findAllByOrderBySortOrderAsc();
}
