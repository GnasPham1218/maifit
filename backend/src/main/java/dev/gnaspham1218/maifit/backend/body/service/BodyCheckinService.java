package dev.gnaspham1218.maifit.backend.body.service;

import dev.gnaspham1218.maifit.backend.body.dto.BodyCheckinResponse;
import dev.gnaspham1218.maifit.backend.body.dto.CreateBodyCheckinRequest;
import dev.gnaspham1218.maifit.backend.body.entity.BodyCheckin;
import dev.gnaspham1218.maifit.backend.body.mapper.BodyCheckinMapper;
import dev.gnaspham1218.maifit.backend.body.repository.BodyCheckinRepository;
import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.common.time.AppTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BodyCheckinService {

    static final int DEFAULT_RANGE_DAYS = 90;
    static final int MAX_RANGE_DAYS = 366;
    // Small tolerance for a phone clock that runs a bit fast
    private static final Duration FUTURE_TOLERANCE = Duration.ofMinutes(5);

    private final BodyCheckinRepository repository;
    private final BodyCheckinMapper mapper;

    @Transactional
    public BodyCheckinResponse create(Long userId, CreateBodyCheckinRequest req) {
        Instant now = Instant.now();
        Instant checkedAt = req.checkedAt() != null ? req.checkedAt() : now;
        if (checkedAt.isAfter(now.plus(FUTURE_TOLERANCE))) {
            throw new AppException(ErrorCode.CHECKIN_IN_FUTURE);
        }
        BodyCheckin saved = repository.save(new BodyCheckin(
                userId, checkedAt, req.weightKg(), req.bodyFatPct(), req.waistCm(), blankToNull(req.note())));
        return mapper.toResponse(saved);
    }

    // from / to are calendar days in Vietnam time, both inclusive. Default: the last 90 days.
    @Transactional(readOnly = true)
    public List<BodyCheckinResponse> list(Long userId, LocalDate from, LocalDate to) {
        LocalDate end = to != null ? to : LocalDate.now(AppTime.ZONE);
        LocalDate start = from != null ? from : end.minusDays(DEFAULT_RANGE_DAYS - 1);
        if (start.isAfter(end) || ChronoUnit.DAYS.between(start, end) >= MAX_RANGE_DAYS) {
            throw new AppException(ErrorCode.INVALID_DATE_RANGE);
        }
        Instant fromInstant = start.atStartOfDay(AppTime.ZONE).toInstant();
        Instant toInstant = end.plusDays(1).atStartOfDay(AppTime.ZONE).toInstant(); // exclusive
        return mapper.toResponses(repository
                .findByUserIdAndCheckedAtGreaterThanEqualAndCheckedAtLessThanOrderByCheckedAtAsc(
                        userId, fromInstant, toInstant));
    }

    @Transactional
    public void delete(Long userId, Long checkinId) {
        BodyCheckin checkin = repository.findByIdAndUserId(checkinId, userId)
                // 404 (not 403) so nobody can probe which ids exist
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));
        // Priority 4: delete the body photos of this check-in here as well
        repository.delete(checkin);
    }

    // Latest check-in: current weight (and body fat % if measured) for the TDEE calculation
    @Transactional(readOnly = true)
    public Optional<BodyCheckinResponse> findLatest(Long userId) {
        return repository.findFirstByUserIdOrderByCheckedAtDesc(userId).map(mapper::toResponse);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
