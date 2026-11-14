package dev.gnaspham1218.maifit.backend.user.service;

import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.user.dto.UserResponse;
import dev.gnaspham1218.maifit.backend.user.entity.AccentColor;
import dev.gnaspham1218.maifit.backend.user.entity.User;
import dev.gnaspham1218.maifit.backend.user.mapper.UserMapper;
import dev.gnaspham1218.maifit.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Transactional(readOnly = true)
    public UserResponse getById(Long userId) {
        return userRepository.findById(userId)
                .map(userMapper::toResponse)
                // Valid token but the account no longer exists: treat as not logged in
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
    }

    // Dirty checking saves the change at the end of the transaction
    @Transactional
    public UserResponse changeAccentColor(Long userId, AccentColor accentColor) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
        user.changeAccentColor(accentColor);
        return userMapper.toResponse(user);
    }
}
