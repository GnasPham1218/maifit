package dev.gnaspham1218.maifit.backend.workout.controller;

import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import dev.gnaspham1218.maifit.backend.workout.dto.LeaderboardResponse;
import dev.gnaspham1218.maifit.backend.workout.entity.WorkoutExercise;
import dev.gnaspham1218.maifit.backend.workout.service.LeaderboardPeriod;
import dev.gnaspham1218.maifit.backend.workout.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/leaderboard") // full path: /api/leaderboard
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService service;

    // GET /api/leaderboard?exercise=PUSH_UP&period=WEEK -> top 20 + the caller's rank + streak
    @GetMapping
    public ApiResponse<LeaderboardResponse> get(@AuthenticationPrincipal Jwt jwt,
                                                @RequestParam WorkoutExercise exercise,
                                                @RequestParam(defaultValue = "WEEK") LeaderboardPeriod period) {
        return ApiResponse.ok(service.get(Long.valueOf(jwt.getSubject()), exercise, period));
    }
}
