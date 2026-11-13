package dev.gnaspham1218.maifit.backend.chat.controller;

import dev.gnaspham1218.maifit.backend.chat.dto.ChatAskRequest;
import dev.gnaspham1218.maifit.backend.chat.dto.ChatReplyResponse;
import dev.gnaspham1218.maifit.backend.chat.service.ChatService;
import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/chat") // full path: /api/chat
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    // POST /api/chat/messages  {"conversationId": 12, "question": "..."}  (no conversationId = new conversation)
    // 200 for answers AND refusals: a refusal is a normal result, its reason is in "outcome"
    @PostMapping("/messages")
    public ApiResponse<ChatReplyResponse> ask(@AuthenticationPrincipal Jwt jwt,
                                              @Valid @RequestBody ChatAskRequest request) {
        return ApiResponse.ok(chatService.ask(userId(jwt), request.conversationId(), request.question()));
    }

    private static Long userId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
