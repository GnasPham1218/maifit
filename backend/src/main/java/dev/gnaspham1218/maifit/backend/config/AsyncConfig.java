package dev.gnaspham1218.maifit.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

// Turns on @Async: annotated methods run on Spring Boot's task executor (a background thread pool)
@Configuration
@EnableAsync
public class AsyncConfig {
}
