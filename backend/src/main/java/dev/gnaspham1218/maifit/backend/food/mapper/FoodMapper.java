package dev.gnaspham1218.maifit.backend.food.mapper;

import dev.gnaspham1218.maifit.backend.food.dto.FoodCategoryResponse;
import dev.gnaspham1218.maifit.backend.food.dto.FoodImageResponse;
import dev.gnaspham1218.maifit.backend.food.dto.FoodResponse;
import dev.gnaspham1218.maifit.backend.food.dto.FoodSourceResponse;
import dev.gnaspham1218.maifit.backend.food.dto.FoodVariantResponse;
import dev.gnaspham1218.maifit.backend.food.entity.Food;
import dev.gnaspham1218.maifit.backend.food.entity.FoodCategory;
import dev.gnaspham1218.maifit.backend.food.entity.FoodImage;
import dev.gnaspham1218.maifit.backend.food.entity.FoodSource;
import org.springframework.stereotype.Component;

import java.util.List;

// Hand-written (was MapStruct): the responses now join several entities and compute the source link
@Component
public class FoodMapper {

    public FoodResponse toResponse(Food f, FoodImage mainImage) {
        return new FoodResponse(f.getId(), f.getName(), f.getPreparation(), f.getKcal(),
                f.getProteinG(), f.getCarbG(), f.getFatG(), f.getFiberG(),
                f.getCategory().getId(), f.getSource().getId(), f.getSource().getName(), f.getSourceRef(),
                f.isEstimated(), f.getLeanVersionId(), mainImage == null ? null : toImage(mainImage));
    }

    public FoodVariantResponse toVariant(Food f, List<FoodImage> images) {
        return new FoodVariantResponse(f.getId(), f.getPreparation(), f.getKcal(),
                f.getProteinG(), f.getCarbG(), f.getFatG(), f.getFiberG(),
                toSource(f.getSource()), f.getSourceRef(), f.getSourceDescription(), f.getSourceUrl(),
                f.isSourceApproximate(), f.isEstimated(), f.getSourceNote(), f.getLeanVersionId(),
                images.stream().map(FoodMapper::toImage).toList());
    }

    public FoodCategoryResponse toCategory(FoodCategory c) {
        return new FoodCategoryResponse(c.getId(), c.getCode(), c.getName());
    }

    public FoodSourceResponse toSource(FoodSource s) {
        return new FoodSourceResponse(s.getId(), s.getCode(), s.getName(), s.getPublisher(), s.getUrl(), s.getLicense());
    }

    private static FoodImageResponse toImage(FoodImage i) {
        return new FoodImageResponse(i.getPath(), i.getAlt(), i.getCredit(), i.getLicense(), i.getSourceUrl());
    }
}
