package dev.gnaspham1218.maifit.backend.food.dto;

// path is relative to the site root: the frontend shows it as "/" + path
public record FoodImageResponse(String path, String alt, String credit, String license, String sourceUrl) {
}
