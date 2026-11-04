package dev.gnaspham1218.maifit.backend.meal.service;

import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.common.time.AppTime;
import dev.gnaspham1218.maifit.backend.food.entity.Food;
import dev.gnaspham1218.maifit.backend.food.repository.FoodRepository;
import dev.gnaspham1218.maifit.backend.meal.dto.CreateMealRequest;
import dev.gnaspham1218.maifit.backend.meal.dto.DailyKcal;
import dev.gnaspham1218.maifit.backend.meal.dto.DailyMealsResponse;
import dev.gnaspham1218.maifit.backend.meal.dto.MealItemRequest;
import dev.gnaspham1218.maifit.backend.meal.dto.MealResponse;
import dev.gnaspham1218.maifit.backend.meal.dto.MonthlySummaryResponse;
import dev.gnaspham1218.maifit.backend.meal.dto.UpdateMealItemRequest;
import dev.gnaspham1218.maifit.backend.meal.entity.MealItem;
import dev.gnaspham1218.maifit.backend.meal.entity.MealLog;
import dev.gnaspham1218.maifit.backend.meal.mapper.MealResponseMapper;
import dev.gnaspham1218.maifit.backend.meal.repository.MealLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MealService {

    static final int MAX_ITEMS_PER_MEAL = 30;
    // Keeps GET /meals?date= small (bounded response, no pagination needed) and stops spam
    static final int MAX_MEALS_PER_DAY = 10;
    // Small tolerance for a phone clock that runs a bit fast
    private static final Duration FUTURE_TOLERANCE = Duration.ofMinutes(5);

    private final MealLogRepository mealRepository;
    private final FoodRepository foodRepository;
    private final MealResponseMapper mapper;

    @Transactional
    public MealResponse create(Long userId, CreateMealRequest req) {
        Instant eatenAt = resolveEatenAt(req.eatenAt());
        checkDailyLimit(userId, eatenAt);
        Map<Long, Food> foods = loadFoods(req.items().stream().map(MealItemRequest::foodId).toList());

        MealLog meal = new MealLog(userId, eatenAt, req.mealType());
        for (MealItemRequest item : req.items()) {
            meal.addItem(foods.get(item.foodId()), item.grams(), item.aiGrams()); // aiGrams null = typed by hand
        }
        return mapper.toResponse(mealRepository.save(meal)); // cascade inserts the items
    }

    // date = calendar day in Vietnam time, default today
    @Transactional(readOnly = true)
    public DailyMealsResponse listDay(Long userId, LocalDate date) {
        LocalDate day = date != null ? date : LocalDate.now(AppTime.ZONE);
        Instant from = day.atStartOfDay(AppTime.ZONE).toInstant();
        Instant to = day.plusDays(1).atStartOfDay(AppTime.ZONE).toInstant(); // exclusive

        List<MealResponse> meals = mealRepository.findWithItemsBetween(userId, from, to).stream()
                .map(mapper::toResponse)
                .toList();
        return new DailyMealsResponse(day,
                NutritionCalculator.sum(meals.stream().map(MealResponse::totals).toList()),
                meals);
    }

    // month = calendar month in Vietnam time, default this month
    @Transactional(readOnly = true)
    public MonthlySummaryResponse monthlySummary(Long userId, YearMonth month) {
        YearMonth m = month != null ? month : YearMonth.now(AppTime.ZONE);
        Instant from = m.atDay(1).atStartOfDay(AppTime.ZONE).toInstant();
        Instant to = m.plusMonths(1).atDay(1).atStartOfDay(AppTime.ZONE).toInstant(); // exclusive
        List<DailyKcal> days = mealRepository.sumKcalPerDay(userId, from, to, AppTime.ZONE.getId()).stream()
                .map(row -> new DailyKcal(toLocalDate(row[0]), (BigDecimal) row[1]))
                .toList();
        return new MonthlySummaryResponse(m.toString(), days);
    }

    @Transactional
    public MealResponse addItem(Long userId, Long mealId, MealItemRequest req) {
        MealLog meal = findOwned(userId, mealId);
        if (meal.getItems().size() >= MAX_ITEMS_PER_MEAL) {
            throw new AppException(ErrorCode.MEAL_ITEMS_LIMIT);
        }
        Food food = foodRepository.findById(req.foodId())
                .orElseThrow(() -> new AppException(ErrorCode.FOOD_NOT_FOUND));
        meal.addItem(food, req.grams(), req.aiGrams());
        // flush now so the new item gets its id before we build the response
        return mapper.toResponse(mealRepository.saveAndFlush(meal));
    }

    @Transactional
    public MealResponse updateItemGrams(Long userId, Long mealId, Long itemId, UpdateMealItemRequest req) {
        MealLog meal = findOwned(userId, mealId);
        findItem(meal, itemId).changeGrams(req.grams()); // saved by dirty checking at commit
        return mapper.toResponse(meal);
    }

    @Transactional
    public void removeItem(Long userId, Long mealId, Long itemId) {
        MealLog meal = findOwned(userId, mealId);
        meal.removeItem(findItem(meal, itemId)); // orphanRemoval deletes the row
        if (meal.getItems().isEmpty()) {
            mealRepository.delete(meal); // never keep an empty meal
        }
    }

    @Transactional
    public void delete(Long userId, Long mealId) {
        // Priority 2: also delete the photo file (photo_key) here
        mealRepository.delete(findOwned(userId, mealId));
    }

    // Counted per calendar day (Vietnam time) of eatenAt, so back-filling yesterday counts for yesterday.
    // Soft limit: two requests at the exact same moment could both pass and make it 11.
    // That is harmless here (no money involved), unlike the AI limit which uses an atomic upsert.
    private void checkDailyLimit(Long userId, Instant eatenAt) {
        LocalDate day = LocalDate.ofInstant(eatenAt, AppTime.ZONE);
        Instant from = day.atStartOfDay(AppTime.ZONE).toInstant();
        Instant to = day.plusDays(1).atStartOfDay(AppTime.ZONE).toInstant();
        if (mealRepository.countByUserIdAndEatenAtGreaterThanEqualAndEatenAtLessThan(userId, from, to)
                >= MAX_MEALS_PER_DAY) {
            throw new AppException(ErrorCode.MEAL_DAILY_LIMIT);
        }
    }

    private MealLog findOwned(Long userId, Long mealId) {
        return mealRepository.findByIdAndUserId(mealId, userId)
                // 404 (not 403) so nobody can probe which ids exist
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));
    }

    private static MealItem findItem(MealLog meal, Long itemId) {
        return meal.findItem(itemId).orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));
    }

    // One query for all foods of the request; any unknown id -> 400
    private Map<Long, Food> loadFoods(List<Long> foodIds) {
        List<Long> distinctIds = foodIds.stream().distinct().toList();
        Map<Long, Food> foods = foodRepository.findAllById(distinctIds).stream()
                .collect(Collectors.toMap(Food::getId, Function.identity()));
        if (foods.size() != distinctIds.size()) {
            throw new AppException(ErrorCode.FOOD_NOT_FOUND);
        }
        return foods;
    }

    // The JDBC driver may return a DATE column as java.sql.Date or LocalDate depending on the version
    private static LocalDate toLocalDate(Object value) {
        return value instanceof java.sql.Date d ? d.toLocalDate() : (LocalDate) value;
    }

    private static Instant resolveEatenAt(Instant requested) {
        Instant now = Instant.now();
        Instant eatenAt = requested != null ? requested : now;
        if (eatenAt.isAfter(now.plus(FUTURE_TOLERANCE))) {
            throw new AppException(ErrorCode.MEAL_IN_FUTURE);
        }
        return eatenAt;
    }
}
