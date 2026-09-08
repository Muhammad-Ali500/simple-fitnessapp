/* ---------- Pure calculation functions (usable in browser and Node) ---------- */

function calcBMI(weightKg, heightCm) {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

function bmiCategory(bmi) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

function calcBMR(gender, weightKg, heightCm, age) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

function calcTDEE(bmr, activityFactor) {
  return bmr * activityFactor;
}

function calcCalorieGoal(tdee, goal) {
  if (goal === "lose") return tdee - 500;
  if (goal === "gain") return tdee + 500;
  return tdee;
}

function calcBodyFatNavy(gender, heightCm, neckCm, waistCm, hipCm) {
  if (gender === "male") {
    return (
      495 /
        (1.0324 -
          0.19077 * Math.log10(waistCm - neckCm) +
          0.15456 * Math.log10(heightCm)) -
      450
    );
  }
  return (
    495 /
      (1.29579 -
        0.35004 * Math.log10(waistCm + hipCm - neckCm) +
        0.221 * Math.log10(heightCm)) -
    450
  );
}

function calcIdealWeight(gender, heightCm) {
  const heightIn = heightCm / 2.54;
  const over60 = Math.max(heightIn - 60, 0);
  return gender === "male" ? 50 + 2.3 * over60 : 45.5 + 2.3 * over60;
}

function calcOneRepMax(weight, reps) {
  if (reps <= 0) return weight;
  return weight * (1 + reps / 30);
}

function calcWaterIntake(weightKg) {
  return weightKg * 0.033;
}

/* ---------- Export for Node (tests) / expose on window (browser) ---------- */

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    calcBMI,
    bmiCategory,
    calcBMR,
    calcTDEE,
    calcCalorieGoal,
    calcBodyFatNavy,
    calcIdealWeight,
    calcOneRepMax,
    calcWaterIntake,
  };
}

/* ---------- DOM wiring (browser only) ---------- */

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    // Tab switching
    const tabButtons = document.querySelectorAll(".tab-btn");
    const panels = document.querySelectorAll(".panel");
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabButtons.forEach((b) => b.classList.remove("active"));
        panels.forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(btn.dataset.target).classList.add("active");
      });
    });

    const num = (id) => parseFloat(document.getElementById(id).value);
    const setResult = (id, html) => {
      const el = document.getElementById(id);
      el.innerHTML = html;
      el.classList.add("show");
    };
    const invalid = (...vals) => vals.some((v) => Number.isNaN(v) || v <= 0);

    // BMI
    document.getElementById("bmi-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const weight = num("bmi-weight");
      const height = num("bmi-height");
      if (invalid(weight, height)) {
        setResult("bmi-result", "Please enter valid positive numbers.");
        return;
      }
      const bmi = calcBMI(weight, height);
      setResult(
        "bmi-result",
        `Your BMI is <strong>${bmi.toFixed(1)}</strong> (${bmiCategory(bmi)})`
      );
    });

    // BMR / TDEE
    document.getElementById("bmr-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const gender = document.getElementById("bmr-gender").value;
      const weight = num("bmr-weight");
      const height = num("bmr-height");
      const age = num("bmr-age");
      const activity = parseFloat(document.getElementById("bmr-activity").value);
      if (invalid(weight, height, age)) {
        setResult("bmr-result", "Please enter valid positive numbers.");
        return;
      }
      const bmr = calcBMR(gender, weight, height, age);
      const tdee = calcTDEE(bmr, activity);
      setResult(
        "bmr-result",
        `BMR: <strong>${bmr.toFixed(0)}</strong> kcal/day<br>TDEE: <strong>${tdee.toFixed(
          0
        )}</strong> kcal/day`
      );
    });

    // Body Fat %
    document.getElementById("bf-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const gender = document.getElementById("bf-gender").value;
      const height = num("bf-height");
      const neck = num("bf-neck");
      const waist = num("bf-waist");
      const hip = num("bf-hip");
      const hipField = document.getElementById("bf-hip-field");
      hipField.style.display = gender === "female" ? "block" : "none";

      if (
        invalid(height, neck, waist) ||
        (gender === "female" && invalid(hip))
      ) {
        setResult("bf-result", "Please enter valid positive numbers.");
        return;
      }
      const bf = calcBodyFatNavy(gender, height, neck, waist, hip);
      setResult("bf-result", `Estimated body fat: <strong>${bf.toFixed(1)}%</strong>`);
    });

    document.getElementById("bf-gender").addEventListener("change", (e) => {
      document.getElementById("bf-hip-field").style.display =
        e.target.value === "female" ? "block" : "none";
    });

    // Ideal Weight
    document.getElementById("iw-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const gender = document.getElementById("iw-gender").value;
      const height = num("iw-height");
      if (invalid(height)) {
        setResult("iw-result", "Please enter a valid positive number.");
        return;
      }
      const kg = calcIdealWeight(gender, height);
      setResult(
        "iw-result",
        `Ideal weight: <strong>${kg.toFixed(1)} kg</strong> (${(kg * 2.20462).toFixed(
          1
        )} lb)`
      );
    });

    // One Rep Max
    document.getElementById("orm-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const weight = num("orm-weight");
      const reps = num("orm-reps");
      if (invalid(weight, reps)) {
        setResult("orm-result", "Please enter valid positive numbers.");
        return;
      }
      const orm = calcOneRepMax(weight, reps);
      setResult("orm-result", `Estimated 1RM: <strong>${orm.toFixed(1)}</strong>`);
    });

    // Water Intake
    document.getElementById("water-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const weight = num("water-weight");
      if (invalid(weight)) {
        setResult("water-result", "Please enter a valid positive number.");
        return;
      }
      const liters = calcWaterIntake(weight);
      setResult("water-result", `Recommended intake: <strong>${liters.toFixed(2)} L/day</strong>`);
    });

    // Calorie Goal
    document.getElementById("cal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const tdee = num("cal-tdee");
      const goal = document.getElementById("cal-goal").value;
      if (invalid(tdee)) {
        setResult("cal-result", "Please enter a valid TDEE value.");
        return;
      }
      const target = calcCalorieGoal(tdee, goal);
      setResult("cal-result", `Target intake: <strong>${target.toFixed(0)} kcal/day</strong>`);
    });
  });
}
