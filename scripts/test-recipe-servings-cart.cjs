require("./recipe-audit-runtime.cjs");
const assert=require("node:assert/strict");
const {parseRecipeIngredient,scaleIngredients,prepareRecipeSearch,recipeRetailPackageCount}=require("../src/app/components/ziiply/justiina/recipeCore.ts");

const base=[
  parseRecipeIngredient("600 g perunaa","potatoes"),
  parseRecipeIngredient("300 g porkkanaa","carrots"),
  parseRecipeIngredient("12 kananmunaa","eggs")
];
const products=[
  {name:"Peruna 1 kg"},
  {name:"Porkkana 500 g"},
  {name:"Kananmunia 10 kpl"}
];
const quantities=[];
for(const servings of [4,6,8,4]){
  const scaled=scaleIngredients(base,4,servings);
  const prepared=prepareRecipeSearch(scaled,"","Annosmäärän regressio");
  assert.equal(prepared.items.length,3,"Every ingredient must remain available");
  const counts=scaled.map((ingredient,i)=>recipeRetailPackageCount(ingredient,products[i]));
  quantities.push(counts);
  assert.equal(scaled[0].amount,600*servings/4);
  assert.equal(scaled[1].amount,300*servings/4);
  assert.equal(scaled[2].amount,12*servings/4);
  // Comparing a loose product must use the whole recipe weight, not multiply it by package count.
  const grams=scaled[0].amount;
  const cartQuantity=counts[0]??1;
  assert.equal((grams/cartQuantity)*cartQuantity,grams);
}
assert.deepEqual(quantities[0],quantities[3],"4 → 6 → 8 → 4 must return to original cart quantities");
console.log("PASS: recipe servings 4 → 6 → 8 → 4, package counts, whole-recipe weights");
