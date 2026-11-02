package dev.gnaspham1218.maifit.backend.common.time;

import java.time.ZoneId;

// Day/week/month boundaries (age, check-in ranges, leaderboard) follow Vietnam time, not UTC
public final class AppTime {

    public static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private AppTime() {
    }
}
