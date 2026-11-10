package dev.gnaspham1218.maifit.backend.user.service;

import dev.gnaspham1218.maifit.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

// "Is this user Premium right now?" Lives in user/ (not payment/) because Premium is a property
// of the account; features such as the AI limits ask here and know nothing about payments.
@Service
@RequiredArgsConstructor
public class PremiumService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public boolean isPremium(Long userId) {
        Instant until = premiumUntil(userId);
        return until != null && until.isAfter(Instant.now());
    }

    /** null = never had Premium. The value may be in the past (Premium ended). */
    @Transactional(readOnly = true)
    public Instant premiumUntil(Long userId) {
        return userRepository.findPremiumUntil(userId).orElse(null);
    }
}
