package dev.gnaspham1218.maifit.backend.food.mapper;

import dev.gnaspham1218.maifit.backend.food.dto.FoodResponse;
import dev.gnaspham1218.maifit.backend.food.entity.Food;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper
public interface FoodMapper {

    FoodResponse toResponse(Food food);

    List<FoodResponse> toResponses(List<Food> foods);
}
