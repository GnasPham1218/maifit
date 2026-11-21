package dev.gnaspham1218.maifit.backend.food.service;

import dev.gnaspham1218.maifit.backend.food.dto.AllergenResponse;
import dev.gnaspham1218.maifit.backend.food.repository.AllergenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AllergenService {

    private final AllergenRepository repository;

    /** Every allergen group in display order (profile checkboxes, the "about allergen data" page). */
    @Transactional(readOnly = true)
    public List<AllergenResponse> list() {
        return repository.findAllByOrderBySortOrderAsc().stream()
                .map(a -> new AllergenResponse(a.getCode(), a.getName(), a.getExamples()))
                .toList();
    }
}
