package dev.gnaspham1218.maifit.backend.profile.mapper;

import dev.gnaspham1218.maifit.backend.profile.dto.EnergyTargets;
import dev.gnaspham1218.maifit.backend.profile.dto.ProfileResponse;
import dev.gnaspham1218.maifit.backend.profile.entity.Profile;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.math.BigDecimal;

@Mapper
public interface ProfileMapper {

    // Fields of Profile are mapped by name; the computed values come from the extra parameters
    @Mapping(target = "age", source = "age")
    @Mapping(target = "latestWeightKg", source = "latestWeightKg")
    @Mapping(target = "energy", source = "energy")
    ProfileResponse toResponse(Profile profile, int age, BigDecimal latestWeightKg, EnergyTargets energy);
}
