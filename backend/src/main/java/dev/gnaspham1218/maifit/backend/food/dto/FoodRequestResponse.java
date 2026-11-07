package dev.gnaspham1218.maifit.backend.food.dto;

/**
 * @param result         what happened to this report
 * @param remainingToday how many more foods this user can report today
 */
public record FoodRequestResponse(Result result, int remainingToday) {

    public enum Result {
        RECORDED,         // new vote counted
        ALREADY_REPORTED, // this user already reported this name: nothing changed
        FOOD_EXISTS       // the name matches a food or alias we have: pick it instead
    }
}
