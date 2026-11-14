package dev.gnaspham1218.maifit.backend.chat.controller;

import dev.gnaspham1218.maifit.backend.ai.dto.AiQuota;
import dev.gnaspham1218.maifit.backend.ai.entity.AiFeature;
import dev.gnaspham1218.maifit.backend.ai.service.AiUsageService;
import dev.gnaspham1218.maifit.backend.chat.dto.ChatAskRequest;
import dev.gnaspham1218.maifit.backend.chat.dto.ChatCalculation;
import dev.gnaspham1218.maifit.backend.chat.dto.ChatConversationResponse;
import dev.gnaspham1218.maifit.backend.chat.dto.ChatMessageResponse;
import dev.gnaspham1218.maifit.backend.chat.dto.ChatReplyResponse;
import dev.gnaspham1218.maifit.backend.chat.dto.UpdateCalculationRequest;
import dev.gnaspham1218.maifit.backend.chat.service.ChatHistoryService;
import dev.gnaspham1218.maifit.backend.chat.service.ChatService;
import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/chat") // full path: /api/chat
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final ChatHistoryService historyService;
    private final AiUsageService aiUsageService;

    // POST /api/chat/messages  {"conversationId": 12, "question": "..."}  (no conversationId = new conversation)
    // 200 for answers AND refusals: a refusal is a normal result, its reason is in "outcome"
    @PostMapping("/messages")
    public ApiResponse<ChatReplyResponse> ask(@AuthenticationPrincipal Jwt jwt,
                                              @Valid @RequestBody ChatAskRequest request) {
        return ApiResponse.ok(chatService.ask(userId(jwt), request.conversationId(), request.question()));
    }

    // PUT /api/chat/messages/{messageId}/calculation  {"items": [{"food": "Gạo tẻ", "preparation": "BOILED",
    // "grams": 200, "estimated": false}]}. The corrected list; code recalculates. No AI call, no quota.
    // data is null when the list is empty (the calculation was removed)
    @PutMapping("/messages/{messageId}/calculation")
    public ApiResponse<ChatCalculation> updateCalculation(@AuthenticationPrincipal Jwt jwt, @PathVariable Long messageId,
                                                          @Valid @RequestBody UpdateCalculationRequest request) {
        return ApiResponse.ok(historyService.updateCalculation(messageId, userId(jwt), request.items()));
    }

    // GET /api/chat/quota: today's limit and calls left, so the page can show them before the first question
    @GetMapping("/quota")
    public ApiResponse<AiQuota> quota(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok(aiUsageService.quota(userId(jwt), AiFeature.CHAT));
    }

    // GET /api/chat/conversations: my latest conversations, most recently used first
    @GetMapping("/conversations")
    public ApiResponse<List<ChatConversationResponse>> conversations(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok(historyService.listConversations(userId(jwt)));
    }

    // GET /api/chat/conversations/{id}/messages: someone else's conversation answers 404
    @GetMapping("/conversations/{id}/messages")
    public ApiResponse<List<ChatMessageResponse>> messages(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return ApiResponse.ok(historyService.listMessages(id, userId(jwt)));
    }

    // DELETE /api/chat/conversations/{id}: the conversation and all its messages
    @DeleteMapping("/conversations/{id}")
    public ApiResponse<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        historyService.deleteConversation(id, userId(jwt));
        return ApiResponse.ok("Conversation deleted", null);
    }

    private static Long userId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
