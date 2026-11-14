<sub>[MAIFit](../../README.md) / [Docs](../README.md) / [Modules](README.md) / Profile</sub>

# Profile

Body data, energy targets, weight history, training time and appearance settings.

## Energy targets

`TdeeCalculator` turns the profile (sex, birth date, height, activity level, goal) and the latest weight into BMR, TDEE and a daily calorie target with a macro split.

- **BMR formula by situation:**
  - adults with a body fat percentage: Katch–McArdle (from lean body mass);
  - adults without it: Mifflin–St Jeor;
  - ages 13–17: Schofield, the weight-based equation used by the WHO.
- **TDEE** = BMR × activity multiplier.
- **Target:** TDEE − 500 kcal to lose, + 500 to gain, with a minimum floor of 1,500 kcal for men and 1,200 kcal for women. Teenagers asking to lose weight get a maintenance target instead: a growing body should not be put on a deficit.
- The response says which formula was used, so the user knows where the number comes from.
- Age is computed from the birth date, never stored.

## Weight history

`body_checkins` stores each measurement (weight, optional body fat and waist). The latest one feeds the TDEE; the history shows the trend. Weight is not a column of the profile, so there is one source of truth.

## Training time

A card with a Day / Week / Month switch shows total time and bars for the last 7 days, 6 weeks or 6 months, computed from saved sets ([Workout](workout.md#leaderboards-and-streaks)).

## Appearance

- **Theme:** a light/dark switch and a "follow system" option, stored per device. The default is dark.
- **Accent color:** six colors, each checked for at least 4.5:1 contrast with white text, so there is no free color picker. Stored per account (`users.accent_color`) so it follows the user to every device.
- **No flash of the wrong colors:** `public/theme-init.js` applies the saved theme and accent before React starts. It is a separate file because the CSP forbids inline scripts. After sign-in, the account's accent replaces the device's.
- Changing the accent updates the page immediately and reverts if the server rejects it.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET, PUT | `/api/profile` | Profile and computed targets |
| GET, POST | `/api/body-checkins` | Weight history |
| DELETE | `/api/body-checkins/{id}` | Owner only |
| PUT | `/api/users/me/accent-color` | One of six values |

## Trade-offs and limits

- **Formulas are population averages.** The target is a starting point; the weight trend tells the user whether to adjust.
- **Theme per device, accent per account.** A phone and a laptop in different lighting can use different themes, while the brand color stays personal.
- **Profile photos** are not available yet.

---
<!-- nav -->

**Related:** [Workout](workout.md) · [Nutrition](nutrition.md)

← [Premium and AI quotas](premium.md) | [Decisions](../decisions/README.md) →
