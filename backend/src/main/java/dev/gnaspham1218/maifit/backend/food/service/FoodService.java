package dev.gnaspham1218.maifit.backend.food.service;

import dev.gnaspham1218.maifit.backend.food.dto.FoodResponse;
import dev.gnaspham1218.maifit.backend.food.mapper.FoodMapper;
import dev.gnaspham1218.maifit.backend.food.repository.FoodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FoodService {

    private final FoodRepository repository;
    private final FoodMapper mapper;

    // The whole table (a few dozen rows, a few KB): the frontend searches it locally,
    // accent-insensitive ("ga" finds "gà"). Move search to the server (unaccent + pg_trgm)
    // only when the table grows to thousands of rows.
    @Transactional(readOnly = true)
    public List<FoodResponse> listAll() {
        return mapper.toResponses(repository.findAllByOrderByNameAscPreparationAsc());
    }
}
