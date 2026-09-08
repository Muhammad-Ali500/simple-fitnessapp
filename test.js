const assert = require("assert");
const {
  calcBMI,
  bmiCategory,
  calcBMR,
  calcTDEE,
  calcCalorieGoal,
  calcBodyFatNavy,
  calcIdealWeight,
  calcOneRepMax,
  calcWaterIntake,
} = require("./script.js");

const close = (a, b, tol = 0.01) => Math.abs(a - b) < tol;

// BMI
{
  const bmi = calcBMI(70, 175);
  assert(close(bmi, 22.857, 0.01), `BMI expected ~22.857 got ${bmi}`);
  assert.strictEqual(bmiCategory(17), "Underweight");
  assert.strictEqual(bmiCategory(22), "Normal weight");
  assert.strictEqual(bmiCategory(27), "Overweight");
  assert.strictEqual(bmiCategory(32), "Obese");
}

// BMR (Mifflin-St Jeor)
{
  const male = calcBMR("male", 70, 175, 25);
  assert(close(male, 1673.75), `Male BMR expected 1673.75 got ${male}`);
  const female = calcBMR("female", 70, 175, 25);
  assert(close(female, 1507.75), `Female BMR expected 1507.75 got ${female}`);
}

// TDEE
{
  const tdee = calcTDEE(1673.75, 1.55);
  assert(close(tdee, 2594.3125), `TDEE expected 2594.3125 got ${tdee}`);
}

// Calorie goal
{
  assert(close(calcCalorieGoal(2500, "lose"), 2000));
  assert(close(calcCalorieGoal(2500, "maintain"), 2500));
  assert(close(calcCalorieGoal(2500, "gain"), 3000));
}

// Body fat % (US Navy, metric) - hand-computed reference
{
  // male: height 177.8cm, neck 38.1cm, waist 86.36cm -> ~17.4%
  const bfMale = calcBodyFatNavy("male", 177.8, 38.1, 86.36, 0);
  assert(close(bfMale, 17.4, 0.5), `Male body fat expected ~17.4 got ${bfMale}`);

  // female: height 165cm, neck 32cm, waist 70cm, hip 95cm
  const bfFemale = calcBodyFatNavy("female", 165, 32, 70, 95);
  assert(bfFemale > 0 && bfFemale < 60, `Female body fat out of range: ${bfFemale}`);
}

// Ideal weight (Devine)
{
  const iw = calcIdealWeight("male", 175);
  assert(close(iw, 70.47, 0.05), `Ideal weight expected ~70.47 got ${iw}`);
  const iwF = calcIdealWeight("female", 175);
  assert(close(iwF, 65.97, 0.05), `Female ideal weight expected ~65.97 got ${iwF}`);
}

// One-rep max (Epley)
{
  const orm = calcOneRepMax(100, 5);
  assert(close(orm, 116.667, 0.01), `1RM expected ~116.667 got ${orm}`);
  assert.strictEqual(calcOneRepMax(100, 0), 100);
}

// Water intake
{
  const water = calcWaterIntake(70);
  assert(close(water, 2.31, 0.001), `Water intake expected 2.31 got ${water}`);
}

console.log("All calculation tests passed.");
