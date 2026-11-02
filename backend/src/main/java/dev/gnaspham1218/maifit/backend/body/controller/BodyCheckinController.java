package dev.gnaspham1218.maifit.backend.body.controller;

import dev.gnaspham1218.maifit.backend.body.dto.BodyCheckinResponse;
import dev.gnaspham1218.maifit.backend.body.dto.CreateBodyCheckinRequest;
import dev.gnaspham1218.maifit.backend.body.service.BodyCheckinService;
import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/body-checkins") // full path: /api/body-checkins
@RequiredArgsConstructor
public class BodyCheckinController {

    private final BodyCheckinService service;

    @PostMapping
    public ResponseEntity<ApiResponse<BodyCheckinResponse>> create(@AuthenticationPrincipal Jwt jwt,
                                                                   @Valid @RequestBody CreateBodyCheckinRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.create(userId(jwt), request)));
    }

    // GET /api/body-checkins?from=2026-10-01&to=2026-11-02
    @GetMapping
    public ApiResponse<List<BodyCheckinResponse>> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.ok(service.list(userId(jwt), from, to));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        service.delete(userId(jwt), id);
        return ApiResponse.ok("Check-in deleted", null);
    }

    private static Long userId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
