package dev.gnaspham1218.maifit.backend.chat.service;

/**
 * One food amount the model read from the question (structured output). Untrusted: checked by ModelAnswerValidator.
 * The model never calculates: code does, from the foods table.
 *
 * @param excerpt     number of the food excerpt ("Thực phẩm: ...") the food comes from, 1-based
 * @param preparation RAW, BOILED, STEAMED, FRIED, BRAISED or GRILLED; null when the question does not say
 * @param grams       edible grams, from the question or estimated
 * @param estimated   true when the model estimated the grams
 */
public record ModelPortion(Integer excerpt, String preparation, Double grams, Boolean estimated) {
}
