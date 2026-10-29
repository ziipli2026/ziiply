import { test, expect } from "@playwright/test";

const key = "ziiply-arvo-meals-v1";
const meals = [
  {id:"ui-a",timestamp:new Date().toISOString(),ean:"6411234567890",name:"Testipuuro",grams:150,nutrition:{kcal:300,protein:15,carbs:30,fat:7.5}},
  {id:"ui-b",timestamp:new Date().toISOString(),ean:"6411234567891",name:"Testijogurtti",grams:100,nutrition:{kcal:120,protein:null,carbs:0,fat:4}},
];

test.beforeEach(async ({page}) => {
  await page.addInitScript(({key,meals}) => localStorage.setItem(key,JSON.stringify(meals)),{key,meals});
});

test("Arvo: period selectors, calorie chart, unknown nutrient and delete",async ({page})=>{
  await page.goto("/arvo-tilastot");
  await expect(page.getByRole("heading",{name:"Arvon ravintotilastot"})).toBeVisible();
  await expect(page.getByText("420",{exact:true})).toBeVisible();
  await expect(page.getByRole("img",{name:"Päivittäiset kilokalorit pylväinä"})).toBeVisible();
  for(const [name,days] of [["Tänään",1],["7 päivää",7],["30 päivää",30]]){
    const button=page.getByRole("button",{name});
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed","true");
    await expect(page.getByRole("img",{name:"Päivittäiset kilokalorit pylväinä"}).locator("> div")).toHaveCount(days);
  }
  await page.getByRole("button",{name:"Poista ateria Testipuuro"}).click();
  await page.once("dialog",dialog=>dialog.accept());
  await expect(page.getByText("Testipuuro")).toHaveCount(0);
  await expect(page.getByText("120",{exact:true})).toBeVisible();
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||"[]"),key);
  expect(saved.map(meal=>meal.id)).toEqual(["ui-b"]);
});

test("Arvo: no entries shows empty-state",async ({page})=>{
  await page.addInitScript(key=>localStorage.removeItem(key),key);
  await page.goto("/arvo-tilastot");
  await expect(page.getByText("Ei vielä tietoja kuvaajaan.")).toBeVisible();
  await expect(page.getByText(/Ei vielä tallennettuja aterioita/)).toBeVisible();
});
