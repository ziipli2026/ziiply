/** Research-only Lidl price eligibility. Never use a sitemap price as verified local checkout price. */
export type LidlResearchProduct = {
 lidlProductId:string;
 displayedPriceEur:number|null;
 source?:string;
 researchCategory?:string;
 pricingUnit?:string|null;
};
export type LidlPriceAssessment = {
 displayPriceEur:number|null;
 priceLabel:"public-web-observation"|"price-unavailable";
 checkoutPriceVerified:false;
 comparableInBasket:false;
 reason:string;
};
export function assessLidlResearchPrice(p:LidlResearchProduct):LidlPriceAssessment {
 const valid=typeof p.displayedPriceEur==="number"&&Number.isFinite(p.displayedPriceEur)&&p.displayedPriceEur>=0;
 if(!valid)return {displayPriceEur:null,priceLabel:"price-unavailable",checkoutPriceVerified:false,comparableInBasket:false,reason:p.researchCategory==="bakery-piece"?"Bakery item: public price missing; do not substitute zero or assume per-piece checkout price.":"Official public source has no confirmed local checkout price."};
 return {displayPriceEur:p.displayedPriceEur,priceLabel:"public-web-observation",checkoutPriceVerified:false,comparableInBasket:false,reason:"Historical public Lidl website price only; store-specific current price and availability not verified."};
}
