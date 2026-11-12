package dev.gnaspham1218.maifit.backend.chat.entity;

/**
 * Result of one question. Every value but ANSWERED is a refusal: the frontend shows its own fixed
 * Vietnamese text for it, the model never writes the refusal itself.
 */
public enum ChatOutcome {
    /** Answered from the retrieved chunks, with citations. */
    ANSWERED,
    /** Nothing relevant was retrieved, or the chunks do not contain the answer. */
    NO_INFO,
    /** About a disease, a medicine or a diagnosis: the user is sent to a doctor. */
    MEDICAL,
    /** Not about nutrition or training at all. */
    OUT_OF_SCOPE
}
