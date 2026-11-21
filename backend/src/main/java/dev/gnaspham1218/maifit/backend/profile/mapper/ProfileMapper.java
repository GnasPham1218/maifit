package dev.gnaspham1218.maifit.backend.profile.mapper;

import dev.gnaspham1218.maifit.backend.profile.dto.EnergyTargets;
import dev.gnaspham1218.maifit.backend.profile.dto.ExcludedFoodResponse;
import dev.gnaspham1218.maifit.backend.profile.dto.ProfileResponse;
import dev.gnaspham1218.maifit.backend.profile.entity.Profile;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.math.BigDecimal;
import java.util.List;

@Mapper
public interface ProfileMapper {

    // Fields of Profile are mapped by name; the computed values come from the extra parameters
    @Mapping(target = "age", source = "age")
    @Mapping(target = "latestWeightKg", source = "latestWeightKg")
    @Mapping(target = "latestBodyFatPct", source = "latestBodyFatPct")
    @Mapping(target = "energy", source = "energy")
    @Mapping(target = "allergens", source = "allergens")
    @Mapping(target = "excludedFoods", source = "excludedFoods")
    @Mapping(target = "coachComplete", source = "profile.coachComplete")
    ProfileResponse toResponse(Profile profile, int age, BigDecimal latestWeightKg, BigDecimal latestBodyFatPct,
                               EnergyTargets energy,
                               List<String> allergens, List<ExcludedFoodResponse> excludedFoods);
}
