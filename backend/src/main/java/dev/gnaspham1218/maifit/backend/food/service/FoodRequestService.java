package dev.gnaspham1218.maifit.backend.food.service;

import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.common.time.AppTime;
import dev.gnaspham1218.maifit.backend.food.dto.FoodRequestResponse;
import dev.gnaspham1218.maifit.backend.food.dto.FoodRequestResponse.Result;
import dev.gnaspham1218.maifit.backend.food.repository.FoodRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.util.Collection;

/**
 * "Báo thiếu món". Duplicates are handled by the database (UNIQUE normalized name + ON CONFLICT),
 * spam by one vote per user per name and a daily limit per user.
 * A request never carries calories: the food is added later by migration, from a cited source.
 */
@Service
public class FoodRequestService {

    private static final Logger log = LoggerFactory.getLogger(FoodRequestService.class);
    private static final int MAX_NAME_LENGTH = 60;

    private final FoodRequestRepository repo;
    private final int dailyLimit;

    public FoodRequestService(FoodRequestRepository repo,
                              @Value("${app.food-request.daily-limit:5}") int dailyLimit) {
        this.repo = repo;
        this.dailyLimit = dailyLimit;
    }

    @Transactional
    public FoodRequestResponse report(Long userId, String rawName) {
        String name = rawName.strip();
        repo.lockUser(userId); // the checks below and the insert happen as one step for this user
        int usedToday = repo.countVotesSince(userId, startOfToday());

        if (repo.matchesExistingFood(name)) {
            return new FoodRequestResponse(Result.FOOD_EXISTS, remaining(usedToday));
        }
        // Checked before the limit: repeating a report you already made is harmless and costs nothing
        if (repo.hasVoted(userId, name)) {
            return new FoodRequestResponse(Result.ALREADY_REPORTED, remaining(usedToday));
        }
        if (usedToday >= dailyLimit) {
            throw new AppException(ErrorCode.FOOD_REQUEST_DAILY_LIMIT,
                    "At most " + dailyLimit + " missing foods can be reported per day");
        }

        long requestId = repo.upsertUserRequest(name);
        boolean counted = repo.addVote(requestId, userId);
        return new FoodRequestResponse(counted ? Result.RECORDED : Result.ALREADY_REPORTED,
                remaining(counted ? usedToday + 1 : usedToday));
    }

    /**
     * Names the photo AI saw but could not map to a food. Own transaction and never throws:
     * this bookkeeping must not break the recognition answer the user is waiting for.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordAiMisses(Collection<String> names) {
        for (String raw : names) {
            String name = raw == null ? "" : raw.strip();
            if (name.length() < 2 || name.length() > MAX_NAME_LENGTH) continue;
            try {
                repo.recordAiMiss(name);
            } catch (RuntimeException e) {
                // e.g. a name the CHECK refuses; the transaction may be unusable now, so stop here
                log.warn("Could not record AI miss '{}'", name, e);
                return;
            }
        }
    }

    private int remaining(int used) {
        return Math.max(dailyLimit - used, 0);
    }

    private static OffsetDateTime startOfToday() {
        return ZonedDateTime.now(AppTime.ZONE).toLocalDate().atStartOfDay(AppTime.ZONE).toOffsetDateTime();
    }
}
