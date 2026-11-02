package dev.gnaspham1218.maifit.backend.body.mapper;

import dev.gnaspham1218.maifit.backend.body.dto.BodyCheckinResponse;
import dev.gnaspham1218.maifit.backend.body.entity.BodyCheckin;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper
public interface BodyCheckinMapper {

    BodyCheckinResponse toResponse(BodyCheckin checkin);

    List<BodyCheckinResponse> toResponses(List<BodyCheckin> checkins);
}
