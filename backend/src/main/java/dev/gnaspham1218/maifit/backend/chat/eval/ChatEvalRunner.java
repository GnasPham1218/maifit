package dev.gnaspham1218.maifit.backend.chat.eval;

import dev.gnaspham1218.maifit.backend.chat.dto.ChatSource;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatMessage;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;
import dev.gnaspham1218.maifit.backend.chat.service.ChatDecision;
import dev.gnaspham1218.maifit.backend.chat.service.ChatEngine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Runs the fixed test questions of chat-eval/cases.txt through the real ChatEngine (real Ollama, real
 * pgvector, real Gemini), prints PASS/FAIL per case and exits with code 1 if any case failed.
 * Nothing is saved and no quota is used. Run after every change to the prompt, the threshold or the sources:
 *   ./mvnw spring-boot:run -Dspring-boot.run.profiles=chat-eval
 * Each run makes one Gemini call per case that reaches the model (about 10).
 */
@Component
@Profile("chat-eval")
public class ChatEvalRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ChatEvalRunner.class);

    private static final String CASES = "classpath:chat-eval/cases.txt";
    private static final Long NO_CONVERSATION = 0L;   // history built in memory, never saved
    // An HTML tag in an answer: "<script", "</p", ...
    private static final Pattern HTML_TAG = Pattern.compile("<\\s*/?\\s*[a-zA-Z]");
    // Vietnamese diacritics: after NFD they are combining marks; "đ" has none
    private static final Pattern DIACRITIC = Pattern.compile("[\\p{M}đĐ]");

    private final ApplicationContext context;
    private final ChatEngine engine;

    public ChatEvalRunner(ApplicationContext context, ChatEngine engine) {
        this.context = context;
        this.engine = engine;
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        Resource file = context.getResource(CASES);
        List<ChatEvalCase> cases = ChatEvalCaseParser.parse(file.getContentAsString(StandardCharsets.UTF_8));

        int failed = 0;
        for (ChatEvalCase evalCase : cases) {
            String problem;
            ChatDecision decision = null;
            try {
                decision = engine.decide(evalCase.question(), history(evalCase), ChatEngine.UNLIMITED,
                        "eval line " + evalCase.line());
                problem = check(evalCase, decision);
            } catch (RuntimeException e) {
                problem = "error: " + e.getMessage();
            }
            if (problem != null) {
                failed++;
            }
            log.info("{} line {} | expected {} | got {} | score {} | model {} ms | {}{}",
                    problem == null ? "PASS" : "FAIL", evalCase.line(), evalCase.expected(),
                    decision == null ? "-" : decision.answer().outcome(),
                    decision == null || decision.topScore() == null ? "-" : String.format(Locale.ROOT, "%.3f", decision.topScore()),
                    decision == null || decision.modelMs() == null ? "-" : decision.modelMs(),
                    evalCase.question(), problem == null ? "" : "\n      -> " + problem);
        }
        log.info("Chat eval: {}/{} passed", cases.size() - failed, cases.size());

        int exitCode = failed == 0 ? 0 : 1;
        System.exit(SpringApplication.exit(context, () -> exitCode));
    }

    /** For a follow-up case: the previous question and its reply, as an unsaved history. */
    private List<ChatMessage> history(ChatEvalCase evalCase) {
        if (evalCase.previousQuestion().isEmpty()) {
            return List.of();
        }
        ChatDecision previous = engine.decide(evalCase.previousQuestion(), List.of(), ChatEngine.UNLIMITED,
                "eval line " + evalCase.line() + " (previous)");
        List<ChatMessage> history = new ArrayList<>();
        history.add(ChatMessage.question(NO_CONVERSATION, evalCase.previousQuestion()));
        history.add(ChatMessage.answer(NO_CONVERSATION, previous.answer().outcome(), previous.answer().answer(), null));
        return history;
    }

    /** Null when the case passes, otherwise what is wrong. */
    static String check(ChatEvalCase evalCase, ChatDecision decision) {
        ChatOutcome outcome = decision.answer().outcome();
        if (!evalCase.expected().contains(outcome)) {
            return "outcome " + outcome + " not in " + evalCase.expected();
        }
        if (outcome != ChatOutcome.ANSWERED) {
            return null;
        }
        String answer = decision.answer().answer();
        if (HTML_TAG.matcher(answer).find()) {
            return "the answer contains an HTML tag";
        }
        if (!DIACRITIC.matcher(Normalizer.normalize(answer, Normalizer.Form.NFD)).find()) {
            return "the answer is not Vietnamese with diacritics";
        }
        if (!evalCase.sourceSection().isEmpty()) {
            String wanted = evalCase.sourceSection().toLowerCase(Locale.ROOT);
            boolean cited = decision.sources().stream()
                    .map(ChatSource::section)
                    .anyMatch(section -> section.toLowerCase(Locale.ROOT).contains(wanted));
            if (!cited) {
                return "no cited section contains \"" + evalCase.sourceSection() + "\"; cited: "
                        + decision.sources().stream().map(ChatSource::section).toList();
            }
        }
        return null;
    }
}
