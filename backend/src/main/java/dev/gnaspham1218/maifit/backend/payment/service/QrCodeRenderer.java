package dev.gnaspham1218.maifit.backend.payment.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;

import java.util.EnumMap;
import java.util.Map;

// Turns a VietQR payload (text) into an SVG image, on our server.
// Why here: the payment page then needs no third-party script, iframe or image host,
// so the strict Content-Security-Policy stays unchanged.
public final class QrCodeRenderer {

    private static final int QUIET_ZONE = 2; // white modules around the code so scanners find its edges

    private QrCodeRenderer() {
    }

    public static String toSvg(String payload) {
        Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
        hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
        hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
        hints.put(EncodeHintType.MARGIN, QUIET_ZONE);

        BitMatrix matrix;
        try {
            // Size 0x0 = one unit per module; the SVG viewBox scales it to any size without blur
            matrix = new QRCodeWriter().encode(payload, BarcodeFormat.QR_CODE, 0, 0, hints);
        } catch (WriterException e) {
            throw new IllegalStateException("Cannot encode QR code", e);
        }

        int size = matrix.getWidth();
        StringBuilder path = new StringBuilder();
        for (int y = 0; y < matrix.getHeight(); y++) {
            int x = 0;
            while (x < size) {
                if (!matrix.get(x, y)) {
                    x++;
                    continue;
                }
                int start = x;
                while (x < size && matrix.get(x, y)) {
                    x++;
                }
                // One rectangle per horizontal run of dark modules
                path.append('M').append(start).append(' ').append(y)
                        .append('h').append(x - start).append("v1h-").append(x - start).append('z');
            }
        }
        return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 " + size + " " + matrix.getHeight()
                + "\" shape-rendering=\"crispEdges\"><rect width=\"100%\" height=\"100%\" fill=\"#fff\"/>"
                + "<path d=\"" + path + "\" fill=\"#000\"/></svg>";
    }
}
