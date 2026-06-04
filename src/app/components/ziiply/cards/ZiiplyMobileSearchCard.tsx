*** ZiiplyMobileSearchCard.tsx	current
--- ZiiplyMobileSearchCard.tsx	v660-gosta-empty-search
***************
*** 1,6 ****
--- 1,13 ----
  "use client";
+ 
+ // ZIIPLY_MOBILE_SEARCH_CARD_V660_GOSTA_EMPTY_SEARCH
+ // Muutos on rajattu Göstan nappiin ja manuaalihakuun:
+ // - Gösta saa käynnistyä myös tyhjällä hakukentällä.
+ // - Justiina vaatii edelleen hakutekstin.
+ // - Tyhjä Gösta-haku avaa tarjouskortin, jossa page hakee alueen kaikki tarjoukset.

***************
***
-   const handleManualSearch = async (
-     assistant: "gosta" | "justiina",
-     handler?: () => void,
-   ) => {
-     const clean = input.trim();
-     if (clean.length >= 2) {
-       autoSearchInputRef.current = clean;
-       setTriggeredSearchInput(clean);
-     }
-
-     if (clean.length < 2) return;
+   const handleManualSearch = async (
+     assistant: "gosta" | "justiina",
+     handler?: () => void,
+   ) => {
+     const clean = input.trim();
+     const allowEmptySearch = assistant === "gosta";
+ 
+     if (clean.length >= 2) {
+       autoSearchInputRef.current = clean;
+       setTriggeredSearchInput(clean);
+     }
+ 
+     if (clean.length < 2 && !allowEmptySearch) return;
***************
***
-               <AssistantButton
-                 kind="gosta"
-                 onClick={() => handleManualSearch("gosta", onOfferSearch)}
-                 disabled={!hasText}
-                 loading={loadingOffers}
-               />
+               <AssistantButton
+                 kind="gosta"
+                 onClick={() => handleManualSearch("gosta", onOfferSearch)}
+                 disabled={loadingOffers}
+                 loading={loadingOffers}
+               />
***************
***
-               <AssistantButton
-                 kind="justiina"
-                 onClick={() => handleManualSearch("justiina", onNormalSearch)}
-                 disabled={!hasText}
-                 loading={justiinaLoading}
-               />
+               <AssistantButton
+                 kind="justiina"
+                 onClick={() => handleManualSearch("justiina", onNormalSearch)}
+                 disabled={!hasText}
+                 loading={justiinaLoading}
+               />
