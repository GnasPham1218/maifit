package dev.gnaspham1218.maifit.backend.chat.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.text.Normalizer;

import static org.assertj.core.api.Assertions.assertThat;

class MedicalQuestionGuardTest {

    private final MedicalQuestionGuard guard = new MedicalQuestionGuard();

    @ParameterizedTest
    @ValueSource(strings = {
            "Tôi bị tiểu đường type 2, có nên uống creatine không?",   // the question that got an answer
            "toi bi tieu duong co nen uong creatine khong",
            "Bị cao HUYẾT ÁP thì tập tạ được không?",
            "Đang mang thai có nên ăn nhiều đạm?",
            "Uống thuốc giảm cân có hiệu quả không?",
            "Bệnh gout nên ăn gì?",
            "I am diabetic, how much protein?"})
    void healthQuestionsAreRefused(String question) {
        assertThat(guard.isMedical(question)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Nên ăn bao nhiêu protein mỗi ngày khi tập tạ?",
            "Creatine có an toàn không?",
            "Thân hình gầy thì nên ăn gì để tăng cân?",   // "thân" is not "thận"
            "Ăn gan heo có nhiều đạm không?",               // liver as food is nutrition
            "Yến mạch thuộc nhóm tinh bột nào?",            // "thuộc" is not "thuốc"
            "Nhịn ăn gián đoạn có giúp giảm mỡ không?"})
    void trainingAndNutritionQuestionsPass(String question) {
        assertThat(guard.isMedical(question)).isFalse();
    }

    @Test
    void decomposedAccentsAreMatchedToo() {
        String decomposed = Normalizer.normalize("Tôi bị tiểu đường", Normalizer.Form.NFD);

        assertThat(guard.isMedical(decomposed)).isTrue();
    }
}
