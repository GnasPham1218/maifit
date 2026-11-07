package dev.gnaspham1218.maifit.backend.ai.controller;

import dev.gnaspham1218.maifit.backend.ai.dto.RecognizeResponse;
import dev.gnaspham1218.maifit.backend.ai.service.FoodVisionService;
import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/meals") // full path: /api/meals
@RequiredArgsConstructor
public class FoodVisionController {

    private final FoodVisionService foodVisionService;

    // POST /api/meals/recognize (multipart, field "image"): suggestions only, nothing is saved
    @PostMapping(value = "/recognize", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<RecognizeResponse> recognize(@AuthenticationPrincipal Jwt jwt,
                                                    @RequestPart("image") MultipartFile image) {
        Long userId = Long.valueOf(jwt.getSubject()); // same as MealController.userId()
        return ApiResponse.ok(foodVisionService.recognize(userId, image));
    }
}
