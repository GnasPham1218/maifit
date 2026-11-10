package dev.gnaspham1218.maifit.backend.payment.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class QrCodeRendererTest {

    @Test
    void rendersASquareSvgWithDarkModules() {
        String svg = QrCodeRenderer.toSvg("00020101021238540010A000000727012400069704220110012345678902");

        assertThat(svg).startsWith("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 ");
        assertThat(svg).contains("<path d=\"M");
        assertThat(svg).endsWith("</svg>");
        // Nothing a browser could execute
        assertThat(svg).doesNotContain("<script").doesNotContain("href");
    }

    @Test
    void samePayloadGivesTheSameImage() {
        assertThat(QrCodeRenderer.toSvg("MAIFit")).isEqualTo(QrCodeRenderer.toSvg("MAIFit"));
    }
}
