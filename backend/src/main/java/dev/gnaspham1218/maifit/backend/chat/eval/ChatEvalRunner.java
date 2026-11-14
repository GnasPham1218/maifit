package dev.gnaspham1218.maifit.backend.chat.eval;

import dev.gnaspham1218.maifit.backend.chat.dto.ChatCalcItem;
import dev.gnaspham1218.maifit.backend.chat.dto.ChatCalculation;
import dev.gnaspham1218.maifit.backend.chat.dto.ChatSource;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatMessage;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;
import dev.gnaspham1218.maifit.backend.chat.service.ChatDecision;
import dev.gnaspham1218.maifit.backend.chat.service.ChatEngine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Duration;
import java.math.RoundingMode;
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
 * Each run makes one Gemini call per case that reaches the model (about 20), spaced out by
 * app.chat-eval.pause so a free-tier key (15 requests per minute) is not rate limited mid-run.
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
    private final Duration pause;

    public ChatEvalRunner(ApplicationContext context, ChatEngine engine,
                          @Value("${app.chat-eval.pause:4500ms}") Duration pause) {
        this.context = context;
        this.engine = engine;
        this.pause = pause;
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        Resource file = context.getResource(CASES);
        List<ChatEvalCase> cases = ChatEvalCaseParser.parse(file.getContentAsString(StandardCharsets.UTF_8));

        int failed = 0;
        boolean first = true;
        for (ChatEvalCase evalCase : cases) {
            if (!first) {
                pause();
            }
            first = false;
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
                    evalCase.question(), problem == null ? "" : "\n      -> " + problem + answerOf(decision));
        }
        log.info("Chat eval: {}/{} passed", cases.size() - failed, cases.size());

        int exitCode = failed == 0 ? 0 : 1;
        System.exit(SpringApplication.exit(context, () -> exitCode));
    }

    /** The answer text of a failed case, so a wrong answer can be read (test questions only, never user data). */
    private static String answerOf(ChatDecision decision) {
        if (decision == null || decision.answer().answer() == null) {
            return "";
        }
        return "\n      answer: " + decision.answer().answer().replace('\n', ' ');
    }

    /** Waits between cases: the run must measure the chat, not the free-tier rate limit. */
    private void pause() {
        try {
            Thread.sleep(pause);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    /** For a follow-up case: the previous question and its reply, as an unsaved history. */
    private List<ChatMessage> history(ChatEvalCase evalCase) {
        if (evalCase.previousQuestion().isEmpty()) {
            return List.of();
        }
        ChatDecision previous = engine.decide(evalCase.previousQuestion(), List.of(), ChatEngine.UNLIMITED,
                "eval line " + evalCase.line() + " (previous)");
        pause();   // a follow-up case makes two model calls
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
        String portions = checkPortions(evalCase.portions(), decision.calculation());
        if (portions != null) {
            return portions;
        }
        return checkNoArithmetic(answer, decision.calculation());
    }

    /** "Gạo tẻ=BOILED; Trứng gà=?": each food in the calculation, with that preparation or left open. */
    static String checkPortions(String spec, ChatCalculation calculation) {
        if (spec.isEmpty()) {
            return null;
        }
        List<ChatCalcItem> items = calculation == null ? List.of() : calculation.items();
        for (String part : spec.split(";")) {
            String[] foodAndPreparation = part.split("=", 2);
            String food = foodAndPreparation[0].strip();
            String wanted = foodAndPreparation.length > 1 ? foodAndPreparation[1].strip() : "";
            ChatCalcItem item = items.stream().filter(i -> i.food().equalsIgnoreCase(food)).findFirst().orElse(null);
            if (item == null) {
                return "no portion for " + food + "; got " + items.stream().map(ChatCalcItem::food).toList();
            }
            String got = item.preparation() == null ? "?" : item.preparation().name();
            if (!wanted.isEmpty() && !wanted.equals(got)) {
                return "portion " + food + ": preparation " + got + ", expected " + wanted;
            }
        }
        return null;
    }

    /**
     * The model must not do the arithmetic: a number calculated by code for an amount other than 100 g
     * (e.g. 260 kcal for 200 g of rice) must not appear in its text.
     */
    static String checkNoArithmetic(String answer, ChatCalculation calculation) {
        if (calculation == null) {
            return null;
        }
        List<BigDecimal> computed = new ArrayList<>();
        for (ChatCalcItem item : calculation.items()) {
            if (item.nutrition() != null && item.grams().compareTo(BigDecimal.valueOf(100)) != 0) {
                computed.add(item.nutrition().kcal());
            }
        }
        if (calculation.total() != null && calculation.items().size() > 1) {
            computed.add(calculation.total().kcal());
        }
        for (BigDecimal kcal : computed) {
            String whole = kcal.setScale(0, RoundingMode.HALF_UP).toPlainString();
            if (Pattern.compile("(?<![\\d,.])" + whole + "(?![\\d,])").matcher(answer).find()) {
                return "the answer contains " + whole + " kcal, calculated by the model instead of the app";
            }
        }
        return null;
    }
}
