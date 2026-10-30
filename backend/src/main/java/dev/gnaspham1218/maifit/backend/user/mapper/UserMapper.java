package dev.gnaspham1218.maifit.backend.user.mapper;

import dev.gnaspham1218.maifit.backend.user.dto.UserResponse;
import dev.gnaspham1218.maifit.backend.user.entity.User;
import org.mapstruct.Mapper;

@Mapper
public interface UserMapper {

    UserResponse toResponse(User user); // Role (enum) -> String via name()
}
