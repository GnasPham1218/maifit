package dev.gnaspham1218.maifit.backend.chat.service;

import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Refuses health questions in code, before retrieval and before the model.
 * Why not leave it to the model: the sources mention patients (e.g. creatine and diabetes), so the
 * model found an "answer" and gave advice to a user who said they were ill (test of 2026-11-13).
 * A word list can block a harmless question ("thuốc lá"); for health advice that is the safe side.
 * The system prompt stays as a second layer for phrasings this list misses.
 */
@Component
public class MedicalQuestionGuard {

    /** Diseases, symptoms, medicines, pregnancy. Whole words only: "thận" never matches "thân". */
    private static final List<String> TERMS = List.of(
            // Vietnamese, with diacritics
            "bệnh", "tiểu đường", "đái tháo đường", "huyết áp", "mỡ máu", "gút", "thuốc",
            "mang thai", "có thai", "thai kỳ", "mẹ bầu", "đang bầu", "cho con bú", "sau sinh",
            "ung thư", "suy thận", "sỏi thận", "chức năng thận", "gan nhiễm mỡ", "men gan",
            "tim mạch", "đột quỵ", "tiền sử", "triệu chứng", "chẩn đoán", "điều trị", "kê đơn",
            "dị ứng", "hen suyễn", "trầm cảm", "rối loạn", "viêm", "nhiễm trùng",
            // Vietnamese typed without diacritics: only phrases that cannot be another common word
            // ("thuoc" is left out: it is also "thuộc")
            "benh", "tieu duong", "dai thao duong", "huyet ap", "mo mau", "mang thai", "co thai",
            "ung thu", "suy than", "soi than", "trieu chung", "chan doan", "dieu tri", "di ung", "tram cam",
            // English
            "disease", "diabetes", "diabetic", "pregnant", "pregnancy", "cancer", "medication",
            "medicine", "blood pressure", "cholesterol", "gout");

    private final Pattern pattern;

    public MedicalQuestionGuard() {
        String alternatives = TERMS.stream()
                .map(MedicalQuestionGuard::normalize)
                .map(Pattern::quote)
                .collect(Collectors.joining("|"));
        // (?<!letter)...(?!letter): the term must not be part of a longer word
        this.pattern = Pattern.compile("(?<![\\p{L}\\p{N}])(?:" + alternatives + ")(?![\\p{L}\\p{N}])");
    }

    public boolean isMedical(String question) {
        return pattern.matcher(normalize(question)).find();
    }

    /**
     * Same form for the terms and the question: composed characters (some keyboards send "e" + combining
     * accent instead of "é") and lower case.
     */
    private static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFC).toLowerCase(Locale.ROOT);
    }
}
