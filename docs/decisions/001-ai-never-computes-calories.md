<sub>[MAIFit](../../README.md) / [Docs](../README.md) / [Decisions](README.md) / ADR 001</sub>

# 001. The AI never computes calories

- **Status:** Accepted

## Context

Calorie tracking apps that use AI often ask a vision model for the calories of a meal. The number looks precise, but it cannot be traced to a source, it changes between two runs on the same photo, and a user who knows the meal was 200 g of rice instead of 150 g has no way to fix only that part. Language models are also unreliable at arithmetic.

## Decision

Models only do the language and vision part: **which foods, which preparation, how many grams**. Every calorie and macro value comes from the `foods` table (USDA FoodData Central, values per 100 g) and is computed by code: `grams × value / 100`.

- Photo recognition returns `{name, preparation, grams}`; names are matched to food rows by code.
- The chatbot returns portions the same way; its answer text must not contain the computed numbers (checked by the evaluation set).
- The same `NutritionCalculator` serves meal logging and the chatbot, so the two can never disagree.

## Alternatives considered

- **Ask the model for calories directly.** Simplest, but not reproducible, not traceable and not fixable.
- **Send the whole food table in the prompt and let the model pick rows.** Accurate matching, but the prompt grows with the table and costs more on every call.

## Consequences

- Every number shown can be traced to a USDA item, and every gram value can be corrected with an instant, exact recalculation.
- A review step is required after recognition, and foods the table does not have cannot be counted until they are added by a migration.
- Name matching became its own problem (aliases, accents, low-confidence flags) solved in code.

---
<!-- nav -->

**Related:** [Nutrition](../modules/nutrition.md) · [MBotFit chatbot](../modules/chatbot.md)

← [Decisions](README.md) | [ADR 002: Count reps in the browser](002-rep-counting-in-browser.md) →
