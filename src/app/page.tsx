"use client";

// V660_BUILD_FIX_SCOPED_RENDER_COMPARED_STORE_CARDS
// Korjaa v659 build-virheen: funktio korvataan exact string -menetelmällä, ei vanhoilla indekseillä.
// Muutokset rajattu renderComparedStoreCards()-funktioon.
// Ei GPS-, haku-, bottom nav- tai store picker -muutoksia.

// V651_STORE_CARDS_RETRO_VISUAL_ONLY
// Kaupparuutujen visuaalinen asu viimeistelty page.tsx:n renderComparedStoreCards(true)-polussa:
// - lämpimämpi paperi/emaltti-pinta
// - pehmeämmät aktiiviset S/K-kortit
// - logolle pieni retro-etikettikehys
// - check-merkki pienempi ja vanhan emalttinapin näköinen
// - Tulossa-kortit haaleammiksi mutta samaan tyyliin
// Ei haku-, GPS-, state-, handler- tai valintalogiikkamuutoksia.

// V650_STORE_CARD_COMPACT_VISIBLE_4_VISUAL_ONLY
// Korjaa page.tsx:n renderComparedStoreCards(true)-kauppalaatikot:
// - neljä kaupparuutua mahtuu näkyviin mobiilissa
// - kortit matalammat ja tekstin/logo/checkin paikat tiiviimmät
// - lämmin retro-paperi/emaltti-ilme säilyy
// - ei muutoksia haku-, GPS-, state-, handler- tai valintalogiikkaan

// V648_PAGE_RENDER_PATH_CLEANUP_ONLY:
// Simuloitu page.tsx render-polku. V647:n liian laajat kauppakorttien tyylikorvaukset palautettu pois.
// Page pitää v634-korjauksen: vanha raaka Kaupat/mode selector -koodi poistettu ja käytössä on ZiiplyMobileStoreModeSelector-komponentti.
// Tämä tiedosto EI yritä korjata ModeSelectorin omaa ulkoasua eikä kauppalaatikoiden lopullista grafiikkaa.
// Tavoite: page takaisin vakaaksi ja siistiksi ennen erillisten moduulien korjaamista.

// V647_STORE_CARDS_VISUAL_POLISH_AND_SELECTOR_LOW_BUTTONS:
// Kauppojen valintalaatikot päivitetty page.tsx:n renderComparedStoreCards-polusta.
// ModeSelectorin nappikorkeus korjataan erillisessä V647 ModeSelector -tiedostossa.
// Vain ulkoasu. Ei haku-, GPS-, click-, state- tai handler-logiikkamuutoksia.

// V634_REMOVE_OLD_RAW_SHOPS_SELECTOR_AND_LIGHTEN_RENDER:
// Tarkastettu simuloimalla: page.tsx:ssä oli yhä vanha raaka Kauppavalinta/mode selector -koodi.
// Poistettu vanhat inline-napit ja korvattu ne oikealla ZiiplyMobileStoreModeSelector-komponentilla.
// Lisäksi vaalennettu oikean mobiili-Kaupat-renderin ulompi paperi/rasteri.
// Ei muutoksia haku-, GPS-, storeCards- tai handler-logiikkaan.

// V632_PAGE_USES_REAL_MODE_SELECTOR_COMPONENT:
// Korjaus: mobiilin Kaupat-näkymän inline mode selector poistettu ja korvattu oikealla ZiiplyMobileStoreModeSelector-komponentilla.
// Tämän jälkeen ZiiplyMobileStoreModeSelector.tsx:n visuaalimuutokset näkyvät ruudulla. Ei muutoksia kauppakortteihin, hakuun, GPS-logiikkaan tai click-handlerien sisältöön.

// V630_INLINE_MODE_SELECTOR_VISIBLE_GRAPHICS_FIX:
// Simuloitu vika: käytössä oleva mobiili-Kaupat-render on page.tsx:n inline-haara. Muutos tehdään nyt juuri siihen haaraan selvästi näkyvänä mode selector -grafiikan muutoksena. Vain ulkoasu, ei click/state/logiikka-muutoksia.

// V629_INLINE_MODE_SELECTOR_GRAPHICS_VISUAL_ONLY:
// Korjaa käytössä olevan page.tsx inline-Kaupat-renderin mode selector -osion grafiikkaa vain ulkoasun osalta. Ei muutoksia logiikkaan, stateihin, callbackeihin tai click-toimintoihin.
// V628_INLINE_MOBILE_SHOPS_RETRO_C_VISIBLE_VISUAL_ONLY:
// Korjaa oikeaa käytössä olevaa inline-Kaupat-renderiä. Vain ulkoasu: tausta, kehykset, korttisävyt, painikkeiden emaltti/paperi. Ei logiikka- tai click-muutoksia.
// V627_RETRO_SHOPS_FINAL_POLISH_VISUAL_ONLY:
// Viimeistely: syvempi paperikehys, tummempi emaltti-vihreä, lämpimämmät korttipohjat. Toimintoihin/click-logiikkaan ei kosketa.
// V626_RETRO_SHOPS_POLISH_VISUAL_ONLY:
// Jatko v625: Kaupat-inline-renderin visuaalinen hienosäätö. Toimintoihin/click-logiikkaan ei kosketa.
// V625_INLINE_SHOPS_RETRO_C_STEP1_VISUAL_ONLY:
// Kaupat-näkymän oikea inline-render-polku: poistettu debug, lisätty C-mockupin mukainen paperi/kehys/retro-sävy. Toimintoihin ei kosketa.
// V623_RESULTS_CLOSE_DOES_NOT_TRIGGER_FALSE_NOTFOUND:
// V622_BUILD_FIX_HIDE_TOPBAR_WITH_PROP_ONLY: appin oma yläpalkki piilotetaan Hae-näkymässä searchPanelOpenilla.
// V611_HUOKEAMMAKS_NO_DOT_FINAL: pääsivun hero-teksti on täsmälleen "Viilaa ruokakorisi huokeammaks" ilman pistettä.

// V592_SCANNER_BEEP_ALWAYS_ON_SEARCH_START: piip kuuluu aina, kun EAN-haku oikeasti käynnistyy; ei piippiä enää valintapaneelin kautta lisäyksessä.
// V595_SCANNER_NO_HINT_AND_BOTTOM_UP_SWEEP: poistaa skannerin kameraruudun ohjetekstit näkyvistä ja käyttää v595 ScannerCardia, jossa efekti liikkuu alhaalta ylöspäin.
// V594_SCANNER_BEEP_ON_DETECT_AND_TRANSPARENT_SELECTION_INFO: piip soitetaan heti skannerin tunnistustapahtumassa ennen hakua; aloitusohje poistettu ScannerCardista; valintapaneelin lisäys näyttää läpikuultavan Tuote lisätty -kuittauksen ilman piippiä/flashia.
// V593_SCANNER_WINDOW_FLASH_ERROR_SOUND_AND_SELECTION_INFO: flash vain kameraikkunaan ScannerCardissa; page soittaa error/tööt-äänen ei-löydy-tilassa ja näyttää valinnan jälkeen Tuote lisätty -viestin ilman piippiä/flashia.
// V597_SCANNER_BEEP_BEFORE_DUPLICATE_LOCK: piip soitetaan heti EAN-tunnistuksessa ennen sama-EAN-tuplahaun lukkoa; valintaikkunan lisäys ei piippaa.
// V590_SCANNER_STATUS_BEEP_FLOW: piip kuuluu EAN-koodin tunnistushetkellä, ei koriin lisäyksessä; scannerMessage näyttää HAETAAN kameraruudulla loading-tilassa.
// V582_MOBILE_SCANNER_TORCH_FULLHEIGHT_RADAR_AND_BEEP: korjaa taskulamppu-propin, koko kameraruudun tutkaefektin sekä siirtää piip-äänen EAN-koodin löytymishetkeen pois koriinlisäyksestä.
// V581_MOBILE_SCANNER_TORCH_AND_FULLHEIGHT_RADAR: varmistaa taskulamppupropin välityksen ScannerCardille ja käyttää v581-koko kameraruudun tutkaefektiä.
// V580_MOBILE_SCANNER_FULLSCREEN_MODE: tekee mobiiliskannerista koko ikkunan tilan; poistaa kortin max-width/padding-rajoitteet ja välittää fullscreen-propin ScannerCardille.
// V579_MOBILE_SCANNER_GET_PRODUCT_PRICE_TYPE_FIX: korjaa ScannerCardin getProductPrice-propin tyyppierot; välitetään wrapperi, joka käyttää result.productia tai resultiä Productina.
// V578_MOBILE_SCANNER_SELECTION_TYPE_FIX: korjaa scannerin valintapaneelin onSelectResult-tyypityksen; selection-result muunnetaan EanSearchResultiksi lisäämällä eanMatch true ennen addEanResultToCart-kutsua.
// V577_MOBILE_SCANNER_RADAR_AND_CAMERA_SELECTION_OVERLAY: skannerin loading renderöidään kameraruudun päälle; tutkaefekti korvaa kovan viivan; usean EAN-osuman valinta peittää koko kameraruudun eikä vihreä välähdys syty ennen tuotteen valintaa.
// V576_MOBILE_SCANNER_VISIBLE_MOUNT_WAIT: mobiiliskanneri odottaa näkyvän MOBILE_EAN_SCANNER_REGION_ID-divin renderöitymistä eikä fallbackaa piilossa olevaan desktop-regioniin; estää käynnistyvän kameran näkymättömän videon.
// V573_MOBILE_SCANNER_CHILDREN_REMOVED: uusi puhdas ScannerCard on self-closing; page ei enää anna children-sisältöä eikä vanhoja onManualEan/onPasteEan/onTorch-proppeja.
// V572_CLEAN_SCANNER_CSS_ONLY: mobiiliskanneri käyttää puhdasta CSS-korttia ilman WEBP-taustakuvaa; vanha scanner-kuva ja cache-ongelma poistettu.
// V570_MOBILE_SCANNER_NO_ARTWORK_PROP: poistaa page-kutsusta artworkSrc-propin; kuva määritetään kortissa, jotta build ei kaadu vanhaan props-tyyppiin.
// V569_MOBILE_SCANNER_ARTWORK_HARDWIRED:
// page antaa uuden scanner-screenv2.webp-polun suoraan ZiiplyMobileScannerCardille, jotta vanha assetti ei voi jäädä käyttöön.
// V568_MOBILE_SCAN_BUTTON_FORCE_NEW_SCANNER_CARD: SCAN-nappi renderöi uuden mobiiliskannerikortin heti eanModalOpen-tilassa.
// V563_MOBILE_SCANNER_CARD_COMPACT_FIXED: mobiilin skanneri mahtuu yhteen ruutuun; camera region on oma tyhjä mount-div; tap-focus saa regionId:n.
// V561_ELECTRICITY_CACHE_TYPE_FIX: korjaa localStorage-sähköcachen TypeScript-narrowing virheen cached.value/setState-kutsussa.
// V560_ELECTRICITY_CACHE_AUTO_CLEANUP: poistaa liian vanhan sähkön hintamuistin automaattisesti localStoragesta.
// V559_ELECTRICITY_LOCAL_CACHE: pörssisähkö käyttää selaimen localStorage-muistia; viimeisin hinta näytetään heti ja uusi haetaan taustalla.
// V558_ELECTRICITY_RETRO_SIGNAL_LAMP: korvaa sähkön kolmionuolen vanhan ajan pienellä merkkivalolla.
// V557_ELECTRICITY_QUARTER_PRICING_SAHKOTIN: käyttää ensisijaisesti Sähköttimen varttihinta-API:a quarter&fix&vat ja vertaa trendin seuraavaan 15 min jaksoon.
// V556_ELECTRICITY_INDICATOR_FORCE_VISIBLE: trendi-indikaattori renderöidään sähköpaneelin absoluuttiseksi omaksi merkiksi, ei hinnan rivin sisään.
// V555_ELECTRICITY_UNIT_ALIGN_AND_VISIBLE_INDICATOR: nostaa c/kWh:n numeron keskilinjaan ja sijoittaa trendi-indikaattorin näkyvästi sähköruudun oikeaan yläosaan.
// V554_ELECTRICITY_RETRO_INDICATOR_REPOSITION: siirtää sähkön retrotrendin hinnan vierestä otsikkoalueelle.
// V553_ELECTRICITY_RETRO_TREND_ARROWS: palauttaa pörssisähkön 50-luvun retroindikaattorit: vihreä alas, punainen ylös, viiva vakaalle.
// V552_ELECTRICITY_SIMULATED_RENDER_PATH_AND_FALLBACKS: varmistettu render-polku; sähkö näkyy ensin haetaan-tilana ja hakee porssisahko + sahkonhintatanaan fallbackeilla.
// V550_RESTORE_INTERNAL_KAUPPIAS_TOPBAR_RENDER: palauttaa renderiin sisäisen KauppiasMobileTopBarin; poistaa ZiiplyMobileTopBar-viittauksen kokonaan.
// V549_PAGE_INTERNAL_TOPBAR_ACTIVE
// page.tsx käyttää sisäistä KauppiasMobileTopBar-komponenttia.
// Erillistä ZiiplyMobileTopBar-importtia ei käytetä.
// V548_PAGE_INTERNAL_TOPBAR_ELECTRICITY_VISIBLE: korjaa sähkön suoraan page.tsx:n sisäiseen KauppiasMobileTopBariin, koska erillinen ZiiplyMobileTopBar ei välttämättä ole käytössä.
// V547_CART_COMPARE_TRANSITION_AND_ELECTRICITY_REBUILD: Kori/Vertailu-siirtymät rauhoitettu ja pörssisähkön haku rakennettu suoraviivaisemmaksi.
// V546_MOBILE_CART_QUANTITY_HANDLER_SCOPE_FIX: siirtää mobiilikorin määrähandlerit pois KauppiasWeatherGraphicin sisältä Page-komponentin scopeen.
// V545_MOBILE_CART_QUANTITY_HANDLERS: mobiilin Tavarainkeruu saa määrän +/− toimimaan ja CartCard V6 siirtää poisto-X:n hinnan vasemmalle.
// V544_MOBILE_CART_TAVARAINKERUU_PAPER_V2: page käyttää ZiiplyMobileCartCardia; kortin V2-asussa Tavarainkeruu, Tallenna/Näytä ostoslistat ja leveämpi paperi.
// V543_MOBILE_CART_REMOVEITEM_TYPE_FIX: korjaa mobiilin paperikorin Poista-kutsun; removeCartItem saa string-avaimen eikä CartItem-oliota.
// V542_MOBILE_CART_PAPER_CARD_CONNECTED: mobiili-Kori käyttää uutta ZiiplyMobileCartCard-paperivihko/keräilylista-komponenttia.
// V527_MOBILE_SEARCH_RESULTS_CARD_AND_ELECTRICITY_REPAIR: mobiilin hakutulokset omalle kortille ja pörssisähkö korjattu suorahaulla.
// V541_READY_BADGE_ONLY_ON_STORE_READY_CHANGE: 'Voit hakea' ei syty korttien välillä siirtyessä eikä results-kortilta poistuttaessa.
// V538_MOBILE_SEARCH_RESULTS_OPEN_AND_READY_BADGE_FIX: Justiina-haku ei sulje Hae-paneelia; tuloskortti voi aueta vain löydetyillä tuloksilla; 'Voit hakea' ei syty haun aikana.
// V537_MOBILE_RESULTS_ONLY_CURRENT_FOUND_QUERY: tuloskortti ei aukea ei-löytynyt-haulla eikä vanhoilla tuloksilla.
// V536_MOBILE_RESULTS_NO_JUMP_WHILE_SEARCHING: mobiilin hakutuloskortti ei aukea haun aikana eikä tyhjällä tuloksella.
// V534_HAE_READY_BADGE_TRUE_SEARCH_TAB_CENTER: 'Voit hakea' -badge korjattu Hae-tabin todelliselle keskilinjalle prosenttipaikalla.
// V532_HAE_READY_BADGE_OVER_SEARCH_ICON: 'Voit hakea' -mikrobadge ankkuroitu suurennuslasi/Hae-napin yläpuolelle.
// V531_HAE_READY_MICRO_BADGE: vanha HAE VALMIS -badge korvattu pienellä retro 'Voit hakea' -mikrobadgella Hae-napin yläpuolella.
// V530_CLEAR_SEARCH_INPUT_ON_CLOSE: Hae-kortin tekstikenttä tyhjennetään aina kun Hae suljetaan tai vaihdetaan pois.
// V529_ELECTRICITY_INTERNAL_TOPBAR_FINAL: KauppiasMobileTopBarin sisäinen sähköhaku korjattu; page ei käytä erillistä ZiiplyMobileTopBaria.
// V528_ELECTRICITY_VISIBLE_ERROR_AND_FALLBACKS: sähköhinta hakee suoraan + listasta ja näyttää virhetilan detailissä.
// V526_ELECTRICITY_ZERO_REBUILD: pörssisähkön haku rakennettu kokonaan uudelleen yhdestä listalähteestä.
// V525_ELECTRICITY_LIVE_REFRESH_AND_COMPASS: sähköhaku hakee nykyhetken listasta cache-busterilla ja kompassi/karttanappi palautettu.
// V522_ELECTRICITY_ROBUST_FALLBACK: sähköhinta ei jää 0,0/viivaksi, kentät ja fallbackit korjattu.
// V523_ELECTRICITY_RETRO_ARROWS: pörssisähkön trendi-indikaattori vanhan ajan ▲/▼ merkeiksi, punainen nousulle ja vihreä laskulle.
// V520_HAE_READY_BADGE_SCOPE_TIMER: Hae valmis näkyy vain pää-/kaupat-näkymässä ja sammuu 2,5s jälkeen.
// V502_WEATHER_RESTORED_HAE_READY_BADGE: säämoduuli takaisin page-GPS-koordinaateilla, Hae-valmiusbadge ilman pomppua.
// V503_REMOVE_GPS_DEBUG_LOGGING: poistettu GPS debug-loggaus ja overlay.
// V504_SEARCH_CLOSE_FIX: Hae-nappi ei ole disabled kun Hae-kortti on auki, joten se voi sulkea kortin.
// V506_REMOVE_REMAINING_GPS_DEBUG_PANEL: poistettu jäljelle jäänyt GPS DEBUG v492 -paneeli.
// V507_WEATHER_AND_SEARCH_EXIT_FIX: sää päälle page-GPS-koordinaateilla ja alapalkki Hae-kortin päälle sulkemista varten.
// V508_ELECTRICITY_FETCH_ROBUST: sähköhinta hakee useammalla muodolla ja kestää API-vastausten vaihtelut.
// V510_ELECTRICITY_V2_AND_STATIC_FALLBACK: sähköhinta hakee porssisahko v2/v1 + sahkonhintatanaan fallback.
// V511_NO_SEARCH_BOUNCE_AND_LOCAL_STORE_GAP: suurennuslasin bounce pois bottom navista ja lähikauppakorteille lisää yläväliä.
// V512_DIRECT_SEARCH_TO_SHOPS_SWITCH: Hae-kortilta Kaupat-kortille vaihto ilman pääsivun välähdystä.
// V513_LOCAL_COMPACT_STORECARD_REAL_GAP: lähikaupan vertailun kauppalaatikkojen väli korjattu oikeassa compact-renderissä.
// V514_OLD_INLINE_SHOPS_RENDER_GAP: korjattu vanhan inline-Kauppavalinta-renderin nappien ja kauppalaatikoiden väli.
// V500_BUILD_FIX_ACTIVE_AREA_STATUS_NO_BOUNCE: korjaa status-scope buildin ja poistaa suurennuslasin pompun, mutta jättää Hae-valmiuslogiikan.
// V495_GPS_SUCCESS_UI_RELEASE: GPS onnistumisen jälkeen vapautetaan UI eksplisiittisesti pois pending/jumi-tilasta.
// V496_GPS_STATUS_RENDER_FORCE: GPS onnistumisen jälkeen status pakotetaan renderöintiin; logi + karttatoiminnot pois testistä.
// V491_GPS_SINGLE_PROMISE_CONTROLLED_RETRY: getCurrentPosition dedupataan yhteen promiseen ja ensimmäisen hutiyrityksen jälkeen tehdään yksi sisäinen retry ilman uutta UI-starttia.

// V458_MOBILE_VOICE_TOGGLE_SILENCE_SEARCH: mobiilin mikki toimii toggle-na; 2,5s hiljaisuudesta stop + automaattinen haku.
// V465_GPS_SINGLE_START_AND_CLEAN_NOTICES: estää reloadin tupla-GPS-haun ja siistii GPS-ilmoituksista pisteet.
// V466_GPS_BOOT_SINGLE_FLIGHT: estää reload/avaa-tupla-GPS-haun ja siistii GPS-ilmoitukset ilman pisteitä.
// V471_GPS_SINGLE_OWNER_BOOT: GPS:n avausajo omistaa kaiken paikannuksen; vanha status-effect/fallback ei saa käynnistää toista hakua.

// V473_TOPBAR_WEATHER_NO_GPS_NO_BOOT_RACE: sää-yläpalkki ei voi käynnistää GPS:ää eikä sääfetch käynnisty ennen kuin boot-GPS on valmis.

// V475_WEATHER_FROM_PAGE_GPS_NO_NAV_GPS_COUPLING: sääkenttä ei käynnistä mitään effectiä/fetchiä/GPS:ää; vain page-GPS saa paikantaa.

// V483_BOOT_GPS_DELAYED_SINGLE_TRY: boot-GPS pienellä viiveellä, vain yksi automaattinen yritys, watchdog vapauttaa loadingin.

// V457_REMOVE_FULL_OLD_HAE_INLINE_RENDER: page.tsx:n vanha Hae-paneeli poistettu; mobiilihaku renderöidään ZiiplyMobileSearchCard-komponentilla.

// V456_REMOVE_HAE_OLD_THREE_BUTTON_ROW: poistettu Hae-kortin vanha Huojennukset/Lisää koriin/Vertailu -rivi kokonaan.

// V454_MOBILE_SEARCH_REMOVE_OLD_ACTION_TAILS: poistettu Hae-paneelin vanhat kovakoodatut sanelu/skanneri-hännät ja WEBP-paikkarenderit page.tsx:stä.

// V452_FIX_ON_WORKING_V444_BASE: korjattu Hakutapa-ilmoitus toimivan V444-pohjan sisällä ilman JSX-haaran poistoa.

// V444_PAGE_REMOVE_DUPLICATE_HAKUTAPA_NOTICE: poistettu page.tsx:n vanha vilkkuva hakutapa-ilmoitus; ilmoitus tulee StoreModeSelectorista.

// V441_DEFAULT_HYPERMARKETS_READY: oletuksena alueen tavaratalot valmiiksi aktiivisena.

// V440_REVERT_DEFAULT_LOCAL_PAIR: palautettu hakutavan oletus entiselleen, ei pakoteta lähikauppoja oletukseksi.

// V439_DEFAULT_LOCAL_MARKET_PAIR: oletuksena Lähikaupat + Ketjujen väliltä, eli paikallinen vertailupari valmiiksi.

// V437_REMOVE_OLD_WARNINGS_ENAMEL_ONLY: poistettu vanhat varoituslaatikot, vain HAKUTAPA-emalikyltti jää.

// V436_ENAMEL_HAKUTAPA_NOTICE: pieni emalikyltti HAKUTAPA-otsikon päälle, kun vertailuparia ei löydy.

// V435_REMOVE_OLD_GPS_PENDING_CARD: poistettu vanha oranssi GPS-pending/Hae alue -kortti ja estetty karttanapin vanha pending-näkymä.

// V434_HIDE_OLD_GPS_PENDING_SHOPS_MESSAGE: piilotettu vanha oranssi dynaaminen kauppahakuviesti GPS-paikannuksen ajaksi.

// V433_MAP_OVERLAY_BOTH_STORES: karttanappi näyttää overlayn, molemmat valitut kaupat ja reittilinkit.

// V432_GPS_INITIAL_ONCE_NO_SECOND_SPIN: GPS käynnistyy reloadissa vain kerran eikä jää toiseen Paikannetaan-tilaan.

// V431_GPS_OFF_STAYS_OFF_AND_COMPASS_2X: GPS off ei kytkeydy itsestään päälle, kompassi 2x, vanha dynaaminen taustateksti pois.

// V429_GPS_TEXTS_FIXED: GPS-tekstit palautettu lyhyiksi ja oikeiksi.

// V428_ROUTE_OVERLAY_BUTTON: kompassi avaa kartta-overlayn ja Näytä reitti -napin.

// V427_TOPBAR_GRAPHICS_AND_HAKUTAPA_NOTICE: palautettu graafinen yläpalkki ja lisätty hakutapa-huomio.

// V425_RESTORE_TOPBAR_COMPONENT: palautettu KauppiasMobileTopBar build-virheen korjaamiseksi.

// V424_REMOVE_DANGLING_GPS_CONDITIONAL: poistettu overlayn jäljelle jäänyt gpsCoordsV320-ehdollinen fragmentti.

// V423_FINAL_REMOVE_MAP_OVERLAY_FRAGMENT: poistettu viimeinen keskeneräinen kartta-overlay fragmentti.

// V422_REMOVE_ALL_BROKEN_MAP_OVERLAY_REMNANTS: poistettu kaikki rikkinäisen kartta-overlayn JSX-jäänteet.

// V421_REMOVE_BROKEN_MAP_OVERLAY_JSX: poistettu rikkinäinen kartta-overlay JSX buildin korjaamiseksi.

// V420_MAP_OVERLAY_NO_ACTIVESTORES_EARLY_REF: kartta-overlay ei viittaa activeStoresiin ennen määrittelyä.

// V418_COMPASS_MAP_ROUTE_OVERLAY: kompassikuvake ja kartta-overlay reittilinkeillä.

// V402_MOBILE_SEARCH_CARD_CONNECTED: ZiiplyMobileSearchCard kytketty mobiilin hakutuloksiin.

// V401_SYNTAX_REPAIR_ONLY: fixed missing JSX closing div in mobile shops section.

// V397_FUNCTIONAL_ROLLBACK: palautettu P394:n oma toimiva mobiili-Kori/Vertailu/Hae-renderöinti.
// V401_REMOVE_OLD_MOBILE_SHOPS_RENDER: vanha Kaupat-paneelin JSX poistettu ja ohjattu ZiiplyMobileShopsView-komponenttiin.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  Offer,
  ZiiplyOffer,
  Product,
  KProduct,
  EanSearchResult,
  CartItem,
  Area,
  StoreSearchItem,
  Match,
  ChainResult,
  SingleProductCompareResult,
  StoreMode,
  QualityMode,
  StoreCompareScope,
  OptimizationSnapshot,
  PriceSnapshot,
  SavedShoppingList,
  SearchDebugEntry,
  SearchIntentCategory,
  SearchIntent,
  ScoredProduct,
  ScoredOfferResult,
} from "./components/ziiply/ziiplyCore";
import {
  MAX_ITEMS,
  ALTERNATIVES_AUTO_CLOSE_MS,
  PRICE_HISTORY_STORAGE_KEY,
  RECENT_CART_ITEMS_STORAGE_KEY,
  SAVED_SHOPPING_LISTS_STORAGE_KEY,
  MAX_RECENT_CART_ITEMS,
  MAX_SAVED_SHOPPING_LISTS,
  HTML5_QRCODE_SCRIPT_URL,
  EAN_SCANNER_REGION_ID,
  SAME_EAN_RESCAN_LOCK_MS,
  APP_VERSION,
  SHOW_SEARCH_DEBUG_PANEL,
  trackZiiplyEvent,
  AREAS,
  fixText,
  normalize,
  normalizeEan,
  isUsableEan,
  getEanSearchVariants,
  isSameEan,
  cleanExternalProductName,
  getOpenFoodFactsNames,
  splitProductTermsPreservingDecimalCommas,
  parseTerms,
  isLowSignalProductSearchTerm,
  SEARCH_ALIASES,
  getSearchQuery,
  getColaSpecificSearchQueries,
  uniqueNormalizedQueries,
  SEARCH_INTENTS,
  detectSearchIntent,
  isMilkSearchTerm,
  isColaSearchTerm,
  getPrimaryProductNounQuery,
  isVerySpecificSearch,
  normalizeLooseProductMatch,
  getMetricSizeKey,
  getNormalSearchQueries,
  isAliasSearch,
  formatEuro,
  formatComparisonPrice,
  getProductCategoryLabel,
  triggerHaptic,
  playScanSuccessFeedback,
  getScannerVideoElement,
  getScannerVideoTrack,
  applyBestEffortScannerCameraTuning,
  focusScannerCameraAtPoint,
  formatDate,
  getProductPrice,
  isManualShoppingItem,
  getPriceHistoryKeyFromProduct,
  getPriceHistoryKeyFromCartItem,
  getPriceChangeInfo,
  getSizeToken,
  hasWord,
  getNormalizedWords,
  hasExactNormalizedWord,
  parseMetricSize,
  getExactWordScore,
  getBrandMatchScore,
  getSizeMatchScore,
  isDifferentColaBrand,
  buildKSearchName,
  getKSearchTerms,
  hasAnyBrand,
  hasAnyToken,
  isEggSearchTerm,
  isClearlyEggProduct,
  isCoffeeSearchTerm,
  isCoffeeAccessory,
  hasStrongCoffeeSignal,
  hasCoffeePackSize,
  isClearlyColaProduct,
  isClearlyCoffeeProduct,
  isHardRejectedAlternative,
  isHardRejectedOptimizationAlternative,
  VALUE_BRANDS,
  K_OWN_BRANDS,
  S_OWN_BRANDS,
  PREMIUM_BRANDS,
  isValueBrandProduct,
  isKOwnBrandProduct,
  isPremiumBrandProduct,
  productGroupGate,
  isHardRejectedKMatch,
  scoreNameMatch,
  scoreDirectQueryNameMatch,
  getProductSearchText,
  getPreferredSizeScore,
  looksLikeNonFoodProduct,
  getGroceryNonFoodPenalty,
  isWrongMilkSearchProduct,
  hasStrongMilkSignal,
  getCategoryConfidence,
  getImportantQueryWordsForStrictMatch,
  getStrictMultiWordMatchScore,
  scoreBaseNormalResult,
  scoreMilkProduct,
  scoreCoffeeProduct,
  scoreColaProduct,
  scoreButtermilkProduct,
  scoreCookingOilProduct,
  scoreCategorySpecificResult,
  scoreNormalSResult,
  rankNormalSearchResults,
  isNonFoodOffer,
  isBadNormalResult,
  findArea,
  storeText,
  isPrisma,
  isKCitymarket,
  isSLocalStore,
  isKLocalStore,
  pickStore,
  offerToProduct,
  scoreOfferForTerm,
  rankOfferSearchResults,
  convertKProductToProduct,
  getPrimaryBrand,
  isAllowedByQualityMode,
  scoreQualityMode,
  pickBestSProduct,
  pickBestKProduct,
} from "./components/ziiply/ziiplyCore";
import {
  ZiiplyLaunchScreen,
  ZiiplyBottomNav,
} from "./components/ziiply/ziiplyComponents";
import * as TopbarResponsiveCardModule from "./components/ziiply/cards/TopbarResponsiveCard";
import * as ZiiplyCartCardModule from "./components/ziiply/cards/ZiiplyCartCard";
import ZiiplySearchCard from "./components/ziiply/cards/ZiiplySearchCard";
import ZiiplyMobileSearchCard from "./components/ziiply/cards/ZiiplyMobileSearchCard";
import ZiiplyMobileSearchResultsCard from "./components/ziiply/cards/ZiiplyMobileSearchResultsCard";
import ZiiplyMobileCartCard from "./components/ziiply/cards/ZiiplyMobileCartCard";
import ZiiplyMobileScannerCard from "./components/ziiply/cards/ZiiplyMobileScannerCard";
import ZiiplyMobileProductPickCard from "./components/ziiply/cards/ZiiplyMobileProductPickCard";
import ZiiplyStoreLocaCard from "./components/ziiply/cards/ZiiplyStoreLocaCard";
import * as ZiiplyCompareCardModule from "./components/ziiply/cards/ZiiplyCompareCard";
import ZiiplyMobileHomeView from "./components/ziiply/mobile/ZiiplyMobileHomeView";
import ZiiplyMobileAssistantPanel from "./components/ziiply/mobile/ZiiplyMobileAssistantPanel";
import ZiiplyMobileShopsView from "./components/ziiply/mobile/ZiiplyMobileShopsView";
import ZiiplyMobileStoreModeSelector from "./components/ziiply/mobile/ZiiplyMobileStoreModeSelector";
import ZiiplyMobileLocationBar from "./components/ziiply/mobile/ZiiplyMobileLocationBar";
import type { ZiiplyAssistantKey } from "./components/ziiply/mobile/ZiiplyMobileAssistantButton";

const MOBILE_EAN_SCANNER_REGION_ID = `${EAN_SCANNER_REGION_ID}-mobile`;

type KauppiasTopBarKind = "weather" | "electricity" | "fuel" | "calendar";

function kauppiasTopBarPanelClass(kind: KauppiasTopBarKind) {
  const base =
    "relative h-[56px] min-w-0 overflow-hidden rounded-[0.42rem] border-[1.5px] px-[5px] py-[4px] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_1px_0_rgba(0,0,0,0.08)] active:scale-[0.985]";

  if (kind === "weather") {
    return `${base} border-[#b9d0ba] bg-[linear-gradient(180deg,#fff9e4_0%,#fff2c5_100%)] text-[#083c32]`;
  }

  if (kind === "electricity") {
    return `${base} border-[#d6b667] bg-[linear-gradient(180deg,#fff4c8_0%,#ffe499_100%)] text-[#593300]`;
  }

  if (kind === "fuel") {
    return `${base} border-[#c98d65] bg-[linear-gradient(180deg,#fff0d7_0%,#ffd3af_100%)] text-[#5a1f00]`;
  }

  return `${base} border-[#caa66d] bg-[linear-gradient(180deg,#fff9de_0%,#ffe9a8_100%)] text-[#3f2b00]`;
}



function KauppiasWeatherGraphic() {

  return (
    <svg viewBox="0 0 64 64" className="h-[24px] w-[24px] drop-shadow-sm" aria-hidden="true">
      <circle cx="24" cy="23" r="11" fill="#ffd84d" stroke="#e2a400" strokeWidth="3" />
      <path d="M24 4v8M24 34v8M5 23h8M35 23h8M10 9l6 6M38 9l-6 6" stroke="#f5b400" strokeWidth="4" strokeLinecap="round" />
      <path d="M25 47h25a10 10 0 0 0 0-20 14 14 0 0 0-26-3 12 12 0 0 0 1 23Z" fill="#f4fbff" stroke="#b6d5ea" strokeWidth="3" />
    </svg>
  );
}

function KauppiasElectricityGraphic() {
  return (
    <svg viewBox="0 0 64 64" className="h-[25px] w-[25px] drop-shadow-sm" aria-hidden="true">
      <path d="M37 3 14 36h18L25 61l25-36H32L37 3Z" fill="#ffc226" stroke="#e58b00" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

function KauppiasFuelGraphic() {
  return (
    <svg viewBox="0 0 64 64" className="h-[25px] w-[25px] drop-shadow-sm" aria-hidden="true">
      <rect x="14" y="9" width="28" height="45" rx="5" fill="#d71920" stroke="#9b1117" strokeWidth="4" />
      <rect x="19" y="15" width="18" height="12" rx="2" fill="#fff4e8" />
      <path d="M42 18h6l6 8v24a5 5 0 0 1-10 0V32" fill="none" stroke="#9b1117" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M48 18v12h7" fill="none" stroke="#9b1117" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function KauppiasCalendarGraphic({ day }: { day: string }) {
  return (
    <svg viewBox="0 0 64 64" className="h-[25px] w-[25px] drop-shadow-sm" aria-hidden="true">
      <rect x="10" y="12" width="44" height="42" rx="6" fill="#fff9e8" stroke="#8a5b1d" strokeWidth="4" />
      <path d="M10 22h44" stroke="#c83927" strokeWidth="8" />
      <path d="M22 8v10M42 8v10" stroke="#8a5b1d" strokeWidth="5" strokeLinecap="round" />
      <text x="32" y="46" textAnchor="middle" fontSize="22" fontWeight="900" fill="#17322a">
        {day}
      </text>
    </svg>
  );
}

function kauppiasWeatherTextFromCode(code?: number) {
  if (code == null) return "Sää";
  if (code === 0) return "Selkeää";
  if ([1, 2, 3].includes(code)) return "Puolipilvistä";
  if ([45, 48].includes(code)) return "Sumua";
  if ([51, 53, 55, 56, 57].includes(code)) return "Tihkua";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Sadetta";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Lunta";
  if ([95, 96, 99].includes(code)) return "Ukkosta";
  return "Sää";
}

const KAUPPIAS_FI_MONTH_SHORT = [
  "TAM",
  "HEL",
  "MAA",
  "HUI",
  "TOU",
  "KES",
  "HEI",
  "ELO",
  "SYY",
  "LOK",
  "MAR",
  "JOU",
];

// V466: React/Next voi mountata page-komponentin avauksessa kahdesti.
// Tämä moduulitason lukko säilyy StrictMode-remountin yli, mutta nollautuu oikeassa selaimen reloadissa.
let ziiplyGpsBootSearchStartedV466 = false;
let ziiplyGpsBootSearchStartedAtV466 = 0;
let ziiplyGpsHardInFlightV469 = false;
let ziiplyGpsHardLastFinishedAtV469 = 0;
// V472: automaattinen boot/reload-GPS saa onnistua vain kerran per sivulataus.
// Käyttäjän GPS-nappi ei käytä tätä lukkoa, jotta GPS:n voi sammuttaa ja käynnistää käsin.
let ziiplyGpsBootAttemptedV472 = false;
let ziiplyGpsBootSucceededV472 = false;

type ZiiplyGpsWindowLockV470 = {
  inFlight: boolean;
  lastStartedAt: number;
  lastFinishedAt: number;
};

function getZiiplyGpsWindowLockV470(): ZiiplyGpsWindowLockV470 | null {
  if (typeof window === "undefined") return null;

  const key = "__ziiplyGpsWindowLockV470";
  const holder = window as any;

  if (!holder[key]) {
    holder[key] = { inFlight: false, lastStartedAt: 0, lastFinishedAt: 0 };
  }

  return holder[key] as ZiiplyGpsWindowLockV470;
}

function formatLocationNoticeV465(message: string) {
  return String(message || "")
    .replace(/…/g, "")
    .replace(/\.\.\.+/g, "")
    .replace(/[.!?]+$/g, "")
    .trim();
}

const WEATHER_APP_DISABLED_TEST_V487 = false;
const ZIIPLY_ELECTRICITY_PRICE_CACHE_KEY_V559 =
  "ziiply-electricity-price-cache-v1";


function KauppiasMobileTopBar({
  hidden = false,
  areaLabel = "Hyvinkää",
  gpsCoords = null,
  weatherEnabled = false,
  onWeatherBootGpsResolved,
  onWeatherBootGpsFailed,
  onOpenCalendar,
}: {
  hidden?: boolean;
  areaLabel?: string;
  gpsCoords?: { latitude: number; longitude: number } | null;
  weatherEnabled?: boolean;
  onWeatherBootGpsResolved?: (coords: { latitude: number; longitude: number }) => void;
  onWeatherBootGpsFailed?: () => void;
  onOpenCalendar?: () => void;
}) {
  // V481_WEATHER_BOOT_GPS_SOURCE:
  // Sääkenttä saa tehdä avauksessa yhden GPS-haun. Onnistunut koordinaatti
  // palautetaan page.tsx:lle, joka käyttää sitä paikkakuntaan ja kauppahakuun.
  // Oma page-boot-GPS pysyy silti pois päältä.
  const [weatherValue, setWeatherValue] = useState("—°");
  const [weatherText, setWeatherText] = useState(areaLabel);
  const [electricityValue, setElectricityValue] = useState("…");
  const [electricityText, setElectricityText] = useState("haetaan");
  const [electricityTrend, setElectricityTrend] = useState<"up" | "down" | "flat">("flat");

  // V482_SINGLE_GPS_OWNER:
  // Topbar/sää EI saa enää kutsua navigator.geolocationia itse.
  // Page omistaa yhden GPS-haun ja antaa koordinaatit tänne säätä varten.

  useEffect(() => {
    // V487_TEST: sääappi kokonaan pois pelistä.
    // Ei sääfetchiä eikä mitään GPS/koordinaattien käsittelyä tästä komponentista.
    if (hidden || WEATHER_APP_DISABLED_TEST_V487) {
      setWeatherValue("—°");
      setWeatherText(areaLabel);
      return;
    }
    if (!weatherEnabled || !gpsCoords) {
      setWeatherValue("—°");
      setWeatherText(areaLabel);
      return;
    }

    const pageGpsCoords = gpsCoords;
    let cancelled = false;

    async function loadWeatherFromPageGps() {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(pageGpsCoords.latitude)}&longitude=${encodeURIComponent(pageGpsCoords.longitude)}&current=temperature_2m,weather_code&timezone=auto`,
          { cache: "no-store" },
        );

        if (!response.ok || cancelled) return;

        const data = await response.json();
        const temp = Number(data?.current?.temperature_2m);
        const code = Number(data?.current?.weather_code);

        if (Number.isFinite(temp)) {
          setWeatherValue(`${temp >= 0 ? "+" : ""}${Math.round(temp)}°`);
        }

        setWeatherText(kauppiasWeatherTextFromCode(Number.isFinite(code) ? code : undefined));
      } catch {
        if (!cancelled) {
          setWeatherValue("—°");
          setWeatherText(areaLabel);
        }
      }
    }

    loadWeatherFromPageGps();

    return () => {
      cancelled = true;
    };
  }, [hidden, weatherEnabled, gpsCoords?.latitude, gpsCoords?.longitude, areaLabel]);

  useEffect(() => {
    if (hidden || typeof window === "undefined") return;

    let cancelled = false;

    function readCachedElectricity() {
      try {
        const raw = window.localStorage.getItem(ZIIPLY_ELECTRICITY_PRICE_CACHE_KEY_V559);
        if (!raw) return null;

        const cached = JSON.parse(raw) as {
          value?: string;
          text?: string;
          trend?: "up" | "down" | "flat";
          savedAt?: number;
        };

        if (!cached?.value || !cached?.savedAt) return null;

        const ageMs = Date.now() - Number(cached.savedAt);

        // yli 12h vanha tieto poistetaan kokonaan muistista
        if (ageMs > 12 * 60 * 60 * 1000) {
          window.localStorage.removeItem(ZIIPLY_ELECTRICITY_PRICE_CACHE_KEY_V559);
          return null;
        }

        return cached;
      } catch {
        return null;
      }
    }

    function writeCachedElectricity(next: {
      value: string;
      text: string;
      trend: "up" | "down" | "flat";
    }) {
      try {
        window.localStorage.setItem(
          ZIIPLY_ELECTRICITY_PRICE_CACHE_KEY_V559,
          JSON.stringify({
            ...next,
            savedAt: Date.now(),
          }),
        );
      } catch {
        // localStorage voi olla estetty; silloin jatketaan ilman muistia.
      }
    }

    function showCachedElectricityIfAvailable() {
      const cached = readCachedElectricity();
      if (!cached) return false;

      const cachedValue = String(cached.value);
      const cachedText = String(cached.text || "c/kWh");
      const cachedTrend: "up" | "down" | "flat" =
        cached.trend === "up" || cached.trend === "down" || cached.trend === "flat"
          ? cached.trend
          : "flat";

      const ageMs = Date.now() - Number(cached.savedAt);
      const ageMinutes = Math.max(0, Math.round(ageMs / 60000));

      setElectricityValue(cachedValue);
      setElectricityTrend(cachedTrend);

      if (ageMinutes <= 20) {
        setElectricityText(cachedText);
      } else if (ageMinutes < 120) {
        setElectricityText("muistista");
      } else {
        setElectricityText("vanha tieto");
      }

      return true;
    }


    function readNumber(value: unknown) {
      if (typeof value === "number") return Number.isFinite(value) ? value : null;

      const text = String(value ?? "")
        .trim()
        .replace(/\s/g, "")
        .replace(",", ".");

      const match = text.match(/-?\d+(?:\.\d+)?/);
      if (!match) return null;

      const number = Number(match[0]);
      return Number.isFinite(number) ? number : null;
    }

    function readTime(...values: unknown[]) {
      for (const value of values) {
        if (value == null) continue;

        const time = new Date(String(value)).getTime();
        if (Number.isFinite(time)) return time;
      }

      return null;
    }

    function readPriceCents(item: any) {
      if (!item || typeof item !== "object") return null;

      const centFields = [
        item.value,
        item.price,
        item.priceWithTax,
        item.PriceWithTax,
        item.priceNoTax,
        item.PriceNoTax,
        item.spotPrice,
        item.SpotPrice,
        item.centsPerKwh,
        item.cents_per_kwh,
      ];

      for (const field of centFields) {
        const number = readNumber(field);
        if (number != null && Math.abs(number) <= 500) return number;
      }

      const eurFields = [
        item.EUR_per_kWh,
        item.eur_per_kwh,
        item.eurPerKwh,
      ];

      for (const field of eurFields) {
        const number = readNumber(field);
        if (number != null && Math.abs(number * 100) <= 500) return number * 100;
      }

      return null;
    }

    async function fetchJson(url: string) {
      const separator = url.includes("?") ? "&" : "?";
      const response = await fetch(`${url}${separator}ziiply_no_cache=${Date.now()}`, {
        cache: "no-store",
        headers: { accept: "application/json" },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      return response.json();
    }

    let latestResolvedTrend: "up" | "down" | "flat" = "flat";

    function setTrendFromNext(currentPrice: number, nextPrice: number | null) {
      if (nextPrice == null) {
        latestResolvedTrend = "flat";
        setElectricityTrend("flat");
        return;
      }

      const diff = nextPrice - currentPrice;
      if (diff > 0.05) latestResolvedTrend = "up";
      else if (diff < -0.05) latestResolvedTrend = "down";
      else latestResolvedTrend = "flat";

      setElectricityTrend(latestResolvedTrend);
    }

    function formatLocalDateParts() {
      const formatter = new Intl.DateTimeFormat("fi-FI", {
        timeZone: "Europe/Helsinki",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      const parts = formatter.formatToParts(new Date());
      const year = parts.find((part) => part.type === "year")?.value || "";
      const month = parts.find((part) => part.type === "month")?.value || "";
      const day = parts.find((part) => part.type === "day")?.value || "";

      return { year, month, day };
    }

    async function readSahkotinQuarter() {
      const now = new Date();
      const start = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const end = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();

      const data = await fetchJson(
        `https://sahkotin.fi/prices?quarter&fix&vat&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      );

      const rawPrices = Array.isArray(data?.prices)
        ? data.prices
        : Array.isArray(data)
          ? data
          : [];

      const windows = rawPrices
        .map((item: any, index: number, all: any[]) => {
          const price = readPriceCents(item);
          const startMs = readTime(item.date, item.time_start, item.startDate, item.start);
          const explicitEndMs = readTime(item.time_end, item.endDate, item.end);
          const nextStartMs = readTime(all[index + 1]?.date, all[index + 1]?.time_start, all[index + 1]?.startDate, all[index + 1]?.start);
          const endMs = explicitEndMs ?? nextStartMs ?? (startMs == null ? null : startMs + 15 * 60 * 1000);

          if (price == null || startMs == null || endMs == null) return null;

          return { price, startMs, endMs };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.startMs - b.startMs) as Array<{
          price: number;
          startMs: number;
          endMs: number;
        }>;

      const currentIndex = windows.findIndex(
        (item) => item.startMs <= now.getTime() && now.getTime() < item.endMs,
      );

      if (currentIndex < 0) throw new Error("ei nykyvarttia");

      const current = windows[currentIndex];
      const next = windows[currentIndex + 1];

      setTrendFromNext(current.price, next?.price ?? null);

      return current.price;
    }

    async function readPorssisahkoLatest() {
      const urls = [
        "https://api.porssisahko.net/v1/latest-prices.json",
        "https://api.porssisahko.net/v2/latest-prices.json",
      ];

      let lastError = "ei listaa";

      for (const url of urls) {
        try {
          const data = await fetchJson(url);
          const rawPrices = Array.isArray(data?.prices)
            ? data.prices
            : Array.isArray(data)
              ? data
              : [];

          const windows = rawPrices
            .map((item: any) => {
              const price = readPriceCents(item);
              const startMs = readTime(
                item.startDate,
                item.start,
                item.StartDate,
                item.time_start,
                item.date,
                item.Date,
              );
              const endMs = readTime(item.endDate, item.end, item.EndDate, item.time_end);

              if (price == null || startMs == null || endMs == null) return null;

              return { price, startMs, endMs };
            })
            .filter(Boolean)
            .sort((a: any, b: any) => a.startMs - b.startMs) as Array<{
              price: number;
              startMs: number;
              endMs: number;
            }>;

          const now = Date.now();
          const currentIndex = windows.findIndex(
            (item) => item.startMs <= now && now < item.endMs,
          );

          if (currentIndex < 0) {
            lastError = "ei nykyhetkeä";
            continue;
          }

          const current = windows[currentIndex];
          const next = windows[currentIndex + 1];

          setTrendFromNext(current.price, next?.price ?? null);

          return current.price;
        } catch (error) {
          lastError = error instanceof Error ? error.message : "api virhe";
        }
      }

      throw new Error(lastError);
    }

    async function readPorssisahkoDirect() {
      const iso = new Date().toISOString();
      const data = await fetchJson(
        `https://api.porssisahko.net/v2/price.json?date=${encodeURIComponent(iso)}`,
      );

      const price = readPriceCents(data);
      if (price == null) throw new Error("ei hintaa");

      setElectricityTrend("flat");
      return price;
    }

    async function readSahkonHintaTanaan() {
      const { year, month, day } = formatLocalDateParts();
      if (!year || !month || !day) throw new Error("ei päivää");

      const data = await fetchJson(
        `https://www.sahkonhintatanaan.fi/api/v1/prices/${year}/${month}-${day}.json`,
      );

      const rawPrices = Array.isArray(data) ? data : Array.isArray(data?.prices) ? data.prices : [];

      const windows = rawPrices
        .map((item: any, index: number, all: any[]) => {
          const price = readPriceCents(item);
          const startMs = readTime(item.time_start, item.startDate, item.start, item.date);
          const explicitEndMs = readTime(item.time_end, item.endDate, item.end);
          const nextStartMs = readTime(all[index + 1]?.time_start, all[index + 1]?.startDate, all[index + 1]?.start, all[index + 1]?.date);
          const endMs = explicitEndMs ?? nextStartMs;

          if (price == null || startMs == null || endMs == null) return null;

          return { price, startMs, endMs };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.startMs - b.startMs) as Array<{
          price: number;
          startMs: number;
          endMs: number;
        }>;

      const now = Date.now();
      const currentIndex = windows.findIndex((item) => item.startMs <= now && now < item.endMs);

      if (currentIndex < 0) throw new Error("ei nykyhetkeä");

      const current = windows[currentIndex];
      const next = windows[currentIndex + 1];

      setTrendFromNext(current.price, next?.price ?? null);

      return current.price;
    }

    async function loadElectricity() {
      if (cancelled) return;

      const hadCachedElectricity = showCachedElectricityIfAvailable();

      if (!hadCachedElectricity) {
        setElectricityValue("…");
        setElectricityText("haetaan");
      }

      const readers = [
        readSahkotinQuarter,
        readPorssisahkoLatest,
        readPorssisahkoDirect,
        readSahkonHintaTanaan,
      ];

      const errors: string[] = [];

      for (const reader of readers) {
        try {
          const price = await reader();
          if (cancelled) return;

          const formattedPrice = price.toLocaleString("fi-FI", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          });

          setElectricityValue(formattedPrice);
          setElectricityText("c/kWh");

          writeCachedElectricity({
            value: formattedPrice,
            text: "c/kWh",
            trend: latestResolvedTrend,
          });

          return;
        } catch (error) {
          errors.push(error instanceof Error ? error.message : "api virhe");
        }
      }

      if (cancelled) return;

      const hadCachedElectricityAfterFailure = showCachedElectricityIfAvailable();
      if (hadCachedElectricityAfterFailure) return;

      setElectricityValue("—");
      setElectricityTrend("flat");

      const message = errors.join(" / ");
      if (message.includes("Failed to fetch")) setElectricityText("fetch virhe");
      else if (message.includes("HTTP")) setElectricityText(message.match(/HTTP \d+/)?.[0] || "HTTP");
      else if (message.includes("ei nykyvarttia")) setElectricityText("ei varttia");
      else if (message.includes("ei nykyhetkeä")) setElectricityText("ei nykyhetkeä");
      else if (message.includes("ei hintaa")) setElectricityText("ei hintaa");
      else setElectricityText("api virhe");
    }

    loadElectricity();
    const interval = window.setInterval(loadElectricity, 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [hidden]);


  const calendarDisplay = useMemo(() => {
    const now = new Date();
    return {
      day: String(now.getDate()),
      month: KAUPPIAS_FI_MONTH_SHORT[now.getMonth()] || "",
    };
  }, []);

  const electricityTrendTitle =
    electricityTrend === "up"
      ? "Kallistuu seuraavassa vartissa"
      : electricityTrend === "down"
        ? "Halpenee seuraavassa vartissa"
        : "Vakaa seuraavassa vartissa";

  const electricityTrendLampClass =
    electricityTrend === "up"
      ? "border-[#7f1f16] bg-[radial-gradient(circle_at_35%_30%,#ffd1c8_0%,#d94a38_38%,#8f1f18_100%)] shadow-[0_0_5px_rgba(178,31,23,0.62),inset_0_1px_1px_rgba(255,255,255,0.72)]"
      : electricityTrend === "down"
        ? "border-[#0f5f31] bg-[radial-gradient(circle_at_35%_30%,#c9ffd8_0%,#238a48_42%,#0d5a30_100%)] shadow-[0_0_5px_rgba(8,122,58,0.58),inset_0_1px_1px_rgba(255,255,255,0.72)]"
        : "border-[#786f5a] bg-[radial-gradient(circle_at_35%_30%,#f4ecd3_0%,#a7a08b_45%,#736d5d_100%)] opacity-70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.62)]";

  const panels = [
    {
      id: "weather" as const,
      title: "SÄÄ",
      value: weatherValue,
      unit: "",
      detail: weatherText,
      graphic: <KauppiasWeatherGraphic />,
    },
    {
      id: "electricity" as const,
      title: "SÄHKÖ",
      value: electricityValue,
      unit: "c/kWh",
      detail: electricityText,
      graphic: <KauppiasElectricityGraphic />,
    },
    {
      id: "fuel" as const,
      title: "AJOAINE",
      value: "—",
      unit: "",
      detail: "Ei hintaa",
      graphic: <KauppiasFuelGraphic />,
    },
    {
      id: "calendar" as const,
      title: calendarDisplay.month,
      value: calendarDisplay.day,
      unit: "",
      detail: "Kalenteri",
      graphic: <KauppiasCalendarGraphic day={calendarDisplay.day} />,
      onClick: onOpenCalendar,
    },
  ];

  if (hidden) return null;

  return (
    <div className="fixed inset-x-0 top-[max(env(safe-area-inset-top),0px)] z-[90] mx-auto block w-full translate-y-0 transform-gpu px-[6px] pt-[4px] sm:hidden">
      <div className="mx-auto flex h-[78px] w-[calc(100vw-12px)] max-w-none items-center overflow-hidden rounded-[1.65rem] border-[4px] border-[#073d32] bg-[#fff5d9] px-[7px] shadow-[0_10px_28px_rgba(8,42,35,0.18),inset_0_0_0_2px_rgba(255,255,255,0.7)]">
        <div className="grid min-w-0 flex-1 grid-cols-[1fr_1fr_1.24fr_0.86fr] gap-[6px]">
          {panels.map((panel) => {
            const inner = (
              <>
                <span className="absolute left-[4px] top-[4px] h-[5px] w-[5px] rounded-full border border-[#b38a4d] bg-[#fff2bc]" />
                <span className="absolute right-[4px] top-[4px] h-[5px] w-[5px] rounded-full border border-[#b38a4d] bg-[#fff2bc]" />
                <span className="absolute bottom-[4px] left-[4px] h-[5px] w-[5px] rounded-full border border-[#b38a4d] bg-[#fff2bc]" />
                <span className="absolute bottom-[4px] right-[4px] h-[5px] w-[5px] rounded-full border border-[#b38a4d] bg-[#fff2bc]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.70),transparent_55%)]" />

                {panel.id === "electricity" && (
                  <span
                    className={`pointer-events-none absolute right-[14px] top-[25px] z-30 block h-[9px] w-[9px] rounded-full border ${electricityTrendLampClass}`}
                    title={electricityTrendTitle}
                    aria-hidden="true"
                  />
                )}

                <div className="relative z-10 flex h-full flex-col items-center justify-center text-center leading-none">
                  <div className="flex items-center justify-center gap-[2px]">
                    {panel.graphic}
                    <div className="text-[10px] font-black uppercase tracking-[0.04em]">
                      {panel.title}
                    </div>
                  </div>

                  <div className="mt-[1px] flex items-center justify-center gap-[2px]">
                    <span className="text-[18px] font-black leading-none tracking-[-0.04em] text-[#041b19]">
                      {panel.value}
                    </span>

                    {panel.unit && (
                      <span className="pt-[2px] text-[8px] font-black leading-none opacity-80">
                        {panel.unit}
                      </span>
                    )}
                  </div>

                  <div className="mt-[2px] max-w-full truncate px-1 text-[8px] font-black leading-none opacity-75">
                    {panel.detail}
                  </div>
                </div>
              </>
            );

            const className = kauppiasTopBarPanelClass(panel.id);

            if (panel.onClick) {
              return (
                <button
                  key={panel.id}
                  type="button"
                  onClick={panel.onClick}
                  className={className}
                  aria-label={panel.title}
                >
                  {inner}
                </button>
              );
            }

            return (
              <div key={panel.id} className={className}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


export default function Page() {
  const TopbarResponsiveCard = ((TopbarResponsiveCardModule as any).default ||
    (TopbarResponsiveCardModule as any).TopbarResponsiveCard ||
    (TopbarResponsiveCardModule as any).ZiiplyTopBar ||
    (TopbarResponsiveCardModule as any).ZiiplyTopbarResponsiveCard) as any;
  const ZiiplyCartCard = ((ZiiplyCartCardModule as any).default ||
    (ZiiplyCartCardModule as any).ZiiplyCartCard) as any;
  const ZiiplyCompareCard = ((ZiiplyCompareCardModule as any).default ||
    (ZiiplyCompareCardModule as any).ZiiplyCompareCard) as any;
  const ZiiplyMobileShopsViewAny = ZiiplyMobileShopsView as any;

  const [input, setInput] = useState("");
  const [searchCompareMode, setSearchCompareMode] = useState<"cart" | "single">(
    "cart",
  );
  const [locationInput, setLocationInput] = useState("");
  const [activeArea, setActiveArea] = useState<Area>(AREAS[0]);
  const [storeMode, setStoreMode] = useState<StoreMode>("hyper");
  const [storeModeChosenV299, setStoreModeChosenV299] = useState(true);
  const selectedStoreModeRefV302 = useRef<StoreMode>("hyper");
  const storeSelectionHydratedRefV343 = useRef(false);
  const storeSelectionPersistenceReadyRefV343 = useRef(false);
  const STORE_SELECTION_STORAGE_KEY_V343 = "ziiply-store-selection-v343";
  const [storeCompareScope, setStoreCompareScope] =
    useState<StoreCompareScope>("between_chains");
  const [withinChain, setWithinChain] = useState<"S" | "K" | null>(null);
  const [openStorePicker, setOpenStorePicker] = useState<string | null>(null);
  const [storeDrillViewV320, setStoreDrillViewV320] = useState<
    "main" | "selection"
  >("main");
  const [locationMessage, setLocationMessage] = useState(
    "Paikannetaan GPS",
  );
  const [locationMessageVisible, setLocationMessageVisible] = useState(true);
  const [usingOwnLocation, setUsingOwnLocation] = useState(false);
  const [storeSearchLoading, setStoreSearchLoading] = useState(false);
  const [foundStores, setFoundStores] = useState<StoreSearchItem[]>([]);
  const [gpsCoordsV320, setGpsCoordsV320] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [gpsBootReadyV473, setGpsBootReadyV473] = useState(false);
  const [storeDistanceFallbacksV320, setStoreDistanceFallbacksV320] = useState<
    Record<string, number>
  >({});
  const [keyboardOpenV320, setKeyboardOpenV320] = useState(false);
  const [gpsStorePickerBlockedV382, setGpsStorePickerBlockedV382] = useState(false);
  const gpsInitialVisiblePhaseRefV391 = useRef(true);
  const gpsWatchIdRefV391 = useRef<number | null>(null);
  const gpsLastSilentCoordsRefV391 = useRef<{ latitude: number; longitude: number } | null>(null);
  const gpsLastSilentAreaRefV391 = useRef("");
  const gpsFailTimerRefV391 = useRef<number | null>(null);
  const gpsSearchInFlightRefV465 = useRef(false);
  const gpsInitialSearchStartedRefV465 = useRef(false);
  const gpsLastFinishedAtRefV466 = useRef(0);
  const weatherBootApplyInFlightRefV481 = useRef(false);
  const gpsBootTimerRefV483 = useRef<number | null>(null);
  const gpsBootWatchdogRefV483 = useRef<number | null>(null);
  // V485_MANUAL_GPS_SUCCESS_GUARD:
  // Kun manuaalinen GPS-haku onnistuu, vihreä nuppineula / LocationBar / StoreLocaCard
  // ei saa laukaista samaa GPS-hakua uudestaan. Tämä lukko koskee vain uutta
  // useOwnLocation("manual") -starttia onnistuneen haun jälkeen. GPS pois päältä
  // -nappi tyhjentää lukon, joten käyttäjä voi käynnistää GPS:n myöhemmin uudestaan.
  const gpsManualSuccessGuardUntilRefV485 = useRef(0);
  const gpsManualSuccessCoordsRefV485 = useRef<{ latitude: number; longitude: number } | null>(null);
  // gps debug removed

  function pushGpsDebugLogV492(_message: string) { return; }
  const [storePickerViewportStyle, setStorePickerViewportStyle] = useState<{
    top: number;
    width: number;
  }>({ top: 286, width: 286 });

  const gpsStoreLocationPendingV366 =
    usingOwnLocation && !gpsCoordsV320 && foundStores.length === 0;
  const storePickerCanOpenV366 =
    foundStores.length > 0 &&
    !storeSearchLoading &&
    !gpsStoreLocationPendingV366 &&
    !gpsStorePickerBlockedV382;


  useEffect(() => {
    if (!openStorePicker || typeof document === "undefined") return;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousTouchAction = body.style.touchAction;

    body.style.overflow = "hidden";
    body.style.touchAction = "none";

    return () => {
      body.style.overflow = previousOverflow;
      body.style.touchAction = previousTouchAction;
    };
  }, [openStorePicker]);

  useEffect(() => {
    if (!openStorePicker || typeof window === "undefined") return;

    const updateStorePickerViewportStyle = () => {
      const visualViewport = window.visualViewport;
      const viewportWidth = visualViewport?.width ?? window.innerWidth;
      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const viewportTop = visualViewport?.offsetTop ?? 0;

      const pickerWidth = Math.min(286, Math.max(270, viewportWidth - 118));

      // iPhone Safarin ala-toolbar + oma bottom nav:
      // pidetään valintaikkuna alempana. Narrow-versiossa tämä ei saa hypätä
      // ylös, kun Safari/visualViewport antaa reloadin jälkeen väliaikaisen korkeuden.
      // v374_MOBILE_STORE_PICKER_ALIGN:
      // Valintaikkuna avataan samalle pystylinjalle kauppakorttirivin kanssa,
      // ei enää liian alas korttien päälle.
      const top =
        viewportTop +
        Math.max(
          230,
          Math.min(300, Math.round(viewportHeight * 0.36)),
        );

      setStorePickerViewportStyle({
        // v376: nostetaan valintaikkunan yläreuna samaan pystykorkoon S/K-kauppakorttirivin kanssa.
        top: top + 16,
        width: pickerWidth,
      });
    };

    updateStorePickerViewportStyle();

    window.visualViewport?.addEventListener("resize", updateStorePickerViewportStyle);
    window.visualViewport?.addEventListener("scroll", updateStorePickerViewportStyle);
    window.addEventListener("resize", updateStorePickerViewportStyle);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateStorePickerViewportStyle);
      window.visualViewport?.removeEventListener("scroll", updateStorePickerViewportStyle);
      window.removeEventListener("resize", updateStorePickerViewportStyle);
    };
  }, [openStorePicker]);

  useEffect(() => {
    if (!openStorePicker) return;
    if (storePickerCanOpenV366) return;

    setOpenStorePicker(null);
  }, [openStorePicker, storePickerCanOpenV366]);

  // v384_GPS_KEEP_SHOPS_VISIBLE:
  // Kauppanäkymää ei enää piiloteta GPS-haun ajaksi; vain store picker suljetaan/estetään.

  // v382_GPS_PICKER_RACE_FIX:
  // GPS:n päälle/pois-vaihto ei saa jättää kaupan valintaikkunaa auki eikä avata sitä
  // välirenderissä ennen kuin sijainti ja kauppalista ovat taas vakaat.
  useEffect(() => {
    if (!openStorePicker) return;
    if (!storeSearchLoading && !gpsStoreLocationPendingV366 && !gpsStorePickerBlockedV382) return;

    setOpenStorePicker(null);
  }, [openStorePicker, storeSearchLoading, gpsStoreLocationPendingV366, gpsStorePickerBlockedV382]);


  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateKeyboardState = () => {
      const activeElement = document.activeElement;
      const isTextInputFocused =
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLInputElement ||
        (activeElement instanceof HTMLElement &&
          activeElement.isContentEditable);

      const visualViewport = window.visualViewport;
      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const keyboardLikelyOpen =
        isTextInputFocused && viewportHeight < window.innerHeight - 110;

      setKeyboardOpenV320(Boolean(keyboardLikelyOpen));
    };

    updateKeyboardState();

    window.visualViewport?.addEventListener("resize", updateKeyboardState);
    window.visualViewport?.addEventListener("scroll", updateKeyboardState);
    window.addEventListener("resize", updateKeyboardState);
    window.addEventListener("focusin", updateKeyboardState);
    window.addEventListener("focusout", updateKeyboardState);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateKeyboardState);
      window.visualViewport?.removeEventListener("scroll", updateKeyboardState);
      window.removeEventListener("resize", updateKeyboardState);
      window.removeEventListener("focusin", updateKeyboardState);
      window.removeEventListener("focusout", updateKeyboardState);
    };
  }, []);

  // STORE_MODE_PERSIST_V302
  // Pitää käyttäjän valitseman Tavaratalot/Lähikaupat-tilan vakaana myös kaupan vaihdon
  // ja kauppalistan päivityksen jälkeen.
  useEffect(() => {
    // v304_STORE_MODE_LOCK:
    // Ref on käyttäjän valitseman moodin lähde. Älä anna satunnaisen storeMode-resetin
    // ylikirjoittaa sitä sen jälkeen, kun käyttäjä on valinnut Tavaratalot/Lähikaupat.
    if (!storeModeChosenV299) {
      selectedStoreModeRefV302.current = storeMode;
    }
  }, [storeMode, storeModeChosenV299]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // v305_EMPTY_REFRESH_GPS_TOGGLE:
    // Uusi selainikkuna / refresh ei saa palauttaa Tavaratalot/Lähikaupat-valintaa.
    // Kauppatyyppi valitaan joka sessiossa käsin, jotta vanha localStorage ei lukitse UI:ta.
    try {
      localStorage.removeItem("ziiply-store-mode-v302");
      localStorage.removeItem("ziiply-store-mode");
      localStorage.removeItem("storeMode");
      localStorage.removeItem("ziiply-use-own-location");
    } catch {}

    selectedStoreModeRefV302.current = "hyper";
    setStoreMode("hyper");
    setStoreModeChosenV299(true);
    setStoreCompareScope("between_chains");
    setWithinChain(null);
    // v315_INITIAL_NAV_PROMPT: refresh/ensimmäinen avaus ei avaa mitään korttia.
    // Vain Kaupat-nappi on käytettävissä, mutta se ei ole vielä aktiivinen ennen käyttäjän painallusta.
    setSearchPanelOpen(false);
    setCartModalOpen(false);
    setCartSavePanelOpen(false);
    setEanModalOpen(false);
    setActiveResult("none");
    setShopsPanelOpen(false);
    setInitialStoreNavPrompt(false);
    // V466_GPS_BOOT_SINGLE_FLIGHT:
    // Älä käynnistä GPS:ää tässä reset-efektissä. Varsinainen alkuhaku tehdään
    // alempana yhdessä kontrolloidussa efektissä, jotta avaus/reload ei tee kahta GPS-hakua.
    gpsUserDisabledRefV306.current = false;
    // V471: älä laita GPS:ää pending-tilaan reset-efektistä.
    // Ainoa avausstartti on alempana boot-efektissä, joka kutsuu useOwnLocation().
    gpsInitialVisiblePhaseRefV391.current = false;
    setGpsCoordsV320(null);
    setLocationMessageVisible(true);
  }, []);

  useEffect(() => {
    setLocationMessageVisible(true);

    const lower = locationMessage.toLowerCase();

    // v360_LOCATION_STATUS_AUTO_HIDE:
    // GPS-/kauppainfo näkyy hetken aikaa Kaupat ja sijainti -paneelissa
    // ja katoaa automaattisesti, kun tila on vakaa.
    const shouldAutoHide =
      !storeSearchLoading &&
      (
        lower.includes("käytössä") ||
        lower.includes("löytyi") ||
        lower.includes("valittu") ||
        false && false && lower.includes("gps")
      );

    if (!shouldAutoHide) return;

    const timer = window.setTimeout(() => {
      setLocationMessageVisible(false);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [locationMessage, storeSearchLoading]);

  useEffect(() => {
    if (!gpsCoordsV320 || foundStores.length === 0) {
      setStoreDistanceFallbacksV320({});
      return;
    }

    const gpsCoordsForFallbackV320 = gpsCoordsV320;
    let cancelled = false;
    const controller = new AbortController();

    async function geocodeStoreDistanceFallbacksV320() {
      const candidates = uniqueStoresByIdAndName(
        foundStores.map(normalizeStoreForPickerV320),
      )
        .filter((store) => !getStoreDistanceLabelWithoutFallbackV320(store))
        .slice(0, 24);

      if (candidates.length === 0) return;

      const nextDistances: Record<string, number> = {};

      for (const store of candidates) {
        if (cancelled) return;

        const queryParts = [
          store.name,
          store.city || activeArea.label,
          store.postalCode,
          "Suomi",
        ].filter(Boolean);
        const query = queryParts.join(", ");

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=fi&q=${encodeURIComponent(query)}`,
            { signal: controller.signal },
          );
          if (!response.ok) continue;

          const results = await response.json();
          const first = Array.isArray(results) ? results[0] : null;
          const latitude = readStoreNumberV320(first?.lat);
          const longitude = readStoreNumberV320(first?.lon ?? first?.lng);
          if (latitude == null || longitude == null) continue;

          nextDistances[getStoreDistanceKeyV320(store)] =
            calculateDistanceKmV320(gpsCoordsForFallbackV320, {
              latitude,
              longitude,
            });
        } catch (error) {
          if (!cancelled)
            console.debug("Etäisyyden varalaskenta epäonnistui", error);
        }
      }

      if (cancelled || Object.keys(nextDistances).length === 0) return;

      setStoreDistanceFallbacksV320((current) => {
        const merged = { ...current, ...nextDistances };
        return JSON.stringify(merged) === JSON.stringify(current)
          ? current
          : merged;
      });
    }

    geocodeStoreDistanceFallbacksV320();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [gpsCoordsV320, foundStores, activeArea.label]);

  const [offers, setOffers] = useState<ZiiplyOffer[]>([]);
  const [hasSearchedOffers, setHasSearchedOffers] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [offerSearchQuerySnapshot, setOfferSearchQuerySnapshot] = useState("");
  const [offerSearchDoneForQuery, setOfferSearchDoneForQuery] = useState("");
  const [chainFilter, setChainFilter] = useState<"all" | "S" | "K">("all");
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const [activeResult, setActiveResult] = useState<
    "none" | "offers" | "compare" | "singleCompare"
  >("none");
  const [activeAssistant, setActiveAssistant] =
    useState<ZiiplyAssistantKey | null>(null);
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);

  const searchFullscreenOpenV621 = searchPanelOpen;

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.body.classList.toggle(
      "ziiply-mobile-search-fullscreen-active",
      searchFullscreenOpenV621,
    );

    return () => {
      document.body.classList.remove("ziiply-mobile-search-fullscreen-active");
    };
  }, [searchFullscreenOpenV621]);


  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [cartSavePanelOpen, setCartSavePanelOpen] = useState(false);
  const [shopsPanelOpen, setShopsPanelOpen] = useState(false);
  const [inlineHakutapaNoticeVisibleV452, setInlineHakutapaNoticeVisibleV452] = useState(false);
  const [mapStoresOverlayOpenV433, setMapStoresOverlayOpenV433] = useState(false);
  const [mapRouteOverlayOpenV428, setMapRouteOverlayOpenV428] = useState(false);
  const [initialStoreNavPrompt, setInitialStoreNavPrompt] = useState(false);
  const [gpsErrorMessage, setGpsErrorMessage] = useState("");
  const [gpsAutoActivatedV287, setGpsAutoActivatedV287] = useState(false);
  const gpsUserDisabledRefV306 = useRef(false);
  const lastAutoAppliedLocationRefV361 = useRef("");

  
  function getDistanceMetersV391(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
  ) {
    const radius = 6371000;
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(to.latitude - from.latitude);
    const dLon = toRad(to.longitude - from.longitude);
    const lat1 = toRad(from.latitude);
    const lat2 = toRad(to.latitude);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

    return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function getNearestAreaFromGpsV391(coords: { latitude: number; longitude: number }) {
    const areasWithCoords = AREAS
      .map((area) => {
        const latitude = Number((area as any).latitude ?? (area as any).lat);
        const longitude = Number((area as any).longitude ?? (area as any).lng ?? (area as any).lon);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

        return {
          area,
          distance: getDistanceMetersV391(coords, { latitude, longitude }),
        };
      })
      .filter(Boolean) as Array<{ area: Area; distance: number }>;

    if (areasWithCoords.length === 0) return activeArea;

    return areasWithCoords.sort((a, b) => a.distance - b.distance)[0]?.area || activeArea;
  }

  function setGpsVisibleMessageV391(areaLabel: string) {
    gpsInitialVisiblePhaseRefV391.current = false;

    if (gpsFailTimerRefV391.current) {
      window.clearTimeout(gpsFailTimerRefV391.current);
      gpsFailTimerRefV391.current = null;
    }

    setGpsErrorMessage("");
    setStoreSearchLoading(false);
    setLocationMessage(`${areaLabel} käytössä`);
    setLocationMessageVisible(true);
  }

  function setGpsSilentLocationV391(coords: { latitude: number; longitude: number }) {
    gpsLastSilentCoordsRefV391.current = coords;

    const nearestArea = getNearestAreaFromGpsV391(coords);
    const nextAreaLabel = nearestArea?.label || activeArea.label;

    setGpsCoordsV320(coords);

    if (nearestArea && nearestArea.label !== activeArea.label) {
      setActiveArea(nearestArea);
    }

    if (gpsLastSilentAreaRefV391.current !== nextAreaLabel) {
      gpsLastSilentAreaRefV391.current = nextAreaLabel;
      setGpsVisibleMessageV391(nextAreaLabel);
    }
  }

  function startSilentGpsWatchV391() {
    // V469: älä käynnistä watchPositionia automaattisesti avauksessa.
    // Aiemmin tämä aiheutti toisen GPS-paikannuksen heti alkuhaun jälkeen ja UI jäi
    // joillakin puhelimilla pysyvään "Paikannetaan GPS" -tilaan.
    return;
  }

  function stopSilentGpsWatchV391() {
    if (
      typeof navigator !== "undefined" &&
      navigator.geolocation &&
      gpsWatchIdRefV391.current != null
    ) {
      navigator.geolocation.clearWatch(gpsWatchIdRefV391.current);
      gpsWatchIdRefV391.current = null;
    }
  }

function stopOwnLocationV306(message = "GPS pois päältä") {
    gpsUserDisabledRefV306.current = true;
    gpsInitialVisiblePhaseRefV391.current = false;
    stopSilentGpsWatchV391();
    if (gpsFailTimerRefV391.current) {
      window.clearTimeout(gpsFailTimerRefV391.current);
      gpsFailTimerRefV391.current = null;
    }
    setOpenStorePicker(null);
    setGpsStorePickerBlockedV382(false);
    gpsManualSuccessGuardUntilRefV485.current = 0;
    gpsManualSuccessCoordsRefV485.current = null;
    setUsingOwnLocation(false);
    setGpsCoordsV320(null);
    setStoreSearchLoading(false);
    setGpsErrorMessage("");
    setLocationInput("");
    setLocationMessage(message);
    setLocationMessageVisible(true);
    try {
      localStorage.removeItem("ziiply-use-own-location");
    } catch {}
  }
  // Mobile comparison view uses the same activeResult state as desktop, but renders as its own overlay.
  const [cart, setCart] = useState<CartItem[]>([]);
  const [restoredCartPromptV320, setRestoredCartPromptV320] = useState<{
    open: boolean;
    count: number;
    savedAt?: number;
  }>({ open: false, count: 0 });
  const cartIsEmpty = cart.length === 0;

  function getMobileCartItemKeyV546(item: any) {
    return String(
      item?.id ??
        item?.ean ??
        item?.name ??
        item?.product?.id ??
        item?.product?.ean ??
        JSON.stringify(item),
    );
  }

  function updateMobileCartItemQuantityV546(item: any, delta: number) {
    const targetKey = String(item?.id ?? "");

    setCart((current) =>
      current.map((cartItem: any) => {
        const key = getMobileCartItemKeyV546(cartItem);
        if (key !== targetKey) return cartItem;

        const currentQuantity = Number(cartItem.quantity ?? cartItem.amount ?? 1);
        const nextQuantity = Math.max(
          1,
          (Number.isFinite(currentQuantity) ? currentQuantity : 1) + delta,
        );

        return {
          ...cartItem,
          quantity: nextQuantity,
          amount: nextQuantity,
        };
      }),
    );
  }


  const [normalResults, setNormalResults] = useState<Product[]>([]);
  const [normalSearchAttempted, setNormalSearchAttempted] = useState(false);
  const [searchDebug, setSearchDebug] = useState<SearchDebugEntry[]>([]);
  const [loadingNormal, setLoadingNormal] = useState(false);
  const [singleProductCompareResults, setSingleProductCompareResults] =
    useState<SingleProductCompareResult[]>([]);
  const [singleProductCompareLoading, setSingleProductCompareLoading] =
    useState(false);
  const [singleProductCompareTerm, setSingleProductCompareTerm] = useState("");
  const searchNavigationLocked =
    loadingOffers || loadingNormal || singleProductCompareLoading;
  const withinChainStoresReadyV320 = Boolean(
    storeCompareScope === "within_chain" &&
    withinChain &&
    (withinChain === "S"
      ? (activeArea.sStoreId || activeArea.sStoreName) &&
        (activeArea.sLocalStoreId || activeArea.sLocalStoreName)
      : (activeArea.kStoreId || activeArea.kStoreName) &&
        (activeArea.kLocalStoreId || activeArea.kLocalStoreName)),
  );
  const storesReadyForSearch = Boolean(
    (storeCompareScope === "between_chains" && storeModeChosenV299) ||
    withinChainStoresReadyV320,
  );
  const initialStoreSelectionLocked =
    !storesReadyForSearch && cart.length === 0;
  // V476: Hae-napin pitää pystyä sulkemaan Hae-kortti myös silloin,
  // kun haku/lataus lukitsee uuden navigoinnin. Lukitus koskee vain avausta.
  const searchBottomNavDisabled =
    !searchPanelOpen && (searchNavigationLocked || initialStoreSelectionLocked);
  const [searchReadyBounceKeyV320, setSearchReadyBounceKeyV320] = useState(0);
  const [haeReadyBadgeTimerVisibleV520, setHaeReadyBadgeTimerVisibleV520] =
    useState(false);
  const previousSearchReadySignatureV320 = useRef("");
  const suppressHaeReadyBadgeUntilRefV541 = useRef(0);

  const searchReadySignatureV320 = storesReadyForSearch
    ? [
        storeCompareScope,
        storeMode,
        withinChain || "",
        activeArea.sStoreId || "",
        activeArea.sStoreName || "",
        activeArea.kStoreId || "",
        activeArea.kStoreName || "",
        activeArea.sLocalStoreId || "",
        activeArea.sLocalStoreName || "",
        activeArea.kLocalStoreId || "",
        activeArea.kLocalStoreName || "",
      ].join("|")
    : "";

  useEffect(() => {
    if (!storesReadyForSearch) {
      previousSearchReadySignatureV320.current = "";
      setHaeReadyBadgeTimerVisibleV520(false);
      return;
    }

    // V541: älä päivitä previousSearchReadySignaturea täällä.
    // Badge-efekti tekee päivityksen vain silloin, kun ilmoitus oikeasti kuuluu näyttää.
  }, [storesReadyForSearch, searchReadySignatureV320]);
  const [visibleNormalCount, setVisibleNormalCount] = useState(8);
  const [activeNormalSearchTerm, setActiveNormalSearchTerm] = useState("");
  const [mobileResultsReadyQueryV537, setMobileResultsReadyQueryV537] = useState("");
  const [notFoundSearchTerms, setNotFoundSearchTerms] = useState<string[]>([]);
  const [eanModalOpen, setEanModalOpen] = useState(false);

  useEffect(() => {
    if (searchPanelOpen) return;

    setInput("");
    setActiveNormalSearchTerm("");
    setMobileResultsReadyQueryV537("");
    setNotFoundSearchTerms([]);
    setOfferSearchQuerySnapshot("");
    setOfferSearchDoneForQuery("");
    setNormalSearchAttempted(false);
  }, [searchPanelOpen]);


  function suppressHaeReadyBadgeV541(durationMs = 1800) {
    suppressHaeReadyBadgeUntilRefV541.current = Date.now() + durationMs;
    setHaeReadyBadgeTimerVisibleV520(false);
  }

  const haeReadyBadgeAllowedViewV520 =
    !searchPanelOpen &&
    !cartModalOpen &&
    !eanModalOpen &&
    activeResult === "none" &&
    activeAssistant === null &&
    !loadingNormal &&
    !loadingOffers &&
    !singleProductCompareLoading &&
    Date.now() >= suppressHaeReadyBadgeUntilRefV541.current;

  const haeReadyBadgeVisibleV502 =
    storesReadyForSearch &&
    haeReadyBadgeAllowedViewV520 &&
    haeReadyBadgeTimerVisibleV520;

  const haeReadyBadgeTextV502 = haeReadyBadgeVisibleV502 ? "Voit hakea" : "";

  useEffect(() => {
    if (!storesReadyForSearch || !haeReadyBadgeAllowedViewV520) {
      setHaeReadyBadgeTimerVisibleV520(false);
      return;
    }

    // V541: Badge näytetään vain, kun kauppavalmiuden allekirjoitus oikeasti muuttuu.
    // Pelkkä kortilta toiselle siirtyminen ei saa laukaista "Voit hakea" -ilmoitusta.
    if (previousSearchReadySignatureV320.current === searchReadySignatureV320) {
      return;
    }

    previousSearchReadySignatureV320.current = searchReadySignatureV320;
    setHaeReadyBadgeTimerVisibleV520(true);

    const timer = window.setTimeout(() => {
      setHaeReadyBadgeTimerVisibleV520(false);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [storesReadyForSearch, haeReadyBadgeAllowedViewV520, searchReadySignatureV320]);
  const [eanInput, setEanInput] = useState("");
  const [eanLoading, setEanLoading] = useState(false);
  const [eanResults, setEanResults] = useState<EanSearchResult[]>([]);
  const [eanMessage, setEanMessage] = useState("");
  const [eanCache, setEanCache] = useState<Record<string, string>>({});
  const [lastAutoEanSearch, setLastAutoEanSearch] = useState("");
  const [eanSearchStartedAutomatically, setEanSearchStartedAutomatically] =
    useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const voiceOpenSearchPanelAfterResultRef = useRef(false);
  const voiceSilenceTimeoutRef = useRef<number | null>(null);
  const voiceAutoSearchAfterStopRef = useRef(false);
  const voiceLatestCleanedInputRef = useRef("");
  const cartSectionRef = useRef<HTMLElement | null>(null);
  const comparisonSectionRef = useRef<HTMLElement | null>(null);
  const compareOverlayScrollRef = useRef<HTMLDivElement | null>(null);
  const cartOverlayScrollRef = useRef<HTMLDivElement | null>(null);
  const normalResultsSectionRef = useRef<HTMLElement | null>(null);
  const savingsSummaryRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLTextAreaElement | null>(null);
  const alternativesTimeoutsRef = useRef<Record<string, number>>({});
  const eanAutoSearchTimeoutRef = useRef<number | null>(null);
  const eanAutoSearchActiveRef = useRef(false);
  const eanInputRef = useRef<HTMLInputElement | null>(null);
  const eanResultsRef = useRef<HTMLDivElement | null>(null);
  const lastEanCartAddRef = useRef<{ key: string; at: number } | null>(null);
  const lastEanToastRef = useRef<{ message: string; at: number } | null>(null);
  const eanSearchInFlightRef = useRef<string | null>(null);
  const cartSaveTimeoutRef = useRef<number | null>(null);
  const cartHasLoadedRef = useRef(false);
  const shoppingChecksSaveTimeoutRef = useRef<number | null>(null);
  const shoppingChecksHaveLoadedRef = useRef(false);
  const priceHistorySaveTimeoutRef = useRef<number | null>(null);
  const priceHistoryBaselineRef = useRef<Record<string, PriceSnapshot>>({});
  const priceHistoryHasLoadedRef = useRef(false);
  const shoppingItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [checkedCartItems, setCheckedCartItems] = useState<
    Record<string, boolean>
  >({});
  const [priceHistoryBaseline, setPriceHistoryBaseline] = useState<
    Record<string, PriceSnapshot>
  >({});
  const [recentCartItems, setRecentCartItems] = useState<CartItem[]>([]);
  const [savedShoppingLists, setSavedShoppingLists] = useState<
    SavedShoppingList[]
  >([]);
  const [savedListName, setSavedListName] = useState("");
  const [lastSavingsToast, setLastSavingsToast] = useState<string | null>(null);
  const [lastCartToast, setLastCartToast] = useState<string | null>(null);

  const [qualityModesByCart, setQualityModesByCart] = useState<
    Record<string, QualityMode>
  >({});
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [sMatches, setSMatches] = useState<Record<string, Match>>({});
  const [kMatches, setKMatches] = useState<Record<string, Match>>({});
  const [expandedAlternatives, setExpandedAlternatives] = useState<
    Record<string, boolean>
  >({});
  const [alternativeResults, setAlternativeResults] = useState<
    Record<string, Product[]>
  >({});
  const [loadingAlternatives, setLoadingAlternatives] = useState<
    Record<string, boolean>
  >({});
  const [optimizingChains, setOptimizingChains] = useState<
    Record<string, boolean>
  >({});
  const [lastOptimizationSnapshot, setLastOptimizationSnapshot] =
    useState<OptimizationSnapshot | null>(null);

  const [selectedChains, setSelectedChains] = useState<
    Record<ChainResult["key"], boolean>
  >({
    s: true,
    k: true,
    lidl: false,
    tokmanni: false,
  });

  const [isOnline, setIsOnline] = useState(true);
  const [showLaunchScreen, setShowLaunchScreen] = useState(false);
  const [suppressUiForEanClose, setSuppressUiForEanClose] = useState(false);
  const [eanModalClosing, setEanModalClosing] = useState(false);
  const PANEL_FADE_MS = 260;
  const [closingPanels, setClosingPanels] = useState<Record<string, boolean>>(
    {},
  );
  const [eanScannerOpen, setEanScannerOpen] = useState(false);
  const [desktopKeyboardScannerOpen, setDesktopKeyboardScannerOpen] = useState(false);
  const [eanScannerMessage, setEanScannerMessage] = useState("");
  const [scannerTorchOn, setScannerTorchOn] = useState(false);
  const [eanManualInputOpen, setEanManualInputOpen] = useState(false);
  const [scanSuccessFlash, setScanSuccessFlash] = useState(false);
  const [scanMissFlash, setScanMissFlash] = useState(false);
  const eanHtml5ScannerRef = useRef<any | null>(null);
  const eanScannerStoppingRef = useRef(false);
  const lastScannerBeepEanRefV582 = useRef("");
  const lastScannerBeepAtRefV594 = useRef(0);

  function playScannerBarcodeFoundBeepV582(ean: string) {
    const normalized = normalizeEan(ean);
    if (!normalized) return;

    const now = Date.now();
    if (now - lastScannerBeepAtRefV594.current < 220) return;

    lastScannerBeepEanRefV582.current = normalized;
    lastScannerBeepAtRefV594.current = now;

    // V605: kovempi ja selkeämpi kauppaskannerimainen piip.
    // iPhonen kaiuttimella vanha haptics/helper jäi liian hiljaiseksi taustahälyssä.
    if (typeof window === "undefined") return;

    try {
      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;

      if (!AudioContextClass) {
        playScanSuccessFeedback();
        return;
      }

      const audioContext = new AudioContextClass();
      const nowAudio = audioContext.currentTime;

      const gain = audioContext.createGain();
      gain.gain.setValueAtTime(0.0001, nowAudio);
      gain.gain.exponentialRampToValueAtTime(0.26, nowAudio + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, nowAudio + 0.18);
      gain.connect(audioContext.destination);

      const oscA = audioContext.createOscillator();
      oscA.type = "square";
      oscA.frequency.setValueAtTime(1180, nowAudio);
      oscA.connect(gain);
      oscA.start(nowAudio);
      oscA.stop(nowAudio + 0.18);

      const oscB = audioContext.createOscillator();
      oscB.type = "triangle";
      oscB.frequency.setValueAtTime(2360, nowAudio);
      oscB.connect(gain);
      oscB.start(nowAudio);
      oscB.stop(nowAudio + 0.11);

      window.setTimeout(() => {
        void audioContext.close?.();
      }, 320);
    } catch {
      playScanSuccessFeedback();
    }
  }

  function playScannerErrorToneV593() {
    // Lyhyt matala "tööt" vain epäonnistuneelle EAN-haulle.
    // Ei käytetä valintaikkunan kautta lisäyksessä, jotta valinnasta ei tule uutta ääntä.
    if (typeof window === "undefined") return;

    try {
      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(145, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(105, audioContext.currentTime + 0.12);

      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.11, audioContext.currentTime + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.28);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);

      window.setTimeout(() => {
        void audioContext.close?.();
      }, 420);
    } catch {
      // Ääni ei saa koskaan kaataa skanneriflow'ta.
    }
  }

  const lastContinuousScanRef = useRef<{ code: string; at: number } | null>(
    null,
  );
  const scanSuccessFlashTimeoutRef = useRef<number | null>(null);
  const scanMissFlashTimeoutRef = useRef<number | null>(null);

  function resetPendingEanPickCardV606() {
    setEanResults([]);
    setEanMessage("");
    setEanScannerMessage("");
    setEanLoading(false);
    eanSearchInFlightRef.current = null;
    setLastAutoEanSearch("");
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;

    if (eanAutoSearchTimeoutRef.current) {
      window.clearTimeout(eanAutoSearchTimeoutRef.current);
      eanAutoSearchTimeoutRef.current = null;
    }
  }


  // =========================
  // MOBILE APP SHELL
  // =========================
  // PWA-käytössä sivu tuntuu enemmän omalta mobiilisovellukselta:
  // - kevyt app-header
  // - offline-banneri
  // - appimaisempi bottom nav
  // - lyhyt launch/splash overlay

  useEffect(() => {
    setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    // Launch/splash overlay disabled: keep initial reload/startup view visible immediately.
    setShowLaunchScreen(false);
  }, []);

  // V471_GPS_SINGLE_OWNER_BOOT:
  // Tämä oli aiemmin toinen avauksen GPS-polku: se laittoi UI:n pending-tilaan
  // erillään varsinaisesta useOwnLocation()-hausta ja jätti fallbackeille mahdollisuuden
  // käynnistää GPS uudestaan. Nyt status/timer hallitaan vain useOwnLocation()-funktion sisällä.
  useEffect(() => {
    return () => {
      if (gpsFailTimerRefV391.current) {
        window.clearTimeout(gpsFailTimerRefV391.current);
        gpsFailTimerRefV391.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // V469: ei automaattista tausta-GPS-watchia reloadin jälkeen.
    // GPS päivitetään vain, kun käyttäjä painaa GPS-nappia tai kun avauksen yksi
    // hallittu useOwnLocation()-haku ajetaan.
    if (!usingOwnLocation) {
      stopSilentGpsWatchV391();
    }
  }, [usingOwnLocation]);

  useEffect(() => {
    return () => stopSilentGpsWatchV391();
  }, []);

  useEffect(() => {
    return () => {
      if (scanSuccessFlashTimeoutRef.current) {
        window.clearTimeout(scanSuccessFlashTimeoutRef.current);
        scanSuccessFlashTimeoutRef.current = null;
      }

      if (scanMissFlashTimeoutRef.current) {
        window.clearTimeout(scanMissFlashTimeoutRef.current);
        scanMissFlashTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!eanModalOpen || typeof document === "undefined") return;

    const body = document.body;
    const scrollY = window.scrollY;
    const previousOverflow = body.style.overflow;
    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousWidth = body.style.width;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      body.style.overflow = previousOverflow;
      body.style.position = previousPosition;
      body.style.top = previousTop;
      body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [eanModalOpen]);

  useEffect(() => {
    const emptyStartViewOpen =
      !showLaunchScreen &&
      !searchPanelOpen &&
      !cartModalOpen &&
      !shopsPanelOpen &&
      !eanModalOpen &&
      activeResult === "none";

    const overlayOpen =
      showLaunchScreen ||
      emptyStartViewOpen ||
      searchPanelOpen ||
      cartModalOpen ||
      shopsPanelOpen ||
      activeResult === "compare" ||
      activeResult === "offers";

    if (!overlayOpen || openStorePicker || typeof document === "undefined") return;

    const body = document.body;
    const scrollY = window.scrollY;
    const previousOverflow = body.style.overflow;
    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousWidth = body.style.width;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      body.style.overflow = previousOverflow;
      body.style.position = previousPosition;
      body.style.top = previousTop;
      body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [
    showLaunchScreen,
    searchPanelOpen,
    cartModalOpen,
    shopsPanelOpen,
    eanModalOpen,
    activeResult,
    openStorePicker,
  ]);

  useEffect(() => {
    if (!eanModalOpen) stopEanCameraScanner();

    return () => {
      stopEanCameraScanner();
    };
  }, [eanModalOpen]);

  useEffect(() => {
    if (!eanModalOpen || eanResults.length <= 1) return;

    const timeout = window.setTimeout(() => {
      eanResultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [eanModalOpen, eanResults.length]);

  // =========================
  // DERIVED VIEW STATE
  // =========================
  // Raskaimmat listat ja summat pidetään useMemo-pohjaisina.
  // Tämä vähentää mobiilin turhia renderöintejä ilman että käyttölogiikka muuttuu.
  // Varsinainen komponenttijako kannattaa tehdä myöhemmin omiin tiedostoihin.

  const terms = useMemo(() => parseTerms(input), [input]);
  const currentSearchQueryKey = useMemo(() => terms.join(", ").trim() || input.trim(), [terms, input]);
  const gostaSearchDisabled = !currentSearchQueryKey || loadingOffers;
  const hasSearchInput = terms.length > 0;

  useEffect(() => {
    if (!hasSearchInput) return;
    const frame = window.requestAnimationFrame(() => {
      const inputElement = searchInputRef.current;
      if (!inputElement) return;
      const cursor = inputElement.value.length;
      inputElement.focus();
      try {
        inputElement.setSelectionRange(cursor, cursor);
      } catch {}
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasSearchInput]);

  useEffect(() => {
    if (!hasSearchInput) return;
    const frame = window.requestAnimationFrame(() => {
      const inputElement = searchInputRef.current;
      if (!inputElement) return;
      const selectionEnd = inputElement.value.length;
      inputElement.focus();
      try {
        inputElement.setSelectionRange(selectionEnd, selectionEnd);
      } catch {}
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasSearchInput]);

  function getSingleSearchTerm(
    value: string,
    options: { preserveTypingSpace?: boolean } = {},
  ) {
    // v260:
    // Yksi tuote -tilassa sallitaan yksi moniosainen tuote, myös desimaalipilkulla:
    // "Coca Cola zero 1,5L". iOS/Safari antaa välivaiheen "1," ennen seuraavaa
    // numeroa, joten myös numeron jälkeinen keskeneräinen pilkku pitää suojata.
    // Rivinvaihto katkaisee aina ylimääräiset tuotteet pois. Listapilkku katkaisee
    // vain silloin, kun se ei ole numerokoon/desimaalin osa.
    const decimalCommaPlaceholder = "__ZIIPLY_DECIMAL_COMMA__";
    const rawFirstLine = fixText(String(value || "")).split(/[\n]+/)[0] || "";
    const protectedDecimalCommas = rawFirstLine.replace(
      /(\d)\s*,\s*(?=\d|$)/g,
      `$1${decimalCommaPlaceholder}`,
    );
    const rawFirstTerm = protectedDecimalCommas.split(/,+/)[0] || "";

    const restored = rawFirstTerm
      .replaceAll(decimalCommaPlaceholder, ",")
      .replace(/\s+/g, " ")
      .slice(0, 180);

    if (options.preserveTypingSpace) {
      return restored.replace(/^\s+/, "");
    }

    return restored.trim();
  }

  function setSearchInputForMode(value: string) {
    if (searchCompareMode === "single") {
      setInput(getSingleSearchTerm(value, { preserveTypingSpace: true }));
      return;
    }

    setInput(value);
  }

  function clearSingleSearchState() {
    setInput("");
    setNormalResults([]);
    setNormalSearchAttempted(false);
    setVisibleNormalCount(8);
    setActiveNormalSearchTerm("");
    setSingleProductCompareResults([]);
    setSingleProductCompareTerm("");
    setSingleProductCompareLoading(false);
  }

  function getCompactSuggestionLabel(label: string) {
    const clean = fixText(label).replace(/\s+/g, " ").trim();
    const text = normalize(clean);

    if (hasAnyToken(text, ["coca-cola", "coca cola", "cola", "pepsi"])) {
      const size = clean.match(/\b\d+(?:[,\.]\d+)?\s?(?:l|ml)\b/i)?.[0] || "";
      const isZero = hasAnyToken(text, ["zero", "max"]);
      const brand = hasAnyToken(text, ["pepsi"])
        ? "pepsi"
        : hasAnyToken(text, ["coca-cola", "coca cola"])
          ? "coca cola"
          : "cola";
      return [brand, isZero ? (brand === "pepsi" ? "max" : "zero") : "", size]
        .filter(Boolean)
        .join(" ");
    }

    if (hasAnyToken(text, ["kananmuna", "kananmunat", "kananmunia", "munat"]))
      return "kananmuna";

    if (hasAnyToken(text, ["broilerin jauheliha", "kanan jauheliha"]))
      return "broilerin jauheliha";
    if (hasAnyToken(text, ["naudan jauheliha"])) return "naudan jauheliha";
    if (hasAnyToken(text, ["sika-nauta jauheliha", "sikanauta jauheliha"]))
      return "sika-nauta jauheliha";
    if (hasAnyToken(text, ["jauheliha"])) return "jauheliha";

    return clean.length > 42 ? clean.slice(0, 42).trim() : clean;
  }

  const searchSuggestionSeed = useMemo(() => {
    const splitTerms = splitProductTermsPreservingDecimalCommas(input);
    const currentText = splitTerms[splitTerms.length - 1] || input.trim();
    return currentText;
  }, [input]);

  const instantSearchSuggestions = useMemo(() => {
    const query = normalize(searchSuggestionSeed);
    if (query.length < 2) return [];

    const candidates = new Map<
      string,
      { label: string; hint: string; score: number }
    >();

    const addCandidate = (label: string, hint: string, score: number) => {
      const cleanLabel = fixText(label).replace(/\s+/g, " ").trim();
      const key = normalize(cleanLabel);
      if (!key || key.length < 2) return;
      if (
        !key.includes(query) &&
        !key.startsWith(query) &&
        !query.includes(key)
      )
        return;

      const existing = candidates.get(key);
      if (!existing || existing.score < score)
        candidates.set(key, { label: cleanLabel, hint, score });
    };

    for (const item of cart)
      addCandidate(getCompactSuggestionLabel(item.name), "Korista", 115);
    for (const item of recentCartItems)
      addCandidate(
        getCompactSuggestionLabel(item.name),
        "Viimeksi lisätty",
        105,
      );

    for (const intent of SEARCH_INTENTS) {
      const intentMatchesQuery =
        normalize(intent.label).includes(query) ||
        intent.variants.some((variant) => normalize(variant).includes(query));
      for (const variant of intent.variants)
        addCandidate(variant, intent.label, intentMatchesQuery ? 92 : 78);
    }

    Object.values(SEARCH_ALIASES).forEach((alias) =>
      addCandidate(alias, "Nopea haku", 70),
    );

    return Array.from(candidates.values())
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "fi"))
      .slice(0, 5);
  }, [cart, recentCartItems, searchSuggestionSeed]);

  function applyInstantSearchSuggestion(label: string) {
    const cleanLabel = fixText(label).replace(/\s+/g, " ").trim();
    if (!cleanLabel) return;

    // v244:
    // Yksi tuote -tilassa smart suggestion on aina yksi kokonainen hakutermi.
    // Esim. "coca cola zero" ei saa hajota sanoiksi eikä jäädä vanhan pilkkujonon perään.
    if (searchCompareMode === "single") {
      setInput(getSingleSearchTerm(cleanLabel));
      setVisibleNormalCount(8);
      triggerHaptic();
      window.requestAnimationFrame(() => searchInputRef.current?.focus());
      return;
    }

    const parts = input.split(/([\n,]+)/);
    let replaced = false;

    for (let index = parts.length - 1; index >= 0; index -= 1) {
      if (!/[\n,]+/.test(parts[index]) && parts[index].trim().length > 0) {
        const leadingSpace = parts[index].match(/^\s*/)?.[0] || "";
        parts[index] = `${leadingSpace}${cleanLabel}`;
        replaced = true;
        break;
      }
    }

    const nextInput = replaced ? parts.join("") : cleanLabel;
    setInput(nextInput);
    setVisibleNormalCount(8);
    triggerHaptic();

    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }

  const activeStores = useMemo(() => {
    if (storeCompareScope !== "within_chain" && !storeModeChosenV299) {
      return {
        sStoreId: 0,
        sStoreName: "Valitse ensin Tavaratalot tai Lähikaupat",
        kStoreId: 0,
        kStoreName: "Valitse ensin Tavaratalot tai Lähikaupat",
      };
    }

    if (storeMode === "local") {
      return {
        sStoreId: activeArea.sLocalStoreId ?? 0,
        sStoreName: activeArea.sLocalStoreName ?? "S-lähikauppa ei valittu",
        kStoreId: activeArea.kLocalStoreId ?? 0,
        kStoreName: activeArea.kLocalStoreName ?? "K-lähikauppa ei valittu",
      };
    }

    return {
      sStoreId: activeArea.sStoreId ?? 0,
      sStoreName: activeArea.sStoreName ?? "S-tavaratalo ei valittu",
      kStoreId: activeArea.kStoreId ?? 0,
      kStoreName: activeArea.kStoreName ?? "K-tavaratalo ei valittu",
    };
  }, [activeArea, storeMode, storeModeChosenV299, storeCompareScope]);

  const hasActiveStores =
    activeStores.sStoreId > 0 && activeStores.kStoreId > 0;

  const selectedMapStoresV433 = useMemo(() => {
    const selected = [
      {
        key: "s",
        name: activeStores.sStoreName,
        chain: "S",
        id: activeStores.sStoreId,
      },
      {
        key: "k",
        name: activeStores.kStoreName,
        chain: "K",
        id: activeStores.kStoreId,
      },
    ].filter(
      (store) =>
        store.name &&
        !store.name.includes("Valitse ensin") &&
        !store.name.includes("ei valittu"),
    );

    const normalizedFound = foundStores.map((store: any, index: number) => {
      const latitude = Number(
        store.latitude ??
          store.lat ??
          store.location?.lat ??
          store.coordinates?.latitude,
      );
      const longitude = Number(
        store.longitude ??
          store.lng ??
          store.lon ??
          store.location?.lng ??
          store.location?.lon ??
          store.coordinates?.longitude,
      );

      return {
        key: String(store.id ?? store.storeId ?? store.name ?? index),
        id: store.id ?? store.storeId ?? index,
        name: String(store.name ?? store.storeName ?? `Kauppa ${index + 1}`),
        address: String(store.address ?? store.streetAddress ?? ""),
        city: String(store.city ?? activeArea.label ?? "Suomi"),
        latitude: Number.isFinite(latitude) ? latitude : null,
        longitude: Number.isFinite(longitude) ? longitude : null,
      };
    });

    const withCoords = selected.map((store) => {
      const targetName = normalize(String(store.name || ""));
      const match = normalizedFound.find((candidate) => {
        const candidateName = normalize(String(candidate.name || ""));
        return (
          String(candidate.id || "") === String(store.id || "") ||
          (targetName &&
            candidateName &&
            (candidateName.includes(targetName) ||
              targetName.includes(candidateName)))
        );
      });

      return {
        ...store,
        address: match?.address || "",
        city: match?.city || activeArea.label || "Suomi",
        latitude: match?.latitude ?? null,
        longitude: match?.longitude ?? null,
      };
    });

    return withCoords.length > 0 ? withCoords : normalizedFound.slice(0, 2);
  }, [
    activeStores.sStoreId,
    activeStores.sStoreName,
    activeStores.kStoreId,
    activeStores.kStoreName,
    foundStores,
    activeArea.label,
  ]);

  function getMapStoreQueryV433(store?: {
    name?: string;
    address?: string;
    city?: string;
    latitude?: number | null;
    longitude?: number | null;
  }) {
    if (store?.latitude != null && store?.longitude != null) {
      return `${store.latitude},${store.longitude}`;
    }

    return [store?.name, store?.address, store?.city, "Suomi"]
      .filter(Boolean)
      .join(", ");
  }

  function getMapRouteUrlV433(store?: {
    name?: string;
    address?: string;
    city?: string;
    latitude?: number | null;
    longitude?: number | null;
  }) {
    const destination = encodeURIComponent(getMapStoreQueryV433(store));
    const origin =
      gpsCoordsV320?.latitude != null && gpsCoordsV320?.longitude != null
        ? encodeURIComponent(`${gpsCoordsV320.latitude},${gpsCoordsV320.longitude}`)
        : "";

    return origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${destination}`;
  }

  const mapStoresQueryV433 =
    selectedMapStoresV433.length > 1
      ? selectedMapStoresV433
          .map((store) => [store.name, store.city].filter(Boolean).join(", "))
          .join(" | ")
      : getMapStoreQueryV433(selectedMapStoresV433[0]) ||
        `${activeArea.label || "Hyvinkää"}, Suomi`;

  const mapStoresIframeSrcV433 = `https://maps.google.com/maps?q=${encodeURIComponent(mapStoresQueryV433)}&z=13&output=embed`;


  const storePairMissingNoticeVisibleV427 =
    storeModeChosenV299 &&
    storeCompareScope === "between_chains" &&
    (
      (storeMode === "hyper" && (!activeArea.sStoreId || !activeArea.kStoreId)) ||
      (storeMode === "local" && (!activeArea.sLocalStoreId || !activeArea.kLocalStoreId))
    );
  const hyperStorePairMissingV391 =
    storeMode === "hyper" &&
    storeModeChosenV299 &&
    storeCompareScope === "between_chains" &&
    (!activeArea.sStoreId || !activeArea.kStoreId);

  useEffect(() => {
    if (!hyperStorePairMissingV391) return;

    setLocationMessage("");
    setLocationMessageVisible(true);
  }, [hyperStorePairMissingV391]);

    useEffect(() => {
    if (!hyperStorePairMissingV391) return;

    setLocationMessage("Alueelta ei löytynyt kahta vertailtavaa tavarataloa. Kokeile lähikauppoja.");
    setLocationMessageVisible(true);
  }, [hyperStorePairMissingV391]);

  // V452_INLINE_HAKUTAPA_NOTICE_EFFECT:
  // Näyttää ilmoituksen kerran suoraan Hakutapa-tekstin kohdalla.
  useEffect(() => {
    const selectedChainCount =
      Number(Boolean(selectedChains.s)) + Number(Boolean(selectedChains.k));

    const shouldShow =
      hyperStorePairMissingV391 ||
      (storeCompareScope === "between_chains" && selectedChainCount < 2) ||
      (storeCompareScope === "within_chain" && !withinChain);

    if (!shouldShow) {
      setInlineHakutapaNoticeVisibleV452(false);
      return;
    }

    setInlineHakutapaNoticeVisibleV452(true);
    const timer = window.setTimeout(() => {
      setInlineHakutapaNoticeVisibleV452(false);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [
    hyperStorePairMissingV391,
    storeCompareScope,
    selectedChains.s,
    selectedChains.k,
    withinChain,
  ]);

  function shouldUseLocalFallback(chain: "S" | "K") {
    if (storeMode !== "local") return false;

    if (chain === "S") {
      return (
        Boolean(activeArea.sStoreId) &&
        activeStores.sStoreId !== activeArea.sStoreId
      );
    }

    return (
      Boolean(activeArea.kStoreId) &&
      activeStores.kStoreId !== activeArea.kStoreId
    );
  }

  function normalizeSProduct(raw: any): Product | null {
    const idValue =
      raw?.id ??
      raw?.item?.id ??
      raw?.productId ??
      raw?.ean ??
      `${raw?.name || "s-product"}-${Math.random()}`;
    const price =
      raw?.price ??
      raw?.storeItems?.[0]?.price ??
      raw?.storeItem?.price ??
      raw?.pricing?.price ??
      raw?.currentPrice ??
      0;

    const name = fixText(
      String(raw?.name ?? raw?.item?.name ?? raw?.productName ?? ""),
    );
    if (!name) return null;

    return {
      id:
        Number(String(idValue).replace(/\D/g, "").slice(0, 9)) ||
        Math.abs(
          String(idValue)
            .split("")
            .reduce((sum, char) => sum + char.charCodeAt(0), 0),
        ),
      name,
      ean: raw?.ean ?? raw?.item?.ean ?? raw?.gtin ?? raw?.barcode ?? "",
      brandName: raw?.brandName ?? raw?.brand ?? raw?.item?.brandName ?? "",
      pictureUrl:
        raw?.pictureUrl ?? raw?.imageUrl ?? raw?.item?.pictureUrl ?? "",
      category: raw?.category ?? raw?.item?.category ?? "",
      price,
      comparisonPrice:
        raw?.comparisonPrice ??
        raw?.storeItems?.[0]?.comparisonPrice ??
        raw?.storeItem?.comparisonPrice,
      comparisonPriceUnit:
        raw?.comparisonPriceUnit ??
        raw?.storeItems?.[0]?.comparisonPriceUnit ??
        raw?.storeItem?.comparisonPriceUnit,
      storeItems: [{ price }],
    };
  }

  async function fetchSProducts(
    search: string,
    storeId: number,
  ): Promise<Product[]> {
    const response = await fetch(
      `/api/s-products?search=${encodeURIComponent(search)}&store=${encodeURIComponent(String(storeId))}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      console.error("S-products route failed", response.status);
      return [];
    }

    const data = await response.json();

    const rawItems = Array.isArray(data?.products)
      ? data.products
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];

    return rawItems
      .map((item: any) => normalizeSProduct(item))
      .filter((item: Product | null): item is Product =>
        Boolean(item && item.name && getProductPrice(item) > 0),
      );
  }

  async function fetchKProducts(
    search: string,
    storeId: number,
  ): Promise<KProduct[]> {
    const response = await fetch(
      `/api/k-products?search=${encodeURIComponent(search)}&store=${encodeURIComponent(String(storeId))}`,
      { cache: "no-store" },
    );
    const data = await response.json();
    return (data.items || []) as KProduct[];
  }

  async function fetchOpenFoodFactsNames(ean: string) {
    const normalizedEan = normalizeEan(ean);
    if (!isUsableEan(normalizedEan)) return [];

    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalizedEan)}.json?fields=product_name,product_name_fi,generic_name,generic_name_fi,brands,code`,
      { cache: "no-store" },
    );

    if (!response.ok) return [];

    const data = await response.json();

    if (data?.status !== 1 || !data?.product) return [];

    return getOpenFoodFactsNames(data.product);
  }

  function showCartToast(message: string) {
    const now = Date.now();

    // Sama ilmoitus saa näkyä vain kerran lyhyessä ajassa. Tämä pitää EAN-flow'n rauhallisena,
    // vaikka automaattihaku tai tuplaklikkaus ehtisi yrittää näyttää saman toastin uudelleen.
    if (
      lastEanToastRef.current?.message === message &&
      now - lastEanToastRef.current.at < 2500
    ) {
      return;
    }

    lastEanToastRef.current = { message, at: now };
    setLastCartToast(message);

    // UI debounce / anti-duplicate protection
    window.setTimeout(() => {
      setLastCartToast((current) => (current === message ? null : current));
    }, 2600);
  }

  function showScanSuccessFlash() {
    setScanMissFlash(false);
    setScanSuccessFlash(true);

    if (scanSuccessFlashTimeoutRef.current) {
      window.clearTimeout(scanSuccessFlashTimeoutRef.current);
    }

    scanSuccessFlashTimeoutRef.current = window.setTimeout(() => {
      setScanSuccessFlash(false);
      scanSuccessFlashTimeoutRef.current = null;
    }, 700);
  }

  function showScanMissFlash() {
    playScannerErrorToneV593();
    setScanSuccessFlash(false);
    setScanMissFlash(true);

    if (scanMissFlashTimeoutRef.current) {
      window.clearTimeout(scanMissFlashTimeoutRef.current);
    }

    scanMissFlashTimeoutRef.current = window.setTimeout(() => {
      setScanMissFlash(false);
      scanMissFlashTimeoutRef.current = null;
    }, 700);
  }

  // =========================
  // LOCAL STORAGE PERSISTENCE
  // =========================
  // Tallennetaan:
  // - ostoskori
  // - keräilyrastit
  // - hintahistoria
  // - viimeisimmät tuotteet
  // - tallennetut listat
  //
  // Kaikki persistence tehdään debounce-viiveellä,
  // jotta mobile Safari ei kuormitu liikaa.
  // =========================

  function getCartItemMemoryKey(item: CartItem) {
    const ean = normalizeEan(item.ean || item.product?.ean);
    if (ean) return `ean:${ean}`;
    return `name:${normalize(item.name)}`;
  }

  function sanitizeCartItemForStorage(item: CartItem): CartItem {
    return {
      id: item.id,
      name: fixText(item.name),
      price: item.price,
      image: item.image,
      chain: item.chain,
      storeName: item.storeName,
      quantity: Math.max(1, item.quantity || 1),
      source: item.source,
      product: item.product,
      ean: item.ean,
    };
  }

  function rememberRecentCartItems(items: CartItem[]) {
    const validItems = items
      .filter((item) => item.name?.trim())
      .map(sanitizeCartItemForStorage);

    if (validItems.length === 0) return;

    setRecentCartItems((current) => {
      const next = [...validItems.reverse(), ...current];
      const seen = new Set<string>();
      const unique = next
        .filter((item) => {
          const key = getCartItemMemoryKey(item);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, MAX_RECENT_CART_ITEMS);

      try {
        window.localStorage.setItem(
          RECENT_CART_ITEMS_STORAGE_KEY,
          JSON.stringify({ version: 1, savedAt: Date.now(), items: unique }),
        );
      } catch {}

      return unique;
    });
  }

  function mergeItemsIntoCart(baseCart: CartItem[], itemsToAdd: CartItem[]) {
    const nextCart = [...baseCart];

    for (const sourceItem of itemsToAdd) {
      const item = sanitizeCartItemForStorage(sourceItem);
      const key = getCartItemMemoryKey(item);
      const existingIndex = nextCart.findIndex(
        (cartItem) => getCartItemMemoryKey(cartItem) === key,
      );

      if (existingIndex >= 0) {
        nextCart[existingIndex] = {
          ...nextCart[existingIndex],
          quantity:
            Math.max(1, nextCart[existingIndex].quantity || 1) +
            Math.max(1, item.quantity || 1),
        };
        continue;
      }

      if (nextCart.length >= MAX_ITEMS) break;

      nextCart.push({
        ...item,
        id: `saved-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });
    }

    return nextCart.slice(0, MAX_ITEMS);
  }

  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem("ziiply-cart-v1");
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        const restoredItems = Array.isArray(parsed)
          ? parsed.slice(0, MAX_ITEMS)
          : Array.isArray(parsed?.items)
            ? parsed.items.slice(0, MAX_ITEMS)
            : [];

        if (restoredItems.length > 0) {
          setCart(restoredItems);

          // v343_RESTORE_STORE_SELECTION_WITH_CART:
          // Kun ostoskori palautetaan reloadin jälkeen, kauppa- ja vertailuvalintoja ei saa nollata.
          // Palautetaan viimeisin valinta vain tässä tilanteessa.
          try {
            const savedStoreSelection = window.localStorage.getItem(
              STORE_SELECTION_STORAGE_KEY_V343,
            );
            const parsedStoreSelection = savedStoreSelection
              ? JSON.parse(savedStoreSelection)
              : null;

            if (
              parsedStoreSelection &&
              typeof parsedStoreSelection === "object"
            ) {
              if (parsedStoreSelection.activeArea) {
                setActiveArea(parsedStoreSelection.activeArea as Area);
              }

              if (
                parsedStoreSelection.storeMode === "hyper" ||
                parsedStoreSelection.storeMode === "local"
              ) {
                selectedStoreModeRefV302.current =
                  parsedStoreSelection.storeMode as StoreMode;
                setStoreMode(parsedStoreSelection.storeMode as StoreMode);
              }

              setStoreModeChosenV299(
                Boolean(parsedStoreSelection.storeModeChosenV299),
              );

              if (
                parsedStoreSelection.storeCompareScope === "none" ||
                parsedStoreSelection.storeCompareScope === "between_chains" ||
                parsedStoreSelection.storeCompareScope === "within_chain"
              ) {
                setStoreCompareScope(
                  parsedStoreSelection.storeCompareScope as StoreCompareScope,
                );
              }

              if (
                parsedStoreSelection.withinChain === "S" ||
                parsedStoreSelection.withinChain === "K"
              ) {
                setWithinChain(parsedStoreSelection.withinChain);
              } else {
                setWithinChain(null);
              }
            }
          } catch {
            // Ignore broken saved store selection data.
          }

          setRestoredCartPromptV320({
            open: true,
            count: restoredItems.length,
            savedAt:
              typeof parsed?.savedAt === "number" ? parsed.savedAt : undefined,
          });
        }
      }
    } catch {
      // Ignore broken saved cart data.
    } finally {
      cartHasLoadedRef.current = true;
      storeSelectionHydratedRefV343.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!storeSelectionHydratedRefV343.current) return;

    // Ensimmäinen renderöinti reloadin jälkeen voi vielä sisältää oletusarvot.
    // Odotetaan yksi state-kierros, jotta palautettu kauppavalinta ei ylikirjoitu tyhjällä.
    if (!storeSelectionPersistenceReadyRefV343.current) {
      storeSelectionPersistenceReadyRefV343.current = true;
      return;
    }

    try {
      window.localStorage.setItem(
        STORE_SELECTION_STORAGE_KEY_V343,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          activeArea,
          storeMode,
          storeModeChosenV299,
          storeCompareScope,
          withinChain,
        }),
      );
    } catch {
      // Ignore storage errors.
    }
  }, [
    activeArea,
    storeMode,
    storeModeChosenV299,
    storeCompareScope,
    withinChain,
  ]);

  function persistCartImmediately(nextCart: CartItem[]) {
    try {
      window.localStorage.setItem(
        "ziiply-cart-v1",
        JSON.stringify({
          version: 2,
          savedAt: Date.now(),
          items: nextCart.slice(0, MAX_ITEMS),
        }),
      );
    } catch {
      // Ignore storage errors in private browsing.
    }
  }

  useEffect(() => {
    if (!cartHasLoadedRef.current) return;

    if (cartSaveTimeoutRef.current) {
      window.clearTimeout(cartSaveTimeoutRef.current);
    }

    // UI debounce / anti-duplicate protection
    cartSaveTimeoutRef.current = window.setTimeout(() => {
      persistCartImmediately(cart);
    }, 250);

    return () => {
      if (cartSaveTimeoutRef.current) {
        window.clearTimeout(cartSaveTimeoutRef.current);
        cartSaveTimeoutRef.current = null;
      }
    };
  }, [cart]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(RECENT_CART_ITEMS_STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      const items = Array.isArray(parsed) ? parsed : parsed?.items;

      if (Array.isArray(items)) {
        setRecentCartItems(
          items.map(sanitizeCartItemForStorage).slice(0, MAX_RECENT_CART_ITEMS),
        );
      }
    } catch {
      // Ignore broken recent-item data.
    }
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(
        SAVED_SHOPPING_LISTS_STORAGE_KEY,
      );
      if (!saved) return;

      const parsed = JSON.parse(saved);
      const lists = Array.isArray(parsed) ? parsed : parsed?.lists;

      if (Array.isArray(lists)) {
        setSavedShoppingLists(
          lists
            .filter((list) => list?.name && Array.isArray(list.items))
            .map((list) => ({
              id: String(
                list.id ||
                  `list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              ),
              name: String(list.name),
              items: list.items
                .map(sanitizeCartItemForStorage)
                .slice(0, MAX_ITEMS),
              createdAt: Number(list.createdAt || Date.now()),
              updatedAt: Number(list.updatedAt || Date.now()),
            }))
            .slice(0, MAX_SAVED_SHOPPING_LISTS),
        );
      }
    } catch {
      // Ignore broken saved-list data.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SAVED_SHOPPING_LISTS_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          lists: savedShoppingLists,
        }),
      );
    } catch {
      // Ignore storage errors in private browsing.
    }
  }, [savedShoppingLists]);

  useEffect(() => {
    if (!cartHasLoadedRef.current || cart.length === 0) return;
    rememberRecentCartItems(cart);
  }, [cart]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PRICE_HISTORY_STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      const items =
        parsed?.items && typeof parsed.items === "object"
          ? parsed.items
          : parsed;

      if (items && typeof items === "object") {
        priceHistoryBaselineRef.current = items;
        setPriceHistoryBaseline(items);
      }
    } catch {
      // Ignore broken price history data.
    } finally {
      priceHistoryHasLoadedRef.current = true;
    }
  }, []);

  function getPriceHistorySnapshot(key: string) {
    return priceHistoryBaseline[key] || priceHistoryBaselineRef.current[key];
  }

  function renderPriceHistoryBadge(key: string, currentPrice?: number | null) {
    const snapshot = getPriceHistorySnapshot(key);
    const info = getPriceChangeInfo(snapshot?.price, currentPrice || 0);

    if (!info) {
      return (
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#8a7349]">
          uusi hinta
        </span>
      );
    }

    const className =
      info.tone === "down"
        ? "bg-emerald-100 text-emerald-700"
        : info.tone === "up"
          ? "bg-amber-100 text-amber-700"
          : "bg-slate-100 text-[#8a7349]";

    return (
      <span
        title={`Viimeksi nähty ${formatEuro(info.previousPrice)}`}
        className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${className}`}
      >
        {info.shortLabel}
      </span>
    );
  }

  useEffect(() => {
    if (!priceHistoryHasLoadedRef.current) return;

    if (priceHistorySaveTimeoutRef.current) {
      window.clearTimeout(priceHistorySaveTimeoutRef.current);
    }

    // UI debounce / anti-duplicate protection
    priceHistorySaveTimeoutRef.current = window.setTimeout(() => {
      try {
        const next: Record<string, PriceSnapshot> = {
          ...priceHistoryBaselineRef.current,
        };
        const remember = (
          key: string,
          price: number,
          name: string,
          storeName?: string,
          chain?: string,
        ) => {
          if (!key || !price || price <= 0) return;

          next[key] = {
            price,
            name: fixText(name),
            storeName,
            chain,
            updatedAt: Date.now(),
          };
        };

        for (const item of cart) {
          if (item.price)
            remember(
              getPriceHistoryKeyFromCartItem(item),
              item.price,
              item.name,
              item.storeName,
              item.chain,
            );
        }

        for (const product of normalResults) {
          const storeName =
            (product as Product & { fallbackStoreName?: string })
              .fallbackStoreName || activeStores.sStoreName;
          remember(
            getPriceHistoryKeyFromProduct(product, storeName),
            getProductPrice(product),
            product.name,
            storeName,
          );
        }

        for (const item of offers) {
          const product = offerToProduct(item);
          remember(
            getPriceHistoryKeyFromProduct(product, item.storeName, item.chain),
            getProductPrice(product),
            product.name,
            item.storeName,
            item.chain,
          );
        }

        for (const result of eanResults) {
          remember(
            getPriceHistoryKeyFromProduct(
              result.product,
              result.storeName,
              result.chain,
            ),
            getProductPrice(result.product),
            result.product.name,
            result.storeName,
            result.chain,
          );
        }

        window.localStorage.setItem(
          PRICE_HISTORY_STORAGE_KEY,
          JSON.stringify({
            version: 1,
            savedAt: Date.now(),
            items: next,
          }),
        );
      } catch {
        // Ignore storage errors in private browsing.
      }
    }, 500);

    return () => {
      if (priceHistorySaveTimeoutRef.current) {
        window.clearTimeout(priceHistorySaveTimeoutRef.current);
        priceHistorySaveTimeoutRef.current = null;
      }
    };
  }, [cart, normalResults, offers, eanResults, activeStores.sStoreName]);

  useEffect(() => {
    if (eanScannerOpen) return;

    setEanResults([]);
    setEanMessage("");
    setEanScannerMessage("");
    eanSearchInFlightRef.current = null;
    setLastAutoEanSearch("");
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;
  }, [eanScannerOpen]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("ziiply-ean-cache-v1");
      if (!saved) return;

      const parsed = JSON.parse(saved);

      if (parsed && typeof parsed === "object") {
        setEanCache(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "ziiply-ean-cache-v1",
        JSON.stringify(eanCache),
      );
    } catch {}
  }, [eanCache]);

  useEffect(() => {
    // v305: Älä palauta vanhoja kauppavalintoja refreshin jälkeen.
    // Tämä estää tilanteen, jossa selain avaa suoraan vanhan Lähikaupat/Tavaratalot-tilan.
    try {
      window.localStorage.removeItem("ziiply-default-stores-v2");
    } catch {
      // Ignore storage errors in private browsing.
    }
  }, []);

  useEffect(() => {
    // v305: ei tallenneta kauppatyyppiä/kauppavalintoja pysyvästi.
    // Refreshin pitää palata tyhjään hakutapaan.
  }, [activeArea, storeMode, locationInput]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    setSpeechSupported(true);

    const recognition = new SpeechRecognition();

    recognition.lang = "fi-FI";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);

      if (voiceSilenceTimeoutRef.current) {
        window.clearTimeout(voiceSilenceTimeoutRef.current);
        voiceSilenceTimeoutRef.current = null;
      }

      if (voiceAutoSearchAfterStopRef.current) {
        voiceAutoSearchAfterStopRef.current = false;
        const cleaned = voiceLatestCleanedInputRef.current.trim();
        if (cleaned) {
          const searchTerm = searchCompareMode === "single" ? getSingleSearchTerm(cleaned) : cleaned;
          setSearchPanelOpen(false);
          window.setTimeout(() => {
            if (searchCompareMode === "single") {
              setInput(searchTerm);
              void searchNormalPrices(searchTerm);
            } else {
              void searchNormalPrices(cleaned);
            }
            scrollToNormalResults();
          }, 80);
        }
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      if (voiceSilenceTimeoutRef.current) {
        window.clearTimeout(voiceSilenceTimeoutRef.current);
        voiceSilenceTimeoutRef.current = null;
      }
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript || "")
        .join(" ");

      const cleaned = transcript
        .toLowerCase()
        .replace(/\s+ja\s+/gi, ",")
        .replace(/\s+/g, ",")
        .replace(/,+/g, ",")
        .replace(/^,|,$/g, "")
        .trim();

      voiceLatestCleanedInputRef.current = cleaned;
      setInput(cleaned);

      if (voiceOpenSearchPanelAfterResultRef.current) {
        voiceOpenSearchPanelAfterResultRef.current = false;
        setSearchPanelOpen(true);

        window.setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }

      if (voiceSilenceTimeoutRef.current) {
        window.clearTimeout(voiceSilenceTimeoutRef.current);
      }

      voiceSilenceTimeoutRef.current = window.setTimeout(() => {
        voiceAutoSearchAfterStopRef.current = true;
        try {
          recognitionRef.current?.stop?.();
        } catch {
          setIsListening(false);
        }
      }, 2500);
    };

    recognitionRef.current = recognition;
  }, [cart]);

  const closeFloatingPanels = useCallback(() => {
    setSearchPanelOpen(false);
    setCartModalOpen(false);
    setEanModalOpen(false);
  }, []);

  function markPanelClosing(panelKey: string) {
    setClosingPanels((current) => ({ ...current, [panelKey]: true }));
    window.setTimeout(() => {
      setClosingPanels((current) => {
        const next = { ...current };
        delete next[panelKey];
        return next;
      });
    }, PANEL_FADE_MS + 40);
  }

  function getOpenMobilePanelKey() {
    if (shopsPanelOpen) return "shops";
    if (searchPanelOpen) return "search";
    if (cartModalOpen) return "cart";
    if (eanModalOpen) return "ean";
    if (activeResult === "compare") return "compare";
    if (activeResult === "offers") return "offers";
    if (activeResult === "singleCompare") return "singleCompare";
    return "none";
  }

  function transitionMobilePanel(
    nextPanel:
      | "none"
      | "shops"
      | "search"
      | "cart"
      | "compare"
      | "offers"
      | "singleCompare",
    applyNext: () => void,
  ) {
    const currentPanel = getOpenMobilePanelKey();
    if (currentPanel !== "none" && currentPanel !== nextPanel) {
      markPanelClosing(currentPanel);
      window.setTimeout(applyNext, PANEL_FADE_MS);
      return;
    }
    applyNext();
  }

  function closePanelWithFade(panelKey: string, applyClose: () => void) {
    markPanelClosing(panelKey);
    window.setTimeout(applyClose, PANEL_FADE_MS);
  }

  function openSearchPanel() {
    if (searchNavigationLocked) return;

    // v342_RESTORE_CART_SEARCH_NAV_FIX:
    // Reloadin jälkeen ostoskori voi olla palautettu, vaikka kauppavalintoja ei ole vielä tehty.
    // Hae-napin pitää silloin avata Hae-paneeli normaalisti eikä ohjata Kaupat-paneeliin.
    // Kaupat-paneeliin ohjataan vain täysin tyhjässä aloitustilassa, kun ei ole kauppavalintoja eikä korissa tuotteita.
    // V475: Hae-nappi ei saa enää ohjata Kaupat-paneeliin eikä sitä kautta koskea GPS-tilaan.
    // Jos kaupat eivät ole vielä valmiit, avataan silti Hae-paneeli; itse haku näyttää tarvittaessa
    // ohjeen kauppojen valinnasta. GPS:n käynnistys kuuluu vain boot-efektille tai GPS-napille.

    // v236: Aloitussivu pysyy tyhjänä v234-tyyliin. Hae avataan kiinteänä yhtenä näkymänä, ei skrollattavana sivuna.
    // Hae-paneeli toimii mobiilissa erillisenä näkymänä: se sulkee korin/EANin/vertailun ja näkyy aina viewportissa.
    const openedFromSingleCompare = activeResult === "singleCompare";

    transitionMobilePanel("search", () => {
      setRestoredCartPromptV320({ open: false, count: 0 });
      setCartModalOpen(false);
      setShopsPanelOpen(false);
      setEanModalOpen(false);

      setInput((current) => current);
      setLoadingNormal(false);
      setNormalResults([]);
      setNormalSearchAttempted(false);
      setVisibleNormalCount(8);
      setActiveNormalSearchTerm("");
      setSearchDebug([]);

      if (openedFromSingleCompare) {
        setInput("");
      }

      setActiveResult("none");
      setSearchPanelOpen(true);

      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    });
  }

  function toggleSearchPanel() {
    // V507: jos Hae-kortti on jo auki, Hae-painike sulkee sen heti.
    // Ei fade-viivettä tässä, koska mobiili-Hae voi peittää alapalkin klikkikerroksen.
    if (searchPanelOpen) {
      setSearchPanelOpen(false);
      closeProductSelectionOverlay();
      return;
    }

    if (searchNavigationLocked) return;

    // v342_RESTORE_CART_SEARCH_NAV_FIX:
    // Älä hyppää Kaupat-paneeliin, jos korissa on palautettuja tuotteita.
    // Tällöin käyttäjä saa avata Hae-paneelin ja bottom navin aktiivinen tila pysyy oikein vihreänä.
    // V475: Hae-toggle ei saa avata Kaupat-paneelia eikä sivuvaikutuksena käynnistää GPS-polkuja.
    // Kaupat avataan vain Kaupat-napista, GPS vain bootista tai GPS-napista.

    // Jos Kori on auki, vaihdetaan suoraan Hae-näkymään.
    openSearchPanel();
  }

  function closeSearchPanel() {
    closePanelWithFade("search", () => setSearchPanelOpen(false));
  }

  function openSearchPanelAndStartVoice() {
    voiceOpenSearchPanelAfterResultRef.current = true;
    startVoiceInput();
  }

  function stopVoiceInput(searchAfterStop = false) {
    voiceAutoSearchAfterStopRef.current = Boolean(searchAfterStop);

    if (voiceSilenceTimeoutRef.current) {
      window.clearTimeout(voiceSilenceTimeoutRef.current);
      voiceSilenceTimeoutRef.current = null;
    }

    try {
      recognitionRef.current?.stop?.();
    } catch {
      setIsListening(false);
    }
  }

  function toggleVoiceInput() {
    if (isListening) {
      stopVoiceInput(false);
      return;
    }

    startVoiceInput();
  }

  function startVoiceInput(openPanelAfterResult = false) {
    if (openPanelAfterResult) {
      voiceOpenSearchPanelAfterResultRef.current = true;
    }

    if (!recognitionRef.current) {
      alert(
        "Puhesanelu ei ole käytettävissä tässä selaimessa tai tässä osoitteessa. Kokeile puhelimella HTTPS-osoitteessa, esimerkiksi Vercel-testilinkissä.",
      );
      return;
    }

    if (isListening) return;

    voiceAutoSearchAfterStopRef.current = false;
    voiceLatestCleanedInputRef.current = "";

    if (voiceSilenceTimeoutRef.current) {
      window.clearTimeout(voiceSilenceTimeoutRef.current);
    }

    voiceSilenceTimeoutRef.current = window.setTimeout(() => {
      stopVoiceInput(false);
    }, 2500);

    try {
      recognitionRef.current.start();
    } catch {
      alert("Puhesanelua ei saatu käyntiin. Tarkista selaimen mikrofonilupa.");
    }
  }

  const filteredOffers = useMemo(() => {
    const chainFilteredOffers = offers.filter(
      (item) => chainFilter === "all" || item.chain === chainFilter,
    );
    const offerTerms = parseTerms(offerSearchQuerySnapshot || currentSearchQueryKey);
    return rankOfferSearchResults(chainFilteredOffers, offerTerms);
  }, [offers, offerSearchQuerySnapshot, currentSearchQueryKey, chainFilter]);

  const offerSearchLabel = useMemo(() => {
    const label = offerSearchQuerySnapshot || currentSearchQueryKey;
    return label || "haku";
  }, [offerSearchQuerySnapshot, currentSearchQueryKey]);

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + (item.price || 0) * item.quantity,
      0,
    );
  }, [cart]);

  const cartNameSet = useMemo(() => {
    return new Set(cart.map((item) => normalize(item.name)));
  }, [cart]);

  const visibleNormalResults = useMemo(() => {
    if (searchCompareMode === "single") return normalResults;
    return normalResults.filter(
      (product) => !cartNameSet.has(normalize(product.name)),
    );
  }, [normalResults, cartNameSet, searchCompareMode]);

  // Hakutulosten valintatila on eri käyttömoodi kuin korivertailu.
  // Kun käyttäjä valitsee seuraavaa tuotetta koriin, vertailukortteja ei näytetä
  // taustalla, vaikka vertailudataa päivitettäisiin samaan aikaan.
  const searchSelectionMode = loadingNormal || visibleNormalResults.length > 0;

  const comparableCart = useMemo(() => {
    // Muistilistarivit ovat keräilyä varten, eivät hintavertailua varten.
    // Näin pelkkä "maito,kala,cola"-muistilista ei riko huokeinta koria tai ketjuvertailua.
    return cart.filter((item) => !isManualShoppingItem(item));
  }, [cart]);

  const chainResults = useMemo<ChainResult[]>(() => {
    if (cart.length === 0) return [];
    const sList = comparableCart
      .map((item) => sMatches[item.id])
      .filter(Boolean);
    const kList = comparableCart
      .map((item) => kMatches[item.id])
      .filter(Boolean);
    const sTotal = sList.reduce(
      (sum, match) => sum + match.price * match.quantity,
      0,
    );
    const kTotal = kList.reduce(
      (sum, match) => sum + match.price * match.quantity,
      0,
    );

    const results: ChainResult[] = [
      {
        key: "s",
        chain: "S-ryhmä",
        storeName: activeStores.sStoreName,
        detail: "Oikea hinta valitusta S-kaupasta",
        totalPrice: sTotal,
        foundItems: sList.length,
        missingItems: comparableCart.length - sList.length,
        offerCount: 0,
        icon: "🟢",
        matches: sList,
      },
      {
        key: "k",
        chain: "K-ryhmä",
        storeName: activeStores.kStoreName,
        detail: "Tarkka K-hinta: erikoistuotteet suodatetaan",
        totalPrice: kTotal,
        foundItems: kList.length,
        missingItems: comparableCart.length - kList.length,
        offerCount: 0,
        icon: "🔴",
        matches: kList,
      },
      {
        key: "lidl",
        chain: "Lidl",
        storeName: "Lidl alueella",
        detail: "Hintadata lisätään myöhemmin",
        totalPrice: 0,
        foundItems: 0,
        missingItems: comparableCart.length,
        offerCount: 0,
        icon: "🔵",
        matches: [],
        comingSoon: true,
      },
      {
        key: "tokmanni",
        chain: "Tokmanni / Spar",
        storeName: "Tokmanni / Spar alueella",
        detail: "Hintadata lisätään myöhemmin",
        totalPrice: 0,
        foundItems: 0,
        missingItems: comparableCart.length,
        offerCount: 0,
        icon: "🟡",
        matches: [],
        comingSoon: true,
      },
    ];

    return results
      .filter((result) => selectedChains[result.key])
      .sort((a, b) => {
        if (a.comingSoon && !b.comingSoon) return 1;
        if (!a.comingSoon && b.comingSoon) return -1;
        const aComplete = a.missingItems === 0 && a.totalPrice > 0;
        const bComplete = b.missingItems === 0 && b.totalPrice > 0;
        if (aComplete && !bComplete) return -1;
        if (!aComplete && bComplete) return 1;
        if (a.totalPrice === 0) return 1;
        if (b.totalPrice === 0) return -1;
        return a.totalPrice - b.totalPrice;
      });
  }, [
    cart.length,
    comparableCart,
    sMatches,
    kMatches,
    activeStores,
    selectedChains,
  ]);

  const { completeResults, cheapest, secondCheapest, savings, savingsPercent } =
    useMemo(() => {
      const complete = chainResults.filter(
        (result) =>
          !result.comingSoon &&
          result.totalPrice > 0 &&
          result.missingItems === 0,
      );
      const best = complete[0];
      const runnerUp = complete[1];
      const difference =
        best && runnerUp ? runnerUp.totalPrice - best.totalPrice : 0;
      const percent =
        best && runnerUp && runnerUp.totalPrice > 0
          ? (difference / runnerUp.totalPrice) * 100
          : 0;

      return {
        completeResults: complete,
        cheapest: best,
        secondCheapest: runnerUp,
        savings: difference,
        savingsPercent: percent,
      };
    }, [chainResults]);

  const isShoppingListReady = cart.length > 0 && terms.length === 0;

  const topSavingsText = useMemo(() => {
    if (cheapest && secondCheapest && savings > 0) {
      return `Huokein täysi kori: ${cheapest.storeName} · ${savingsPercent.toFixed(1).replace(".", ",")} % huokeampi kuin seuraava`;
    }

    return cheapest ? `Huokein täysi kori: ${cheapest.storeName}` : "";
  }, [cheapest, secondCheapest, savings, savingsPercent]);

  const showCheapestSticky = useMemo(() => {
    // v319: Vertailu avautuu aina yleisnäkymään. Näytä iso huokein kori -kortti heti,
    // vaikka vertailussa olisi vain yksi valmis kauppa tai säästöä ei vielä synny.
    return cart.length > 0 && Boolean(cheapest);
  }, [cart.length, cheapest]);

  function getShoppingListItemKey(match: Match, index?: number) {
    // Stable key that survives refresh and grouping changes.
    // Do not depend on category-local index, because category rendering resets index per group.
    return (
      match.cartItemId ||
      match.product.ean ||
      `${match.product.id}-${normalize(match.product.name)}`
    );
  }

  const shoppingListItems = useMemo(() => {
    const matchedCartIds = new Set(
      (cheapest?.matches || [])
        .map((match) => match.cartItemId)
        .filter(Boolean),
    );

    const manualMatches = cart
      .filter(
        (item) => isManualShoppingItem(item) || !matchedCartIds.has(item.id),
      )
      .map(
        (item) =>
          ({
            product: item.product || {
              id: Number(item.id.replace(/\D/g, "").slice(0, 9)) || Date.now(),
              name: item.name,
              ean: item.ean,
              pictureUrl: item.image,
              price: item.price || 0,
              storeItems: [{ price: item.price || 0 }],
            },
            price: item.price || 0,
            quantity: item.quantity,
            matchType: item.ean ? "ean" : "manual",
            cartItemId: item.id,
          }) as Match,
      );

    return cheapest?.matches?.length
      ? [...cheapest.matches, ...manualMatches]
      : manualMatches;
  }, [cheapest, cart]);

  const shoppingListKeys = useMemo(() => {
    return shoppingListItems.map((match, index) =>
      getShoppingListItemKey(match, index),
    );
  }, [shoppingListItems]);

  const bestShoppingListGroups = useMemo(() => {
    return shoppingListItems.reduce(
      (groups, match) => {
        const category = getProductCategoryLabel(
          match.product.name,
          match.product.category,
        );
        if (!groups[category]) groups[category] = [];
        groups[category].push(match);
        return groups;
      },
      {} as Record<string, Match[]>,
    );
  }, [shoppingListItems]);

  const { checkedCount, shoppingListCount, shoppingProgressPercent } =
    useMemo(() => {
      const checked = shoppingListKeys.filter(
        (key) => checkedCartItems[key],
      ).length;
      const total = shoppingListKeys.length;

      return {
        checkedCount: checked,
        shoppingListCount: total,
        shoppingProgressPercent: Math.round(
          (checked / Math.max(1, total)) * 100,
        ),
      };
    }, [shoppingListKeys, checkedCartItems]);

  useEffect(() => {
    try {
      const savedChecks = window.localStorage.getItem(
        "ziiply-shopping-checks-v1",
      );
      if (savedChecks) {
        const parsed = JSON.parse(savedChecks);
        if (parsed && typeof parsed === "object") {
          setCheckedCartItems(
            parsed.items && typeof parsed.items === "object"
              ? parsed.items
              : parsed,
          );
        }
      }
    } catch {
      // Ignore broken checklist data.
    } finally {
      shoppingChecksHaveLoadedRef.current = true;
    }
  }, []);

  function persistShoppingChecksImmediately(
    nextChecks: Record<string, boolean>,
  ) {
    try {
      window.localStorage.setItem(
        "ziiply-shopping-checks-v1",
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          items: nextChecks,
        }),
      );
    } catch {
      // Ignore storage errors in private browsing.
    }
  }

  useEffect(() => {
    if (!shoppingChecksHaveLoadedRef.current) return;
    if (shoppingListKeys.length === 0) return;

    const validKeys = new Set(shoppingListKeys);
    setCheckedCartItems((current) => {
      let changed = false;
      const next: Record<string, boolean> = {};

      for (const key of Object.keys(current)) {
        if (validKeys.has(key) && current[key]) {
          next[key] = true;
        } else {
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [shoppingListKeys.join("|")]);

  useEffect(() => {
    if (!shoppingChecksHaveLoadedRef.current) return;

    if (shoppingChecksSaveTimeoutRef.current) {
      window.clearTimeout(shoppingChecksSaveTimeoutRef.current);
    }

    // UI debounce / anti-duplicate protection
    shoppingChecksSaveTimeoutRef.current = window.setTimeout(() => {
      persistShoppingChecksImmediately(checkedCartItems);
    }, 250);

    return () => {
      if (shoppingChecksSaveTimeoutRef.current) {
        window.clearTimeout(shoppingChecksSaveTimeoutRef.current);
        shoppingChecksSaveTimeoutRef.current = null;
      }
    };
  }, [checkedCartItems]);

  useEffect(() => {
    // v318: Vertailu-kortin taustalle ei näytetä erillistä säästötoastia.
    setLastSavingsToast(null);
  }, [activeResult, cheapest?.key, cheapest?.totalPrice, savings]);

  useEffect(() => {
    // v319: Vertailu-kortti avautuu aina yleisnäkymän alkuun, ei edelliseen skrollipaikkaan
    // eikä suoraan kauppakohtaiseen tuotelistaan.
    if (activeResult !== "compare") return;
    requestAnimationFrame(() => {
      compareOverlayScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
      comparisonSectionRef.current?.scrollIntoView?.({
        block: "start",
        behavior: "auto",
      });
    });
  }, [activeResult, cheapest?.key, cart.length]);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function scrollToNextUncheckedShoppingItem(
    nextChecks: Record<string, boolean>,
    currentKey: string,
  ) {
    const currentIndex = shoppingListKeys.findIndex(
      (itemKey) => itemKey === currentKey,
    );
    if (currentIndex < 0) return;

    const orderedKeys = [
      ...shoppingListKeys.slice(currentIndex + 1),
      ...shoppingListKeys.slice(0, currentIndex),
    ];
    const nextKey = orderedKeys.find((itemKey) => !nextChecks[itemKey]);
    if (!nextKey) return;

    window.setTimeout(() => {
      shoppingItemRefs.current[nextKey]?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }, 80);
  }

  function toggleShoppingListItem(match: Match, index: number) {
    const key = getShoppingListItemKey(match, index);

    setCheckedCartItems((current) => {
      const willBeChecked = !current[key];
      const next = {
        ...current,
        [key]: willBeChecked,
      };
      persistShoppingChecksImmediately(next);

      if (willBeChecked) {
        scrollToNextUncheckedShoppingItem(next, key);
      }

      return next;
    });

    triggerHaptic();
  }

  function markAllShoppingListItemsChecked() {
    if (shoppingListKeys.length === 0) return;

    setCheckedCartItems((current) => {
      const next = { ...current };
      for (const key of shoppingListKeys) {
        next[key] = true;
      }
      persistShoppingChecksImmediately(next);
      return next;
    });

    showCartToast("Kaikki ostokset merkitty kerätyiksi");
    triggerHaptic();
  }

  function openShoppingListForCheapest() {
    setSearchPanelOpen(false);
    setEanModalOpen(false);
    setActiveResult("none");
    setCartModalOpen((current) => !current);
    triggerHaptic();
  }

  function clearShoppingListChecks() {
    if (shoppingListKeys.length === 0) return;

    const checkedCount = shoppingListKeys.filter(
      (key) => checkedCartItems[key],
    ).length;
    const ok = window.confirm(
      `Nollataanko keräilymerkinnät (${checkedCount}/${shoppingListKeys.length} kerätty)? Ostoskoriin jäävät tuotteet säilyvät.`,
    );
    if (!ok) return;

    setCheckedCartItems((current) => {
      const next = { ...current };
      for (const key of shoppingListKeys) {
        delete next[key];
      }
      persistShoppingChecksImmediately(next);
      return next;
    });
    showCartToast("Keräily nollattu");
    triggerHaptic();
  }

  function restorePreviousOptimization() {
    if (!lastOptimizationSnapshot) return;

    setCart(lastOptimizationSnapshot.cart);
    setSMatches(lastOptimizationSnapshot.sMatches);
    setKMatches(lastOptimizationSnapshot.kMatches);
    setAlternativeResults(lastOptimizationSnapshot.alternativeResults);
    setExpandedAlternatives(lastOptimizationSnapshot.expandedAlternatives);
    setOptimizingChains({});
    setLastOptimizationSnapshot(null);
    setActiveResult("compare");
  }

  function clearSearchAndComparisonState() {
    setOffers([]);
    setNormalResults([]);
    setSMatches({});
    setKMatches({});
    setHasSearchedOffers(false);
    setVisibleNormalCount(8);
    setLastOptimizationSnapshot(null);
    setActiveResult("none");
  }

  function closeProductSelectionOverlay() {
    setLoadingNormal(false);
    setNormalResults([]);
    setVisibleNormalCount(8);
    setNormalSearchAttempted(false);
    setActiveNormalSearchTerm("");
    if (activeResult !== "compare" && activeResult !== "singleCompare") {
      setActiveResult("none");
    }
  }

  function inferStoreModeForStoreV306(
    store: StoreSearchItem,
    fallbackMode: StoreMode = storeMode,
  ): StoreMode {
    const name = normalize(store.name || "");
    if (store.type === "S") {
      if (
        isSLocalStore(store) ||
        hasAnyToken(name, ["s-market", "s market", "alepa", "sale", "market"])
      )
        return "local";
      if (isPrisma(store)) return "hyper";
    }
    if (store.type === "K") {
      if (
        isKLocalStore(store) ||
        hasAnyToken(name, [
          "k-market",
          "k market",
          "k-supermarket",
          "k supermarket",
          "market",
        ])
      )
        return "local";
      if (isKCitymarket(store)) return "hyper";
    }
    return fallbackMode;
  }

  function handleStoreModeChange(nextMode: StoreMode) {
    if (storeCompareScope === "within_chain") return;

    selectedStoreModeRefV302.current = nextMode;
    // v308_STEP4C:
    // Tavaratalot/Lähikaupat-valinta ei saa automaattisesti aktivoida
    // Ketjujen väliltä -vertailutapaa. Vertailutapa muuttuu vain, kun
    // käyttäjä painaa itse Ketjujen väliltä tai Ketjun sisältä -nappia.
    setWithinChain(null);
    setStoreModeChosenV299(true);
    setOpenStorePicker(null);

    trackZiiplyEvent("store_mode_changed", {
      previousMode: storeMode,
      nextMode,
    });

    setStoreMode(nextMode);
    if (storeCompareScope === "between_chains") {
      setSelectedChains((current) => ({
        ...current,
        s: true,
        k: true,
        lidl: false,
        tokmanni: false,
      }));
    }
    clearSearchAndComparisonState();
  }

  function selectStoreForCurrentMode(
    store: StoreSearchItem,
    forcedMode?: StoreMode,
  ) {
    if (!store.id || !store.name) return;

    // v304_STORE_MODE_LOCK:
    // Kauppavalinta tehdään aina sen valintalaatikon moodiin, josta klikkaus tuli.
    // Älä päättele moodia uudelleen refistä/stateista, koska async-effectit voivat olla
    // ehtineet palauttaa storeMode-arvon hyperiksi juuri ennen kaupan klikkausta.
    const effectiveStoreMode =
      forcedMode || selectedStoreModeRefV302.current || storeMode;

    trackZiiplyEvent("store_selected", {
      storeId: store.id,
      storeName: store.name,
      chain: store.type || store.chain || "unknown",
      storeMode: effectiveStoreMode,
      city: store.city,
      postalCode: store.postalCode,
    });

    setActiveArea((current) => {
      if (effectiveStoreMode === "local") {
        if (store.type === "S") {
          return {
            ...current,
            sLocalStoreId: store.id,
            sLocalStoreName: store.name,
          };
        }

        if (store.type === "K") {
          return {
            ...current,
            kLocalStoreId: store.id,
            kLocalStoreName: store.name,
          };
        }
      }

      if (store.type === "S") {
        return {
          ...current,
          sStoreId: store.id,
          sStoreName: store.name,
        };
      }

      if (store.type === "K") {
        return {
          ...current,
          kStoreId: store.id,
          kStoreName: store.name,
        };
      }

      return current;
    });

    // v306_STORE_PICKER_GPS_HARD_LOCK:
    // Kaupan valitseminen EI saa koskaan itsestään aktivoida Tavaratalot/Lähikaupat-nappia.
    // Moodin saa valita vain Hakutapa-napeista. Jos moodi on jo valittu, pidetään se vakaana.
    if (storeCompareScope === "between_chains") {
      // Vain käyttäjän lukitsema between_chains-hakutapa saa pysyä aktiivisena.
      // Ketjun sisällä -valinnat eivät saa muuttaa Tavaratalot/Lähikaupat-lukkoa.
      selectedStoreModeRefV302.current = effectiveStoreMode;
      setStoreMode(effectiveStoreMode);
    }

    setOpenStorePicker(null);

    clearSearchAndComparisonState();
    setLocationMessage(
      storeModeChosenV299
        ? `${store.name} valittu ${store.type === "S" ? "S-ryhmän" : "K-ryhmän"} ${effectiveStoreMode === "local" ? "lähikaupaksi" : "tavarataloksi"}.`
        : `${store.name} valittu. Valitse vielä Tavaratalot tai Lähikaupat.`,
    );
  }

  function clearStoreBackedSearchState() {
    setOffers([]);
    setNormalResults([]);
    setVisibleNormalCount(8);
    setSMatches({});
    setKMatches({});
    setHasSearchedOffers(false);
    setActiveResult("none");
    setLastOptimizationSnapshot(null);
  }

  function rankStoresForMode(stores: StoreSearchItem[], mode: StoreMode) {
    const sStores = stores.filter((store) => store.type === "S");
    const kStores = stores.filter((store) => store.type === "K");

    const sHyper = pickStore(sStores, isPrisma);
    const kHyper = pickStore(kStores, isKCitymarket);
    const sLocal = pickStore(sStores, isSLocalStore);
    const kLocal = pickStore(kStores, isKLocalStore);

    return {
      sHyper,
      kHyper,
      sLocal,
      kLocal,
      selectedS: mode === "local" ? sLocal : sHyper,
      selectedK: mode === "local" ? kLocal : kHyper,
    };
  }

  function buildDynamicArea(
    query: string,
    stores: StoreSearchItem[],
    mode: StoreMode,
  ): Area {
    const matchedArea = findArea(query);
    const ranked = rankStoresForMode(stores, mode);

    const detectedCity =
      ranked.selectedS?.city ||
      ranked.selectedK?.city ||
      stores.find((store) => store.city)?.city ||
      matchedArea?.label ||
      query;

    return {
      label: detectedCity,
      aliases: Array.from(
        new Set(
          [...(matchedArea?.aliases || []), query, detectedCity].filter(
            Boolean,
          ),
        ),
      ),
      sStoreId: ranked.sHyper?.id,
      sStoreName: ranked.sHyper?.name,
      kStoreId: ranked.kHyper?.id,
      kStoreName: ranked.kHyper?.name,
      sLocalStoreId: ranked.sLocal?.id,
      sLocalStoreName: ranked.sLocal?.name,
      kLocalStoreId: ranked.kLocal?.id,
      kLocalStoreName: ranked.kLocal?.name,
    };
  }

  async function fetchStoresForLocationQuery(
    query: string,
    coords?: { latitude: number; longitude: number } | null,
  ) {
    const params = new URLSearchParams({ search: query });
    if (coords) {
      params.set("lat", String(coords.latitude));
      params.set("lon", String(coords.longitude));
      params.set("lng", String(coords.longitude));
      params.set("latitude", String(coords.latitude));
      params.set("longitude", String(coords.longitude));
    }
    const response = await fetch(`/api/store-search?${params.toString()}`, {
      cache: "no-store",
    });
    const data = await response.json();
    const stores = ((data.items || []) as StoreSearchItem[]).filter(
      (store) => store.id && store.name,
    );

    // v320store-11:
    // Varmistetaan etäisyydet myös silloin, kun API ei palauta distance-kenttää.
    // Jos GPS-koordinaatti on käytössä ja kaupalla on koordinaatit, lasketaan distanceKm mukaan listadataan.
    if (!coords) return stores;

    return stores.map((store) => {
      const explicitDistanceKm = readExplicitDistanceKmV320(store);
      if (explicitDistanceKm != null) {
        return {
          ...store,
          distanceKm: explicitDistanceKm,
        };
      }

      const latitude = getStoreCoordinateV320(store, ["latitude", "lat", "y"]);
      const longitude = getStoreCoordinateV320(store, [
        "longitude",
        "lng",
        "lon",
        "x",
      ]);

      if (latitude == null || longitude == null) return store;

      return {
        ...store,
        distanceKm: calculateDistanceKmV320(coords, { latitude, longitude }),
      };
    });
  }

  function getCityFromGeocodeAddress(address: any) {
    return String(
      address?.city ||
        address?.town ||
        address?.municipality ||
        address?.village ||
        address?.suburb ||
        address?.county ||
        "",
    ).trim();
  }

  function isFinnishPostalCode(value: string) {
    return /^\d{5}$/.test(value.trim());
  }

  async function reverseGeocodeCity(latitude: number, longitude: number) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&accept-language=fi`,
      { cache: "no-store" },
    );
    const data = await response.json();
    return getCityFromGeocodeAddress(data?.address || {});
  }

  async function resolvePostalCodeToCity(postalCode: string) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=fi&postalcode=${encodeURIComponent(postalCode)}&addressdetails=1&limit=1&accept-language=fi`,
      { cache: "no-store" },
    );
    const data = await response.json();
    const firstMatch = Array.isArray(data) ? data[0] : null;
    return getCityFromGeocodeAddress(firstMatch?.address || {});
  }

  function getCurrentPosition(options?: PositionOptions) {
    pushGpsDebugLogV492(`getCurrentPosition() ENTRY high=${String(options?.enableHighAccuracy)} timeout=${String(options?.timeout)} maxAge=${String(options?.maximumAge)}`);
    // V491_GPS_SINGLE_PROMISE_CONTROLLED_RETRY:
    // Kaikki GPS-haut kulkevat tämän yhden portin kautta. Jos toinen polku yrittää
    // paikantaa samaan aikaan, se saa saman promisen eikä käynnistä selaimen GPS:ää uudelleen.
    // Jos ensimmäinen yritys hutaa, tehdään yksi sisäinen retry samassa ajossa ilman uutta UI-starttia.
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      pushGpsDebugLogV492("getCurrentPosition() FAIL no navigator.geolocation");
      return Promise.reject(new Error("Geolocation is not supported"));
    }

    const holder = window as typeof window & {
      __ziiplyCurrentPositionPromiseV491?: Promise<GeolocationPosition> | null;
      __ziiplyCurrentPositionLastV491?: GeolocationPosition | null;
      __ziiplyCurrentPositionLastAtV491?: number;
    };

    const now = Date.now();
    const cachedPosition = holder.__ziiplyCurrentPositionLastV491;
    const cachedAt = holder.__ziiplyCurrentPositionLastAtV491 || 0;

    // Jos juuri saatiin koordinaatit, älä pyydä selaimelta heti uutta sijaintia.
    if (cachedPosition && now - cachedAt < 30000) {
      pushGpsDebugLogV492("getCurrentPosition() CACHE HIT");
      return Promise.resolve(cachedPosition);
    }

    if (holder.__ziiplyCurrentPositionPromiseV491) {
      pushGpsDebugLogV492("getCurrentPosition() REUSE IN-FLIGHT PROMISE");
      return holder.__ziiplyCurrentPositionPromiseV491;
    }

    const requestPosition = (requestOptions: PositionOptions, label: string) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        pushGpsDebugLogV492(`BROWSER GPS START ${label} high=${String(requestOptions.enableHighAccuracy)} timeout=${String(requestOptions.timeout)} maxAge=${String(requestOptions.maximumAge)}`);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            pushGpsDebugLogV492(`BROWSER GPS SUCCESS ${label} lat=${position.coords.latitude.toFixed(5)} lon=${position.coords.longitude.toFixed(5)}`);
            resolve(position);
          },
          (error) => {
            pushGpsDebugLogV492(`BROWSER GPS ERROR ${label} code=${String(error.code)} msg=${error.message || ""}`);
            reject(error);
          },
          requestOptions,
        );
      });

    const firstOptions: PositionOptions = {
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      timeout: options?.timeout ?? 15000,
      maximumAge: options?.maximumAge ?? 0,
    };

    const retryOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 18000,
      maximumAge: 0,
    };

    holder.__ziiplyCurrentPositionPromiseV491 = requestPosition(firstOptions, "first")
      .catch((error) => {
        pushGpsDebugLogV492(`getCurrentPosition() INTERNAL RETRY after code=${String((error as any)?.code ?? "?")}`);
        return requestPosition(retryOptions, "retry");
      })
      .then((position) => {
        pushGpsDebugLogV492("getCurrentPosition() RESOLVED");
        holder.__ziiplyCurrentPositionLastV491 = position;
        holder.__ziiplyCurrentPositionLastAtV491 = Date.now();
        return position;
      })
      .finally(() => {
        pushGpsDebugLogV492("getCurrentPosition() PROMISE CLEARED");
        holder.__ziiplyCurrentPositionPromiseV491 = null;
      });

    return holder.__ziiplyCurrentPositionPromiseV491;
  }


  function getMapSearchNameV393(value?: string | number | null) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function openSelectedStoresMapV393() {
    if (typeof window === "undefined") return;

    const sName = getMapSearchNameV393(activeStores.sStoreName || activeArea.sStoreName);
    const kName = getMapSearchNameV393(activeStores.kStoreName || activeArea.kStoreName);
    const area = getMapSearchNameV393(activeArea.label || locationInput || "");

    const hasBothStores =
      sName &&
      kName &&
      !sName.toLowerCase().includes("ei valittu") &&
      !kName.toLowerCase().includes("ei valittu") &&
      !sName.toLowerCase().includes("valitse ensin") &&
      !kName.toLowerCase().includes("valitse ensin");

    if (hasBothStores) {
      const origin = encodeURIComponent(`${sName} ${area} Suomi`);
      const destination = encodeURIComponent(`${kName} ${area} Suomi`);
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }

    const fallback = encodeURIComponent(`${area || "kauppa"} ruokakauppa Suomi`);
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${fallback}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function applyLocation(
    queryOverride?: string,
    source: "manual" | "gps" = "manual",
    coordsOverride?: { latitude: number; longitude: number } | null,
  ) {
    pushGpsDebugLogV492(`applyLocation() ENTRY source=${source} query=${String(queryOverride || locationInput)}`);
    const rawQuery = (queryOverride || locationInput).trim();

    if (!rawQuery) {
      setLocationMessage("Kirjoita ensin kaupunki, alue tai postinumero");
      return;
    }

    if (source === "manual") {
      setUsingOwnLocation(false);
      setGpsCoordsV320(null);
    }

    setStoreSearchLoading(true);
    setLocationMessage(
      source === "gps"
        ? `Haetaan kauppoja alueelle ${rawQuery}`
        : `Haetaan kauppoja alueelle ${rawQuery}`,
    );

    try {
      let query = rawQuery;

      if (isFinnishPostalCode(rawQuery)) {
        setLocationMessage(`Haetaan aluetta postinumerolle ${rawQuery}`);
        const cityFromPostalCode = await resolvePostalCodeToCity(rawQuery);

        if (!cityFromPostalCode) {
          setFoundStores([]);
          setLocationMessage(
            `Postinumeroa "${rawQuery}" ei tunnistettu. Valitse alue käsin.`,
          );
          return;
        }

        query = cityFromPostalCode;
      }

      trackZiiplyEvent("store_search_used", {
        query,
        rawQuery,
        storeMode,
        source,
      });

      setLocationMessage(
        `Haetaan kauppoja alueelle ${query}`,
      );
      const stores = await fetchStoresForLocationQuery(
        query,
        source === "gps" ? coordsOverride || gpsCoordsV320 : null,
      );
      setFoundStores(stores);

      if (stores.length === 0) {
        setLocationMessage(
          `Alueelle "${query}" ei löytynyt kauppoja. Valitse alue käsin.`,
        );
        return;
      }

      const ranked = rankStoresForMode(
        stores,
        storeModeChosenV299 ? selectedStoreModeRefV302.current : storeMode,
      );
      const nextArea = buildDynamicArea(
        query,
        stores,
        storeModeChosenV299 ? selectedStoreModeRefV302.current : storeMode,
      );
      setActiveArea(nextArea);

      // v272: Nuppineula kertoo yksiselitteisesti käytetäänkö omaa sijaintia.
      // - GPS / oma sijainti: vihreä nuppineula, hakukenttä tyhjä ja placeholder näkyy.
      // - Käsin haettu sijainti: punainen nuppineula, löydetty sijainti näkyy kentässä.
      if (source === "gps") {
        setUsingOwnLocation(true);
        setLocationInput("");
      } else {
        setUsingOwnLocation(false);
        setLocationInput(nextArea.label || query);
      }

      clearStoreBackedSearchState();

      // v352_DESKTOP_GPS_DEFAULT_STORE_SELECTION:
      // GPS-löydön jälkeen oletuksena Tavaratalot + Ketjujen väliltä.
      if (source === "gps") {
        selectedStoreModeRefV302.current = "hyper";
        setStoreMode("hyper");
        setStoreModeChosenV299(true);
        setStoreCompareScope("between_chains");
        setWithinChain(null);
        setSelectedChains((current) => ({
          ...current,
          s: true,
          k: true,
          lidl: false,
          tokmanni: false,
        }));
      }

      if (typeof document !== "undefined") {
        const activeElement = document.activeElement as HTMLElement | null;
        activeElement?.blur?.();
      }

      const effectiveStoreModeForLocationMessage = source === "gps" ? "hyper" : storeMode;
      const modeMissing =
        effectiveStoreModeForLocationMessage === "local"
          ? !ranked.sLocal || !ranked.kLocal
          : !ranked.sHyper || !ranked.kHyper;

      if (modeMissing) {
        setLocationMessage(
          `${nextArea.label || query} löytyi, mutta kaikkia ${effectiveStoreModeForLocationMessage === "local" ? "lähikauppoja" : "tavarataloja"} ei löytynyt. Voit valita kaupat listasta.`,
        );
      } else {
        setLocationMessage(`${activeArea.label || "GPS"} käytössä`);
      }
    } catch (error) {
      pushGpsDebugLogV492(`useOwnLocation CATCH code=${String((error as any)?.code ?? "?")}`);
      console.error(error);
      const gpsErrorCode =
        typeof error === "object" && error !== null && "code" in error
          ? Number((error as { code?: number }).code)
          : 0;
      if (gpsErrorCode === 1) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 2) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 3) {
        setGpsErrorMessage("GPS ei löydy");
      } else {
        setGpsErrorMessage("GPS ei löydy");
      }
      setLocationMessage(
        source === "gps"
          ? "Sijainti löytyi, mutta kauppahaku epäonnistui. Valitse alue käsin."
          : "Kauppahaku epäonnistui. Valitse alue käsin.",
      );
    } finally {
      setStoreSearchLoading(false);
      if (source === "gps") {
        setGpsErrorMessage("");
        setLocationMessage(`${activeArea.label || "GPS"} käytössä`);
        setLocationMessageVisible(true);
      }
    }
  }


  useEffect(() => {
    const query = locationInput.trim();

    if (!query || usingOwnLocation || storeSearchLoading) return;
    if (lastAutoAppliedLocationRefV361.current === query) return;

    const timer = window.setTimeout(() => {
      const nextQuery = locationInput.trim();
      if (!nextQuery || usingOwnLocation) return;
      if (lastAutoAppliedLocationRefV361.current === nextQuery) return;

      lastAutoAppliedLocationRefV361.current = nextQuery;
      void applyLocation(nextQuery, "manual");
    }, 800);

    return () => window.clearTimeout(timer);
  }, [locationInput, usingOwnLocation, storeSearchLoading]);

  async function applyWeatherBootGpsV481(coords: { latitude: number; longitude: number }) {
    // V490: sää/topbar ei saa enää koskaan käynnistää tai soveltaa GPS-paikannusta.
    // Yksi automaattinen GPS-startti tulee vain page-tason boot-effectistä.
    return;
    if (weatherBootApplyInFlightRefV481.current) return;
    if (gpsCoordsV320 && foundStores.length > 0) return;

    weatherBootApplyInFlightRefV481.current = true;
    gpsUserDisabledRefV306.current = false;
    gpsInitialVisiblePhaseRefV391.current = false;
    setGpsErrorMessage("");
    setUsingOwnLocation(true);
    setGpsCoordsV320(coords);
    setStoreSearchLoading(true);
    setLocationMessage("Paikannetaan GPS");
    setLocationMessageVisible(true);

    try {
      const city = await reverseGeocodeCity(coords.latitude, coords.longitude);

      if (!city) {
        pushGpsDebugLogV492(`useOwnLocation reverse geocode EMPTY`);
        setGpsErrorMessage("GPS ei löydy");
        setLocationMessage("GPS ei löydy");
        setLocationMessageVisible(true);
        setUsingOwnLocation(false);
        setGpsCoordsV320(null);
        setStoreSearchLoading(false);
        return;
      }

      setGpsErrorMessage("");
      setLocationMessage(`${city} käytössä`);
      setLocationMessageVisible(true);
      setLocationInput("");
      await applyLocation(city, "gps", coords);
    } catch (error) {
      pushGpsDebugLogV492(`useOwnLocation CATCH code=${String((error as any)?.code ?? "?")}`);
      console.error(error);
      setGpsErrorMessage("GPS ei löydy");
      setLocationMessage("GPS ei löydy");
      setLocationMessageVisible(true);
      setUsingOwnLocation(false);
      setGpsCoordsV320(null);
      setStoreSearchLoading(false);
    } finally {
      weatherBootApplyInFlightRefV481.current = false;
      setGpsBootReadyV473(true);
    }
  }

  async function useOwnLocation(source: "boot" | "manual" = "manual") {
    pushGpsDebugLogV492(`useOwnLocation ENTRY using=${String(usingOwnLocation)} loading=${String(storeSearchLoading)} coords=${gpsCoordsV320 ? "yes" : "no"} stores=${String(foundStores.length)}`);
    const now = Date.now();
    const gpsWindowLockV470 = getZiiplyGpsWindowLockV470();
    const isBootGpsRunV472 = source === "boot";
    let gpsResolvedCityV495 = "";
    let gpsResolvedCoordsV495: { latitude: number; longitude: number } | null = null;
    let gpsApplyLocationDoneV495 = false;

    // V485: Jos edellinen manuaalinen GPS-haku juuri onnistui, älä anna
    // vihreän nuppineulan / child-komponentin / fallbackin käynnistää samaa
    // hakua uudestaan. Käyttäjän pois-painallus tyhjentää tämän lukon.
    if (source === "manual" && now < gpsManualSuccessGuardUntilRefV485.current) {
      pushGpsDebugLogV492("useOwnLocation(manual) BLOCKED by manual success guard");
      const lockedCoords = gpsManualSuccessCoordsRefV485.current;
      if (lockedCoords) {
        setGpsCoordsV320(lockedCoords);
        setUsingOwnLocation(true);
        setStoreSearchLoading(false);
        setGpsStorePickerBlockedV382(false);
      }
      return;
    }

    // V472: boot/reload saa yrittää automaattista GPS-hakua vain kerran.
    // Tämä EI koske käyttäjän GPS-nappia, jotta GPS:n saa pois ja uudelleen päälle käsin.
    if (isBootGpsRunV472) {
      if (ziiplyGpsBootAttemptedV472 || ziiplyGpsBootSucceededV472) {
        pushGpsDebugLogV492("useOwnLocation(boot) BLOCKED boot attempted/succeeded");
        return;
      }
      // Jos jokin aiempi reitti on jo saanut sijainnin ja kaupat, boot ei saa enää
      // koskea GPS:ään saman sivulatauksen aikana.
      if (gpsCoordsV320 && foundStores.length > 0) {
        pushGpsDebugLogV492("useOwnLocation(boot) BLOCKED coords+stores already ready");
        return;
      }
      ziiplyGpsBootAttemptedV472 = true;
    }

    // V470: yksi ainoa GPS-ajo kerrallaan. Lukko on sekä komponentin refissä,
    // moduulitasolla että window-tasolla, koska reload/avaa voi remountata Page-komponentin
    // ennen kuin Reactin state ehtii kertoa toiselle polulle, että GPS on jo käynnissä.
    if (gpsSearchInFlightRefV465.current || ziiplyGpsHardInFlightV469 || gpsWindowLockV470?.inFlight) {
      pushGpsDebugLogV492("useOwnLocation() BLOCKED in-flight lock");
      return;
    }
    if (storeSearchLoading && now - gpsLastFinishedAtRefV466.current < 3000) {
      pushGpsDebugLogV492("useOwnLocation() BLOCKED storeSearchLoading recent finish");
      return;
    }
    if (now - gpsLastFinishedAtRefV466.current < 1200) {
      pushGpsDebugLogV492("useOwnLocation() BLOCKED component recent finish");
      return;
    }
    if (now - ziiplyGpsHardLastFinishedAtV469 < 2500) {
      pushGpsDebugLogV492("useOwnLocation() BLOCKED module recent finish");
      return;
    }
    if (gpsWindowLockV470 && now - gpsWindowLockV470.lastFinishedAt < 2500) {
      pushGpsDebugLogV492("useOwnLocation() BLOCKED window recent finish");
      return;
    }

    pushGpsDebugLogV492(`useOwnLocation START accepted`);
    gpsSearchInFlightRefV465.current = true;
    ziiplyGpsHardInFlightV469 = true;
    if (gpsWindowLockV470) {
      gpsWindowLockV470.inFlight = true;
      gpsWindowLockV470.lastStartedAt = now;
    }

    setOpenStorePicker(null);
    setGpsStorePickerBlockedV382(true);
    if (gpsFailTimerRefV391.current) {
      window.clearTimeout(gpsFailTimerRefV391.current);
      gpsFailTimerRefV391.current = null;
    }
    // V491: watchdog on pidempi, koska getCurrentPosition tekee tarvittaessa yhden sisäisen retryn.
    gpsFailTimerRefV391.current = window.setTimeout(() => {
      if (gpsSearchInFlightRefV465.current) {
        pushGpsDebugLogV492(`WATCHDOG FIRED`);
        const finishedAt = Date.now();
        setGpsErrorMessage("GPS ei löydy");
        setLocationMessage("GPS ei löydy");
        setLocationMessageVisible(true);
        setStoreSearchLoading(false);
        setUsingOwnLocation(false);
        gpsLastFinishedAtRefV466.current = finishedAt;
        ziiplyGpsHardLastFinishedAtV469 = finishedAt;
        const gpsWindowLock = getZiiplyGpsWindowLockV470();
        if (gpsWindowLock) {
          gpsWindowLock.lastFinishedAt = finishedAt;
          gpsWindowLock.inFlight = false;
        }
        gpsSearchInFlightRefV465.current = false;
        ziiplyGpsHardInFlightV469 = false;
        setGpsBootReadyV473(true);
        window.setTimeout(() => setGpsStorePickerBlockedV382(false), 180);
      }
    }, 45000);
    gpsUserDisabledRefV306.current = false;
    setGpsErrorMessage("");
    setUsingOwnLocation(true);
    setLocationInput("");
    setStoreSearchLoading(true);
    setLocationMessage("Paikannetaan GPS");

    try {
      pushGpsDebugLogV492(`useOwnLocation before getCurrentPosition`);
      const position = await getCurrentPosition(
        isBootGpsRunV472
          ? { enableHighAccuracy: false, timeout: 18000, maximumAge: 30000 }
          : { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
      const nextGpsCoordsV485 = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      pushGpsDebugLogV492(`useOwnLocation got coords, reverse geocode start`);
      setGpsCoordsV320(nextGpsCoordsV485);
      const city = await reverseGeocodeCity(
        nextGpsCoordsV485.latitude,
        nextGpsCoordsV485.longitude,
      );

      if (!city) {
        pushGpsDebugLogV492(`useOwnLocation reverse geocode EMPTY`);
        setGpsErrorMessage("GPS ei löydy");
        setLocationMessage("GPS ei löydy");
        setLocationMessageVisible(true);
        gpsUserDisabledRefV306.current = true;
        setUsingOwnLocation(false);
        setGpsCoordsV320(null);
        return;
      }

      pushGpsDebugLogV492(`useOwnLocation city=${city}`);
      gpsResolvedCityV495 = city;
      gpsResolvedCoordsV495 = nextGpsCoordsV485;
      setGpsErrorMessage("");
      gpsInitialVisiblePhaseRefV391.current = false;
      if (gpsFailTimerRefV391.current) {
        window.clearTimeout(gpsFailTimerRefV391.current);
        gpsFailTimerRefV391.current = null;
      }
      setGpsErrorMessage("");
      setLocationMessage(`${city} käytössä`);
      setLocationMessageVisible(true);
      setLocationInput("");
      // V470: älä pudota storeSearchLoadingia pois päältä tässä välissä.
      // GPS-paikannus ja sitä seuraava kauppahaku ovat yksi atominen ajo, jotta
      // Kaupat-paneelin fallback tai toinen effect ei voi startata uutta GPS-hakua väliin.
      pushGpsDebugLogV492(`useOwnLocation applyLocation start`);
      await applyLocation(city, "gps", nextGpsCoordsV485);
      gpsApplyLocationDoneV495 = true;
      pushGpsDebugLogV492(`useOwnLocation applyLocation done`);

      if (source === "manual") {
        gpsManualSuccessCoordsRefV485.current = nextGpsCoordsV485;
        gpsManualSuccessGuardUntilRefV485.current = Date.now() + 30000;
      }

      if (isBootGpsRunV472) {
        ziiplyGpsBootSucceededV472 = true;
      }
    } catch (error) {
      pushGpsDebugLogV492(`useOwnLocation CATCH code=${String((error as any)?.code ?? "?")}`);
      console.error(error);
      const gpsErrorCode =
        typeof error === "object" && error !== null && "code" in error
          ? Number((error as { code?: number }).code)
          : 0;
      if (gpsErrorCode === 1) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 2) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 3) {
        setGpsErrorMessage("GPS ei löydy");
      } else {
        setGpsErrorMessage("GPS ei löydy");
      }
      setLocationMessage("GPS ei löydy");
      setLocationMessageVisible(true);
      gpsUserDisabledRefV306.current = true;
      gpsManualSuccessGuardUntilRefV485.current = 0;
      gpsManualSuccessCoordsRefV485.current = null;
      setUsingOwnLocation(false);
      setStoreSearchLoading(false);
    } finally {
      pushGpsDebugLogV492(`useOwnLocation FINALLY`);
      const finishedAt = Date.now();
      gpsLastFinishedAtRefV466.current = finishedAt;
      ziiplyGpsHardLastFinishedAtV469 = finishedAt;
      if (gpsFailTimerRefV391.current) {
        window.clearTimeout(gpsFailTimerRefV391.current);
        gpsFailTimerRefV391.current = null;
      }
      if (gpsWindowLockV470) {
        gpsWindowLockV470.lastFinishedAt = finishedAt;
        gpsWindowLockV470.inFlight = false;
      }
      gpsSearchInFlightRefV465.current = false;
      ziiplyGpsHardInFlightV469 = false;

      // V495_GPS_SUCCESS_UI_RELEASE:
      // Lokin mukaan GPS-startti ei enää tuplaannu, mutta UI voi jäädä näyttämään
      // vanhaa pending-tilaa. Jos GPS + kauppahaku valmistuivat, vapautetaan tila
      // vielä lopuksi eksplisiittisesti onnistuneeksi.
      if (gpsApplyLocationDoneV495 && gpsResolvedCityV495) {
        pushGpsDebugLogV492(`useOwnLocation success UI release city=${gpsResolvedCityV495}`);
        setGpsErrorMessage("");
        setUsingOwnLocation(true);
        if (gpsResolvedCoordsV495) setGpsCoordsV320(gpsResolvedCoordsV495);
        setStoreSearchLoading(false);
        setGpsStorePickerBlockedV382(false);
        setLocationInput("");
        setLocationMessage(`${gpsResolvedCityV495} käytössä`);
        setLocationMessageVisible(true);
      } else {
        setStoreSearchLoading(false);
      }

      setGpsBootReadyV473(true);
      if (gpsBootWatchdogRefV483.current) {
        window.clearTimeout(gpsBootWatchdogRefV483.current);
        gpsBootWatchdogRefV483.current = null;
      }
      window.setTimeout(() => {
        setGpsStorePickerBlockedV382(false);
      }, 180);
    }
  }

  // V480_NO_OWN_GPS_BOOT_MANUAL_ONLY:
  // Oma sovellus EI käynnistä GPS-paikannusta reloadissa/startissa.
  // Tämä poistaa vanhan fallback/autostart-polun, joka pakotti GPS:n päälle avauksessa.
  // Manuaalinen GPS-nappi käyttää edelleen useOwnLocation("manual") ja toimii normaalisti.
  useEffect(() => {
    pushGpsDebugLogV492("boot init effect ENTRY");
    gpsInitialSearchStartedRefV465.current = true;
    // Boot saa tehdä yhden viivästetyn yrityksen, mutta usingOwnLocation pysyy
    // false ennen varsinaista GPS-ajoa. Käyttäjän GPS-pois-nappi asettaa tämän trueksi.
    gpsUserDisabledRefV306.current = false;
    gpsInitialVisiblePhaseRefV391.current = false;
    setUsingOwnLocation(false);
    setGpsErrorMessage("");
    setGpsBootReadyV473(true);
  }, []);

  // V490_BOOT_GPS_SINGLE_SESSION_START:
  // Avauksessa/reloadissa saa syntyä vain yksi automaattinen GPS-startti koko selainikkunassa.
  // React StrictMode / remount / korttien tilamuutokset eivät saa käynnistää toista starttia.
  // Manuaalinen GPS-nappi ei käytä tätä boot-lukkoa, joten se toimii edelleen päälle/pois.
  useEffect(() => {
    pushGpsDebugLogV492("boot gps effect ENTRY");
    const windowWithZiiplyGps = window as typeof window & {
      __ziiplyBootGpsStartedV490?: boolean;
    };

    if (windowWithZiiplyGps.__ziiplyBootGpsStartedV490) {
      pushGpsDebugLogV492("boot gps effect BLOCKED window boot already started");
      setGpsBootReadyV473(true);
      return;
    }

    windowWithZiiplyGps.__ziiplyBootGpsStartedV490 = true;

    if (gpsBootTimerRefV483.current) {
      window.clearTimeout(gpsBootTimerRefV483.current);
      gpsBootTimerRefV483.current = null;
    }
    if (gpsBootWatchdogRefV483.current) {
      window.clearTimeout(gpsBootWatchdogRefV483.current);
      gpsBootWatchdogRefV483.current = null;
    }

    setStoreSearchLoading(false);
    setGpsStorePickerBlockedV382(false);
    setGpsBootReadyV473(false);
    gpsUserDisabledRefV306.current = false;

    gpsBootTimerRefV483.current = window.setTimeout(() => {
      pushGpsDebugLogV492("boot gps timer FIRED");
      gpsBootTimerRefV483.current = null;
      if (gpsUserDisabledRefV306.current || gpsCoordsV320 || gpsSearchInFlightRefV465.current) {
        pushGpsDebugLogV492(`boot gps timer BLOCKED disabled=${String(gpsUserDisabledRefV306.current)} coords=${gpsCoordsV320 ? "yes" : "no"} inFlight=${String(gpsSearchInFlightRefV465.current)}`);
        setGpsBootReadyV473(true);
        return;
      }
      void useOwnLocation("boot");
    }, 450);

    return () => {
      if (gpsBootTimerRefV483.current) {
        window.clearTimeout(gpsBootTimerRefV483.current);
        gpsBootTimerRefV483.current = null;
      }
      if (gpsBootWatchdogRefV483.current) {
        window.clearTimeout(gpsBootWatchdogRefV483.current);
        gpsBootWatchdogRefV483.current = null;
      }
    };
  }, []);

  async function searchOffers(termOverride?: string) {
    const useTerms = termOverride ? parseTerms(termOverride) : terms;

    if (useTerms.length === 0) {
      setHasSearchedOffers(false);
      setOffers([]);
      setActiveResult("none");
      return;
    }

    if (!hasActiveStores) {
      setLocationMessage(
        "Hae ensin alue tai käytä omaa sijaintia, jotta kaupat voidaan valita.",
      );
      setHasSearchedOffers(false);
      setOffers([]);
      setActiveResult("none");
      return;
    }

    const isMainOfferSearch = !termOverride;
    const offerQuerySnapshot = useTerms.join(", ").trim() || String(termOverride || input).trim();
    setOfferSearchQuerySnapshot(offerQuerySnapshot);

    trackZiiplyEvent("offers_search_used", {
      query: useTerms.join(", "),
      termCount: useTerms.length,
      isMainSearch: isMainOfferSearch,
      cartItemsCount: cart.length,
      storeMode,
      sStoreName: activeStores.sStoreName,
      kStoreName: activeStores.kStoreName,
    });

    if (termOverride) setInput(termOverride);

    // Uusi hinnanhuojennushaku ei enää tyhjennä ostoskoria. Käyttäjä voi lisätä tuotteita nykyiseen koriin.
    if (isMainOfferSearch && cart.length > 0) {
      setSMatches({});
      setKMatches({});
      setLastOptimizationSnapshot(null);
    }

    setLoadingOffers(true);
    setHasSearchedOffers(true);
    setActiveResult("offers");

    try {
      const [sRes, kRes] = await Promise.all([
        fetch(`/api/offers?storeId=${activeStores.sStoreId}`, {
          cache: "no-store",
        }),
        fetch(`/api/offers?storeId=${activeStores.kStoreId}`, {
          cache: "no-store",
        }),
      ]);

      const sData = await sRes.json();
      const kData = await kRes.json();

      const sItems: ZiiplyOffer[] = (sData.items || []).map((offer: Offer) => ({
        id: `S-${offer.id}`,
        chain: "S",
        storeName: activeStores.sStoreName,
        offer,
      }));

      const kItems: ZiiplyOffer[] = (kData.items || []).map((offer: Offer) => ({
        id: `K-${offer.id}`,
        chain: "K",
        storeName: activeStores.kStoreName,
        offer,
      }));

      setOffers([...sItems, ...kItems]);
      setOfferSearchDoneForQuery(offerQuerySnapshot);
    } catch (error) {
      pushGpsDebugLogV492(`useOwnLocation CATCH code=${String((error as any)?.code ?? "?")}`);
      console.error(error);
      const gpsErrorCode =
        typeof error === "object" && error !== null && "code" in error
          ? Number((error as { code?: number }).code)
          : 0;
      if (gpsErrorCode === 1) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 2) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 3) {
        setGpsErrorMessage("GPS ei löydy");
      } else {
        setGpsErrorMessage("GPS ei löydy");
      }
      setOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  }

  async function searchNormalPrices(termOverride?: string, forceEan = false) {
    const useTerms = termOverride
      ? searchCompareMode === "single"
        ? [getSingleSearchTerm(termOverride)].filter(Boolean)
        : parseTerms(termOverride)
      : searchCompareMode === "single"
        ? [getSingleSearchTerm(input)].filter(Boolean)
        : terms;
    if (useTerms.length === 0) {
      setActiveNormalSearchTerm("");
      setNormalSearchAttempted(false);
      return;
    }

    if (!hasActiveStores) {
      setLocationMessage(
        "Hae ensin alue tai käytä omaa sijaintia, jotta kaupat voidaan valita.",
      );
      setActiveNormalSearchTerm("");
      setNormalResults([]);
      setNormalSearchAttempted(false);
      return;
    }

    const isMainSearch = !termOverride;
    const focusedSearchTerms = useTerms.length > 1 ? [useTerms[0]] : useTerms;

    if (focusedSearchTerms.every(isLowSignalProductSearchTerm)) {
      if (termOverride) setInput(termOverride);
      setLoadingNormal(false);
      setNormalSearchAttempted(true);
      setSearchDebug([]);
      setVisibleNormalCount(8);
      setActiveNormalSearchTerm(focusedSearchTerms[0] || "");
      setNormalResults([]);
      setMobileResultsReadyQueryV537("");
      setActiveResult("none");
      setSearchPanelOpen(true);
      return;
    }

    trackZiiplyEvent("search_used", {
      query: useTerms.join(", "),
      termCount: useTerms.length,
      focusedTerm: focusedSearchTerms[0] || "",
      queuedTermCount: Math.max(0, useTerms.length - focusedSearchTerms.length),
      isMainSearch,
      forceEan,
      cartItemsCount: cart.length,
      storeMode,
      sStoreName: activeStores.sStoreName,
      kStoreName: activeStores.kStoreName,
    });

    if (termOverride) setInput(termOverride);

    if (isMainSearch) {
      // Uusi Hae-haku ei enää tyhjennä ostoskoria. Vain vanhat vertailuosumat nollataan,
      // jotta seuraava vertailu rakennetaan nykyisen korin ja uusien hakutulosten pohjalta.
      setSMatches({});
      setKMatches({});
      setLastOptimizationSnapshot(null);
    }

    // V537: uusi haku ei saa näyttää vanhoja hakutuloksia eikä avata tuloskorttia ennen uusia osumia.
    setNormalResults([]);
    setMobileResultsReadyQueryV537("");
    setLoadingNormal(true);
    setNormalSearchAttempted(true);
    setSearchDebug([]);
    setVisibleNormalCount(8);
    if (isMainSearch) setNotFoundSearchTerms([]);
    setActiveNormalSearchTerm(focusedSearchTerms[0] || "");
    // Normaali haku avaa hakutulosten valintanäkymän, ei korivertailua.
    // Korivertailu avataan vain Vertailu-tabista tai ostoslistatoiminnoista.
    setActiveResult("none");

    const debugEntries: SearchDebugEntry[] = [];

    try {
      const all: Product[] = [];

      for (const term of focusedSearchTerms) {
        // Normaali haku on S-first: haetaan S-tuote ensin /api/s-products-routesta.
        // Monen tuotteen haussa näytetään vain seuraavan jonossa olevan tuotteen kandidaatit.
        // Näin "maito, kahvi, cola" käyttää samaa relevance-logiikkaa kuin yksittäinen haku:
        // valitse maito -> valitse kahvi -> valitse cola.
        // K-vastine haetaan vasta ostoskori-/vertailuvaiheessa.
        const searchQueries = getNormalSearchQueries(term).slice(0, 8);

        for (const searchQuery of searchQueries) {
          let rawItems: Product[] = await fetchSProducts(
            searchQuery,
            activeStores.sStoreId,
          );
          let usedStoreName = activeStores.sStoreName;
          let fallbackStoreName = "";

          if (rawItems.length === 0 && shouldUseLocalFallback("S")) {
            if (activeArea.sStoreId)
              rawItems = await fetchSProducts(searchQuery, activeArea.sStoreId);
            fallbackStoreName = activeArea.sStoreName || "S-tavaratalo";
            usedStoreName = activeArea.sStoreName || "S-tavaratalo";
          }

          const pricedItems = rawItems.filter(
            (product: Product) => getProductPrice(product) > 0,
          );
          const eggLockedSearch =
            detectSearchIntent(term).category === "egg" ||
            isEggSearchTerm(term) ||
            isEggSearchTerm(searchQuery);
          const normalFiltered = pricedItems
            .filter(
              (product: Product) => !isBadNormalResult(product, searchQuery),
            )
            .filter(
              (product: Product) =>
                !eggLockedSearch || isClearlyEggProduct(product.name),
            );

          // Fail-open pidetään vain yleisissä hauissa. Kananmunahaussa se aiheutti sen,
          // että "kananmunaton pasta" palasi tuloksiin, jos kaikki aidot osumat putosivat.
          const safeItems = eggLockedSearch
            ? normalFiltered
            : normalFiltered.length > 0
              ? normalFiltered
              : pricedItems;

          const finalItems = rankNormalSearchResults(searchQuery, safeItems)
            .slice(0, 40)
            .map((product) => {
              const withMeta = {
                ...product,
                originalSearchTerm: term,
                usedSearchQuery: searchQuery,
                fallbackStoreName: fallbackStoreName || undefined,
              } as Product & {
                originalSearchTerm?: string;
                usedSearchQuery?: string;
                fallbackStoreName?: string;
              };

              return withMeta;
            });

          debugEntries.push({
            term,
            query: searchQuery,
            storeName: usedStoreName,
            rawCount: rawItems.length,
            pricedCount: pricedItems.length,
            badFilterCount: normalFiltered.length,
            safeCount: safeItems.length,
            finalCount: finalItems.length,
            rejectedByPrice: rawItems.length - pricedItems.length,
            rejectedByBadFilter: pricedItems.length - normalFiltered.length,
            fallbackStoreName: fallbackStoreName || undefined,
          });

          all.push(...finalItems);
        }
      }

      const unique = Array.from(
        new Map(all.map((item) => [item.id, item])).values(),
      )
        .filter((item) => {
          const originalQuery =
            (item as Product & { originalSearchTerm?: string })
              .originalSearchTerm ||
            useTerms[0] ||
            "";
          if (
            detectSearchIntent(originalQuery).category === "egg" ||
            isEggSearchTerm(originalQuery)
          ) {
            return isClearlyEggProduct(item.name);
          }
          if (!normalize(originalQuery).includes("jauheliha")) return true;
          return normalize(`${item.name} ${item.category || ""}`).includes(
            "jauheliha",
          );
        })
        .sort((a, b) => {
          const aOriginalQuery =
            (a as Product & { originalSearchTerm?: string })
              .originalSearchTerm ||
            useTerms[0] ||
            "";
          const bOriginalQuery =
            (b as Product & { originalSearchTerm?: string })
              .originalSearchTerm ||
            useTerms[0] ||
            "";
          const directNameDifference =
            scoreDirectQueryNameMatch(bOriginalQuery, b.name) -
            scoreDirectQueryNameMatch(aOriginalQuery, a.name);

          if (Math.abs(directNameDifference) > 12) return directNameDifference;

          return (
            scoreNormalSResult(bOriginalQuery, b) -
            scoreNormalSResult(aOriginalQuery, a)
          );
        });

      setEanCache((prev) => {
        const next = { ...prev };

        for (const item of unique) {
          const ean = normalizeEan(item.ean);

          if (isUsableEan(ean)) {
            next[ean] = item.name;
          }
        }

        return next;
      });

      setSearchDebug(debugEntries);
      setNormalResults(unique);
      setMobileResultsReadyQueryV537(unique.length > 0 ? focusedSearchTerms[0] || useTerms[0] || "" : "");

      if (unique.length === 0) {
        const missingTerm = focusedSearchTerms[0] || useTerms[0] || "";
        if (missingTerm) {
          setNotFoundSearchTerms((current) =>
            current.includes(missingTerm) ? current : [...current, missingTerm],
          );
        }

        const remainingTerms = useTerms.slice(focusedSearchTerms.length);
        if (remainingTerms.length > 0) {
          const remainingInput = remainingTerms.join(", ");
          setInput(remainingInput);
          window.setTimeout(() => {
            void searchNormalPrices(remainingInput);
          }, 80);
          return;
        }
      }

      if (unique.length === 0 && isMainSearch) {
        setSearchPanelOpen(true);
      }
    } catch (error) {
      pushGpsDebugLogV492(`useOwnLocation CATCH code=${String((error as any)?.code ?? "?")}`);
      console.error(error);
      const gpsErrorCode =
        typeof error === "object" && error !== null && "code" in error
          ? Number((error as { code?: number }).code)
          : 0;
      if (gpsErrorCode === 1) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 2) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 3) {
        setGpsErrorMessage("GPS ei löydy");
      } else {
        setGpsErrorMessage("GPS ei löydy");
      }
      setSearchDebug(debugEntries);
      setNormalResults([]);
      setMobileResultsReadyQueryV537("");
      if (isMainSearch) {
        setSearchPanelOpen(true);
      }
    } finally {
      setLoadingNormal(false);
    }
  }

  function shouldKeepSearchingKOwnBrand(query: string, candidate?: KProduct) {
    if (!candidate) return true;
    if (!isValueBrandProduct(query)) return false;
    if (isKOwnBrandProduct(candidate.name)) return false;

    // Jos haetaan private label -vastinetta, älä pysähdy premiumiin liian aikaisin.
    return isPremiumBrandProduct(candidate.name);
  }

  async function findBestKMatchForStore(
    query: string,
    storeId: number,
    ean?: string,
  ) {
    let fallbackCandidate: KProduct | undefined;

    for (const searchTerm of getKSearchTerms(query)) {
      const items = await fetchKProducts(searchTerm, storeId);
      const candidate = pickBestKProduct(items, query, ean);

      if (!candidate) continue;

      if (isValueBrandProduct(query)) {
        if (isKOwnBrandProduct(candidate.name)) return candidate;

        if (!fallbackCandidate) fallbackCandidate = candidate;

        if (shouldKeepSearchingKOwnBrand(query, candidate)) {
          continue;
        }
      }

      return candidate;
    }

    return fallbackCandidate;
  }

  async function updateChainComparison(
    nextCart = cart,
    options: { openCompare?: boolean } = {},
  ) {
    const shouldOpenCompare = options.openCompare !== false;

    trackZiiplyEvent("comparison_opened", {
      cartItemsCount: nextCart.length,
      totalQuantity: nextCart.reduce((sum, item) => sum + item.quantity, 0),
      storeMode,
      sStoreName: activeStores.sStoreName,
      kStoreName: activeStores.kStoreName,
    });

    setComparisonLoading(true);
    if (shouldOpenCompare) setActiveResult("compare");

    try {
      const nextSMatches: Record<string, Match> = {};
      const nextKMatches: Record<string, Match> = {};

      await Promise.all(
        nextCart.map(async (item) => {
          if (item.chain === "S" && item.price && item.product) {
            nextSMatches[item.id] = {
              product: item.product,
              price: item.price,
              quantity: item.quantity,
              matchType: "ean",
              cartItemId: item.id,
            };
          } else {
            try {
              let items = await fetchSProducts(
                item.name,
                activeStores.sStoreId,
              );
              let best = pickBestSProduct(items, item.name, item.ean);
              let fallbackStoreName = "";

              if (!best && shouldUseLocalFallback("S")) {
                if (activeArea.sStoreId)
                  items = await fetchSProducts(item.name, activeArea.sStoreId);
                best = pickBestSProduct(items, item.name, item.ean);
                fallbackStoreName =
                  activeArea.sStoreName ||
                  activeStores.sStoreName ||
                  "S-kauppa";
              }

              if (best) {
                nextSMatches[item.id] = {
                  product: best,
                  price: getProductPrice(best),
                  quantity: item.quantity,
                  matchType: best.ean && item.ean === best.ean ? "ean" : "name",
                  fallbackStoreName: fallbackStoreName || undefined,
                  cartItemId: item.id,
                };
              }
            } catch {}
          }

          if (item.chain === "K" && item.price && item.product) {
            nextKMatches[item.id] = {
              product: item.product,
              price: item.price,
              quantity: item.quantity,
              matchType: "ean",
              cartItemId: item.id,
            };
          } else {
            try {
              let best: KProduct | undefined;
              let fallbackStoreName = "";

              best = await findBestKMatchForStore(
                item.name,
                activeStores.kStoreId,
                item.ean,
              );

              if (!best && shouldUseLocalFallback("K")) {
                if (activeArea.kStoreId)
                  best = await findBestKMatchForStore(
                    item.name,
                    activeArea.kStoreId,
                    item.ean,
                  );

                if (best) {
                  fallbackStoreName =
                    activeArea.kStoreName ||
                    activeStores.kStoreName ||
                    "K-kauppa";
                }
              }

              if (best) {
                const product = convertKProductToProduct(best);
                nextKMatches[item.id] = {
                  product: { ...product, ean: best.ean },
                  price: best.price,
                  quantity: item.quantity,
                  matchType: best.ean && item.ean === best.ean ? "ean" : "name",
                  fallbackStoreName: fallbackStoreName || undefined,
                  cartItemId: item.id,
                };
              }
            } catch {}
          }
        }),
      );

      setSMatches(nextSMatches);
      setKMatches(nextKMatches);
    } finally {
      setComparisonLoading(false);
    }
  }

  useEffect(() => {
    if (cart.length === 0 || !hasActiveStores) {
      if (cart.length === 0) {
        setSMatches({});
        setKMatches({});
      }
      return;
    }

    const timer = window.setTimeout(() => {
      void updateChainComparison(cart, { openCompare: false });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    cart,
    hasActiveStores,
    activeStores.sStoreId,
    activeStores.kStoreId,
    activeStores.sStoreName,
    activeStores.kStoreName,
    storeMode,
    storeCompareScope,
    withinChain,
  ]);

  function addOfferToCart(item: ZiiplyOffer) {
    setJustAdded(item.id);
    setTimeout(() => setJustAdded(null), 1200);

    if (cart.length >= MAX_ITEMS) {
      alert(`Demossa ostoskori on rajattu ${MAX_ITEMS} tuotteeseen.`);
      return;
    }

    const name = fixText(item.offer.item.name);
    if (cart.some((x) => normalize(x.name) === normalize(name))) return;

    const product = offerToProduct(item);
    const newItem: CartItem = {
      id: item.id,
      name,
      price: item.offer.storeItem?.price || 0,
      image: item.offer.item.pictureUrl,
      chain: item.chain,
      storeName: item.storeName,
      quantity: 1,
      source: "offer",
      product,
    };

    const nextCart = [...cart, newItem];
    setCart(nextCart);
    persistCartImmediately(nextCart);
    showCartToast(`Lisätty ostoskoriin: ${name}`);
    void updateChainComparison(nextCart, { openCompare: false });
  }

  function loadHtml5QrCodeScript() {
    return new Promise<any>((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Html5Qrcode can only be loaded in browser"));
        return;
      }

      if ((window as any).Html5Qrcode) {
        resolve((window as any).Html5Qrcode);
        return;
      }

      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${HTML5_QRCODE_SCRIPT_URL}"]`,
      );

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => resolve((window as any).Html5Qrcode),
          { once: true },
        );
        existingScript.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = HTML5_QRCODE_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve((window as any).Html5Qrcode);
      script.onerror = () => reject(new Error("Html5Qrcode loading failed"));
      document.body.appendChild(script);
    });
  }

  function finishScannedEan(code: string) {
    const normalizedCode = normalizeEan(code);
    if (!isUsableEan(normalizedCode)) return;

    const now = Date.now();
    const previous = lastContinuousScanRef.current;

    // V598: sama kameraruudussa pysyvä EAN saa aiheuttaa vain yhden tunnistuksen,
    // yhden piipin ja yhden haun lukitusajan sisällä.
    // Tämä estää jatkuvan taustapiippauksen, kun kamera tunnistaa samaa koodia
    // useasta peräkkäisestä framesta.
    if (
      previous?.code === normalizedCode &&
      now - previous.at < SAME_EAN_RESCAN_LOCK_MS
    ) {
      return;
    }

    lastContinuousScanRef.current = { code: normalizedCode, at: now };
    resetPendingEanPickCardV606();

    // Piip soitetaan vasta hyväksytylle uudelle lukutapahtumalle.
    // Ei enää ennen sama-EAN-lukkoa.
    playScannerBarcodeFoundBeepV582(normalizedCode);

    if (eanAutoSearchTimeoutRef.current) {
      window.clearTimeout(eanAutoSearchTimeoutRef.current);
      eanAutoSearchTimeoutRef.current = null;
    }

    triggerHaptic();
    setEanInput(normalizedCode);
    setLastAutoEanSearch(normalizedCode);
    setEanSearchStartedAutomatically(true);
    eanAutoSearchActiveRef.current = true;
    setEanScannerOpen(true);
    setEanScannerMessage("");
    setEanMessage(`Skannattu EAN: ${normalizedCode}. Haetaan...`);
    void searchByEan(normalizedCode);
  }

  async function toggleScannerTorch() {
    try {
      const track = getScannerVideoTrack();
      if (!track) {
        setEanScannerMessage(
          "Valoa voi kokeilla vasta, kun kamera on käynnissä.",
        );
        return;
      }

      const capabilities =
        typeof track.getCapabilities === "function"
          ? (track.getCapabilities() as any)
          : {};
      if (!capabilities.torch) {
        setEanScannerMessage(
          "Tämä selain tai kamera ei tue taskuvaloa. Hyvä yleisvalo toimii yleensä paremmin.",
        );
        return;
      }

      const nextTorchState = !scannerTorchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextTorchState }],
      } as any);
      setScannerTorchOn(nextTorchState);
      setEanScannerMessage(
        nextTorchState
          ? "Valo päällä kokeiluna. Jos pakkaus heijastaa, sammuta valo."
          : "Valo pois päältä.",
      );
    } catch {
      setEanScannerMessage("Taskuvaloa ei saatu vaihdettua tässä selaimessa.");
    }
  }

  async function stopEanCameraScanner(
    options: { keepScannerOpenState?: boolean } = {},
  ) {
    const scanner = eanHtml5ScannerRef.current;
    eanHtml5ScannerRef.current = null;
    lastContinuousScanRef.current = null;
    resetPendingEanPickCardV606();
    setScannerTorchOn(false);

    if (scanner && !eanScannerStoppingRef.current) {
      eanScannerStoppingRef.current = true;

      try {
        await scanner.stop();
      } catch {}

      try {
        await scanner.clear();
      } catch {}

      eanScannerStoppingRef.current = false;
    }

    if (!options.keepScannerOpenState) {
      setEanScannerOpen(false);
    }
  }

  async function startEanCameraScanner() {
    if (typeof window === "undefined" || typeof navigator === "undefined")
      return;

    if (!window.isSecureContext) {
      setEanScannerMessage(
        "Kamera toimii vain HTTPS-osoitteessa. Avaa Ziiply Vercelin live-osoitteesta.",
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setEanScannerMessage("Kamera ei ole käytettävissä tässä ympäristössä.");
      return;
    }

    try {
      await stopEanCameraScanner();
      setEanScannerOpen(true);
      setEanScannerMessage("");

      const Html5Qrcode = await loadHtml5QrCodeScript();

      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() => resolve()),
      );

      const isMobileScannerViewport =
        window.matchMedia?.("(max-width: 767px)").matches ?? false;

      const preferredScannerRegionId = isMobileScannerViewport
        ? MOBILE_EAN_SCANNER_REGION_ID
        : EAN_SCANNER_REGION_ID;

      const waitForScannerRegion = async (regionId: string) => {
        for (let attempt = 0; attempt < 16; attempt += 1) {
          const element = document.getElementById(regionId);
          if (element) return element;

          await new Promise<void>((resolve) =>
            window.requestAnimationFrame(() => resolve()),
          );
        }

        return null;
      };

      // V576: mobiilissa EI fallbackata desktopin EAN_SCANNER_REGION_ID-diviin.
      // Muuten kamera voi käynnistyä piilossa olevaan vanhaan/desktop-mounttiin,
      // jolloin iOS näyttää kameran olevan päällä mutta video ei näy kortissa.
      const scannerElement = isMobileScannerViewport
        ? await waitForScannerRegion(MOBILE_EAN_SCANNER_REGION_ID)
        : (await waitForScannerRegion(EAN_SCANNER_REGION_ID)) ||
          (await waitForScannerRegion(MOBILE_EAN_SCANNER_REGION_ID));

      const activeScannerRegionId =
        scannerElement?.id || preferredScannerRegionId;

      if (!scannerElement) {
        setEanScannerMessage(
          "Kameranäkymää ei saatu avattua. Sulje EAN-ikkuna ja yritä uudelleen.",
        );
        return;
      }

      scannerElement.innerHTML = "";

      const supportedFormats = (window as any).Html5QrcodeSupportedFormats;
      const formatsToSupport = supportedFormats
        ? [
            supportedFormats.EAN_13,
            supportedFormats.EAN_8,
            supportedFormats.UPC_A,
            supportedFormats.UPC_E,
          ].filter(Boolean)
        : undefined;

      const scanner = new Html5Qrcode(
        activeScannerRegionId,
        formatsToSupport ? { formatsToSupport } : undefined,
      );
      eanHtml5ScannerRef.current = scanner;

      setEanScannerMessage("");

      await scanner.start(
        {
          facingMode: { exact: "environment" },
        },
        {
          fps: 12,
          aspectRatio: 4 / 3,
          disableFlip: false,
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1440 },
            focusMode: "continuous",
            exposureMode: "continuous",
            whiteBalanceMode: "continuous",
            advanced: [
              { focusMode: "continuous" },
              { exposureMode: "continuous" },
              { whiteBalanceMode: "continuous" },
              { zoom: 1 },
            ],
          },
        },
        (decodedText: string) => {
          const code = normalizeEan(decodedText);
          if (isUsableEan(code)) finishScannedEan(code);
        },
        () => undefined,
      );

      window.requestAnimationFrame(() => {
        void (applyBestEffortScannerCameraTuning as any)(activeScannerRegionId);
      });
    } catch (error) {
      pushGpsDebugLogV492(`useOwnLocation CATCH code=${String((error as any)?.code ?? "?")}`);
      console.error(error);
      const gpsErrorCode =
        typeof error === "object" && error !== null && "code" in error
          ? Number((error as { code?: number }).code)
          : 0;
      if (gpsErrorCode === 1) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 2) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 3) {
        setGpsErrorMessage("GPS ei löydy");
      } else {
        setGpsErrorMessage("GPS ei löydy");
      }
      await stopEanCameraScanner();
      setEanScannerMessage(
        "Kameraa ei saatu avattua tai skanneri ei käynnistynyt. Tarkista kameran lupa ja yritä uudelleen.",
      );
    }
  }

  async function closeEanModal() {
    // v310: skanneri sulkeutuu pehmeällä haihtumisella.
    // Taustalle palautetaan Hae-kortti ensin, jonka jälkeen kamera-overlay
    // häivytetään pois riittävän hitaasti ilman layout-hyppyä.
    if (eanModalClosing) return;

    setSuppressUiForEanClose(true);
    setEanModalClosing(true);

    if (eanAutoSearchTimeoutRef.current) {
      window.clearTimeout(eanAutoSearchTimeoutRef.current);
      eanAutoSearchTimeoutRef.current = null;
    }

    setActiveResult("none");
    setCartModalOpen(false);
    setCartSavePanelOpen(false);
    setShopsPanelOpen(!storesReadyForSearch);
    setSearchPanelOpen(storesReadyForSearch);

    await new Promise<void>((resolve) =>
      window.requestAnimationFrame(() => resolve()),
    );
    await new Promise<void>((resolve) => window.setTimeout(resolve, 720));

    await stopEanCameraScanner({ keepScannerOpenState: true });

    setEanManualInputOpen(false);
    setEanInput("");
    setEanResults([]);
    setEanMessage("");
    setEanScannerMessage("");
    setEanLoading(false);
    eanSearchInFlightRef.current = null;
    setLastAutoEanSearch("");
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;

    setEanScannerOpen(false);
    setDesktopKeyboardScannerOpen(false);
    setEanModalOpen(false);
    setEanModalClosing(false);
    setSuppressUiForEanClose(false);
  }

  function openEanModal() {
    trackZiiplyEvent("barcode_scanner_opened", {
      cartItemsCount: cart.length,
    });

    if (eanModalOpen) {
      void closeEanModal();
      return;
    }

    setSearchPanelOpen(false);
    setCartModalOpen(false);
    setActiveResult("none");
    setEanModalClosing(false);
    setEanModalOpen(true);
    // Mobiilin SCAN-nappi avaa aina uuden ZiiplyMobileScannerCard-näkymän heti.
    // Kamera käynnistetään perässä, mutta renderi ei saa jäädä riippumaan
    // startEanCameraScannerin asynkronisesta onnistumisesta.
    setEanScannerOpen(true);
    setDesktopKeyboardScannerOpen(false);
    setEanManualInputOpen(false);
    setEanMessage("");
    setEanResults([]);
    setLastAutoEanSearch("");
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;

    // EAN / viivakoodi -napista avataan kamera suoraan.
    window.setTimeout(() => {
      void startEanCameraScanner();
    }, 120);
  }

  function openDesktopScanner() {
    // Desktopissa Skanneri-nappi avaa ensin valinnan:
    // 1) nykyinen kameraskanneri
    // 2) erillinen USB/Bluetooth-viivakoodinlukija, joka toimii näppäimistönä.
    // Mobiilin kameraskanneriflow'hun ei kosketa tässä.
    if (eanModalOpen) {
      void closeEanModal();
      return;
    }

    trackZiiplyEvent("desktop_scanner_selector_opened", {
      cartItemsCount: cart.length,
    });

    setSearchPanelOpen(false);
    setCartModalOpen(false);
    setCartSavePanelOpen(false);
    setShopsPanelOpen(false);
    setActiveResult("none");
    setEanModalClosing(false);
    setSuppressUiForEanClose(false);
    setEanModalOpen(true);
    setDesktopKeyboardScannerOpen(false);
    setEanScannerOpen(false);
    setEanManualInputOpen(false);
    setEanInput("");
    setEanMessage("");
    setEanResults([]);
    setEanScannerMessage("");
    setLastAutoEanSearch("");
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;
  }

  function openDesktopCameraScanner() {
    trackZiiplyEvent("desktop_camera_scanner_opened", {
      cartItemsCount: cart.length,
    });

    setDesktopKeyboardScannerOpen(false);
    setEanManualInputOpen(false);
    setEanInput("");
    setEanMessage("");
    setEanResults([]);
    setLastAutoEanSearch("");
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;
    setEanScannerMessage("");
    setEanScannerOpen(true);

    window.setTimeout(() => {
      void startEanCameraScanner();
    }, 120);
  }

  function openDesktopKeyboardScanner() {
    trackZiiplyEvent("desktop_barcode_reader_opened", {
      cartItemsCount: cart.length,
    });

    setDesktopKeyboardScannerOpen(true);
    setEanScannerOpen(false);
    setEanManualInputOpen(true);
    setEanInput("");
    setEanMessage("");
    setEanResults([]);
    setLastAutoEanSearch("");
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;
    setEanScannerMessage(
      "Skannaa viivakoodi USB- tai Bluetooth-lukijalla. Lukija kirjoittaa EAN-koodin tähän kenttään ja lähettää yleensä Enterin lopuksi.",
    );

    window.setTimeout(() => {
      eanInputRef.current?.focus();
    }, 80);
  }

  function clearEanSearch() {
    setEanInput("");
    resetPendingEanPickCardV606();

    window.setTimeout(() => {
      eanInputRef.current?.focus();
    }, 0);
  }

  async function searchByEan(eanOverride?: string) {
    const ean = normalizeEan(eanOverride ?? eanInput);

    if (!isUsableEan(ean)) {
      setEanMessage("Syötä 8–14 numeron EAN-koodi.");
      setEanResults([]);
      return;
    }

    if (eanSearchInFlightRef.current === ean) return;

    // V594: skanneri soittaa piipin jo tunnistustapahtumassa finishScannedEan()-kohdassa.
    // Tämä varmistus jää käsin käynnistettyyn EAN-hakuun, mutta ei tuplapiippaa skannerilta tullutta hakua.
    if (Date.now() - lastScannerBeepAtRefV594.current > 350) {
      playScannerBarcodeFoundBeepV582(ean);
    }

    trackZiiplyEvent("barcode_search_used", {
      ean,
      cartItemsCount: cart.length,
    });

    eanSearchInFlightRef.current = ean;
    setEanLoading(true);
    setEanMessage("");
    setEanScannerMessage("");
    setEanResults([]);

    try {
      const variants = getEanSearchVariants(ean);

      const cachedName =
        variants.map((variant) => eanCache[variant]).find(Boolean) ||
        eanCache[ean];

      const externalNames = cachedName
        ? []
        : await fetchOpenFoodFactsNames(ean);
      const nameCandidates = Array.from(
        new Set([cachedName, ...externalNames].filter(Boolean) as string[]),
      );

      const exactResultsByKey = new Map<string, EanSearchResult>();

      // EAN-modalissa näytetään vain tarkat EAN-osumat.
      // Open Food Factsia ja cachea käytetään vain nimen löytämiseen,
      // jotta ruoanhinta.fi:n nimihaku palauttaa tuotteita, joiden EAN tarkistetaan vielä erikseen.
      for (const nameCandidate of nameCandidates) {
        const [sProducts, kProducts] = await Promise.all([
          fetchSProducts(nameCandidate, activeStores.sStoreId).catch(
            () => [] as Product[],
          ),
          fetchKProducts(nameCandidate, activeStores.kStoreId).catch(
            () => [] as KProduct[],
          ),
        ]);

        for (const product of sProducts) {
          if (getProductPrice(product) <= 0) continue;
          if (!isSameEan(product.ean, variants)) continue;

          exactResultsByKey.set(
            `S-${normalizeEan(product.ean)}-${product.id}`,
            {
              key: `S-ean-exact-${product.id}`,
              chain: "S" as const,
              storeName: activeStores.sStoreName,
              product,
              eanMatch: true,
            },
          );
        }

        for (const product of kProducts) {
          if (product.price <= 0) continue;
          if (!isSameEan(product.ean, variants)) continue;

          const converted = convertKProductToProduct(product);

          exactResultsByKey.set(
            `K-${normalizeEan(product.ean)}-${product.id}`,
            {
              key: `K-ean-exact-${product.id}`,
              chain: "K" as const,
              storeName: activeStores.kStoreName,
              product: {
                ...converted,
                ean: product.ean,
              },
              eanMatch: true,
            },
          );
        }
      }

      // Debug-varmistus: kokeillaan myös suoraa EAN-hakua, mutta hyväksytään vain tarkat EAN-osumat.
      const [sDirectGroups, kDirectGroups] = await Promise.all([
        Promise.all(
          variants.map((variant) =>
            fetchSProducts(variant, activeStores.sStoreId).catch(
              () => [] as Product[],
            ),
          ),
        ),
        Promise.all(
          variants.map((variant) =>
            fetchKProducts(variant, activeStores.kStoreId).catch(
              () => [] as KProduct[],
            ),
          ),
        ),
      ]);

      for (const product of sDirectGroups.flat()) {
        if (getProductPrice(product) <= 0) continue;
        if (!isSameEan(product.ean, variants)) continue;

        exactResultsByKey.set(`S-${normalizeEan(product.ean)}-${product.id}`, {
          key: `S-ean-direct-${product.id}`,
          chain: "S" as const,
          storeName: activeStores.sStoreName,
          product,
          eanMatch: true,
        });
      }

      for (const product of kDirectGroups.flat()) {
        if (product.price <= 0) continue;
        if (!isSameEan(product.ean, variants)) continue;

        const converted = convertKProductToProduct(product);

        exactResultsByKey.set(`K-${normalizeEan(product.ean)}-${product.id}`, {
          key: `K-ean-direct-${product.id}`,
          chain: "K" as const,
          storeName: activeStores.kStoreName,
          product: {
            ...converted,
            ean: product.ean,
          },
          eanMatch: true,
        });
      }

      const exactResults = Array.from(exactResultsByKey.values()).sort(
        (a, b) => getProductPrice(a.product) - getProductPrice(b.product),
      );

      if (exactResults.length > 0) {
        const cacheName = exactResults[0]?.product?.name;

        if (cacheName) {
          setEanCache((prev) => ({
            ...prev,
            [ean]: cacheName,
          }));
        }

        if (exactResults.length === 1 && eanAutoSearchActiveRef.current) {
          // Yksi tuote -tilassa skannaus toimii kuten tekstihaku: avaa vertailu,
          // ei lisää tuotetta suoraan ostoskoriin. Koko kori -tilassa säilyy vanha pikalisäys.
          if (searchCompareMode === "single") {
            await stopEanCameraScanner();
            await compareEanResultAsSingle(exactResults[0]);
          } else {
            // Automaattisen EAN-haun yhden täsmäosuman polku pidetään hiljaisena:
            // ei renderöidä välissä tuloskorttia, jotta EAN-ikkuna ei hypi.
            addEanResultToCart(exactResults[0]);
          }
        } else if (exactResults.length === 1) {
          if (eanScannerOpen || eanHtml5ScannerRef.current)
            showScanSuccessFlash();
          setEanResults(exactResults.slice(0, 8));
          setEanMessage("Löytyi 1 tarkka EAN-osuma.");
        } else {
          // V577: usean EAN-osuman kohdalla EI näytetä vihreää onnistumisvälähdystä.
          // Skannaus ei ole vielä valmis ennen kuin käyttäjä valitsee oikean tuotteen.
          // Valinta renderöidään mobiilissa suoraan kameraruudun päälle ScannerCardissa.
          setEanResults(exactResults.slice(0, 8));
          setEanMessage(
            `Löytyi ${exactResults.length} tarkkaa EAN-osumaa. Valitse lisättävä tuote.`,
          );
        }

        eanSearchInFlightRef.current = null;
        setEanSearchStartedAutomatically(false);
        eanAutoSearchActiveRef.current = false;
        return;
      }

      setEanResults([]);

      eanSearchInFlightRef.current = null;
      setEanSearchStartedAutomatically(false);
      eanAutoSearchActiveRef.current = false;

      if (eanScannerOpen || eanHtml5ScannerRef.current) {
        showScanMissFlash();
      }

      if (externalNames.length > 0) {
        setEanMessage(
          "Tuote tunnistettiin osittain, mutta valituista kaupoista ei löytynyt tarkkaa EAN-osumaa.",
        );
      } else {
        setEanMessage(
          "EAN-koodilla ei löytynyt tarkkaa tuotetta valituista kaupoista.",
        );
      }
    } catch (error) {
      pushGpsDebugLogV492(`useOwnLocation CATCH code=${String((error as any)?.code ?? "?")}`);
      console.error(error);
      const gpsErrorCode =
        typeof error === "object" && error !== null && "code" in error
          ? Number((error as { code?: number }).code)
          : 0;
      if (gpsErrorCode === 1) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 2) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 3) {
        setGpsErrorMessage("GPS ei löydy");
      } else {
        setGpsErrorMessage("GPS ei löydy");
      }
      setEanResults([]);
      setEanSearchStartedAutomatically(false);
      eanAutoSearchActiveRef.current = false;
      setEanMessage(
        "EAN-haku epäonnistui. Kokeile uudelleen tai käytä normaalia hakua.",
      );
    } finally {
      if (eanSearchInFlightRef.current === ean) {
        eanSearchInFlightRef.current = null;
      }
      setEanLoading(false);
    }
  }

  useEffect(() => {
    if (!eanModalOpen) return;

    const ean = normalizeEan(eanInput);

    if (eanAutoSearchTimeoutRef.current) {
      window.clearTimeout(eanAutoSearchTimeoutRef.current);
      eanAutoSearchTimeoutRef.current = null;
    }

    if (!ean) {
      setEanResults([]);
      setEanMessage("");
      setLastAutoEanSearch("");
      return;
    }

    // Älä näytä virhettä kesken kirjoittamisen. Haku käynnistyy vasta kun EAN on käyttökelpoinen.
    if (!isUsableEan(ean)) {
      setEanResults([]);
      if (eanMessage.startsWith("Syötä")) setEanMessage("");
      return;
    }

    if (ean === lastAutoEanSearch || eanLoading) return;

    const delay = ean.length >= 13 ? 300 : 650;

    // UI debounce / anti-duplicate protection
    eanAutoSearchTimeoutRef.current = window.setTimeout(() => {
      setLastAutoEanSearch(ean);
      setEanSearchStartedAutomatically(true);
      eanAutoSearchActiveRef.current = true;
      void searchByEan(ean);
    }, delay);

    return () => {
      if (eanAutoSearchTimeoutRef.current) {
        window.clearTimeout(eanAutoSearchTimeoutRef.current);
        eanAutoSearchTimeoutRef.current = null;
      }
    };
  }, [eanInput, eanModalOpen, eanLoading, lastAutoEanSearch, eanMessage]);

  async function compareEanResultAsSingle(result: EanSearchResult) {
    const selectedName = fixText(result.product.name);
    const selectedPrice = getProductPrice(result.product);

    if (!selectedName || selectedPrice <= 0 || singleProductCompareLoading)
      return;

    trackZiiplyEvent("single_product_selected_for_compare", {
      productName: selectedName,
      ean: result.product.ean,
      source: "barcode_scanner",
      chain: result.chain,
      storeMode,
      sStoreName: activeStores.sStoreName,
      kStoreName: activeStores.kStoreName,
    });

    setSearchPanelOpen(false);
    setCartModalOpen(false);
    setCartSavePanelOpen(false);
    setShopsPanelOpen(false);
    setEanModalOpen(false);
    setEanManualInputOpen(false);
    setEanResults([]);
    setEanInput("");
    setEanMessage("");
    setEanScannerMessage("");
    setLastAutoEanSearch("");
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;
    setNormalResults([]);
    setVisibleNormalCount(8);
    setActiveNormalSearchTerm("");
    setSingleProductCompareTerm(selectedName);
    setSingleProductCompareResults([]);
    setSingleProductCompareLoading(true);
    setActiveResult("singleCompare");

    try {
      const nextResults: SingleProductCompareResult[] = [
        {
          key: result.chain.toLowerCase() as "s" | "k",
          chain: result.chain === "S" ? "S-ryhmä" : "K-ryhmä",
          storeName: result.storeName,
          productName: selectedName,
          price: selectedPrice,
          ean: result.product.ean,
          image: result.product.pictureUrl,
          comparisonPrice: formatComparisonPrice(result.product),
        },
      ];

      try {
        if (result.chain === "S") {
          let kBest: KProduct | undefined;
          const selectedEan = normalizeEan(result.product.ean);

          for (const kSearchTerm of getKSearchTerms(selectedName)) {
            const kItems = await fetchKProducts(
              kSearchTerm,
              activeStores.kStoreId,
            );
            kBest = pickBestKProduct(kItems, selectedName, selectedEan);
            if (kBest && !shouldKeepSearchingKOwnBrand(selectedName, kBest))
              break;
          }

          if (kBest && kBest.price > 0) {
            nextResults.push({
              key: "k",
              chain: "K-ryhmä",
              storeName: activeStores.kStoreName,
              productName: fixText(kBest.name),
              price: kBest.price,
              ean: kBest.ean,
              image: kBest.pictureUrl,
              comparisonPrice: null,
            });
          }
        } else {
          let sBest: Product | undefined;
          const selectedEan = normalizeEan(result.product.ean);

          for (const sSearchTerm of getNormalSearchQueries(selectedName).slice(
            0,
            6,
          )) {
            const sItems = await fetchSProducts(
              sSearchTerm,
              activeStores.sStoreId,
            );
            sBest = pickBestSProduct(sItems, selectedName, selectedEan);
            if (sBest && getProductPrice(sBest) > 0) break;
          }

          if (sBest && getProductPrice(sBest) > 0) {
            nextResults.push({
              key: "s",
              chain: "S-ryhmä",
              storeName: activeStores.sStoreName,
              productName: fixText(sBest.name),
              price: getProductPrice(sBest),
              ean: sBest.ean,
              image: sBest.pictureUrl,
              comparisonPrice: formatComparisonPrice(sBest),
            });
          }
        }
      } catch {}

      setSingleProductCompareResults(
        nextResults.sort((a, b) => a.price - b.price),
      );
    } finally {
      setSingleProductCompareLoading(false);
      window.requestAnimationFrame(() => {
        compareOverlayScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
      });
    }
  }

  function addEanResultToCart(
    result: EanSearchResult,
    options: { showFlash?: boolean } = {},
  ) {
    const ean = normalizeEan(result.product.ean || eanInput);
    if (isUsableEan(ean)) {
      lastContinuousScanRef.current = { code: ean, at: Date.now() };
    }

    const productName = fixText(result.product.name);
    const addKey = `${result.chain}-${ean || normalize(productName)}-${result.product.id}`;
    const now = Date.now();

    // Estää saman EAN-osuman tupla-ajon, jos automaattihaku ja käyttäjän toiminto
    // ehtivät kutsua lisäystä lähes samaan aikaan.
    if (
      lastEanCartAddRef.current?.key === addKey &&
      now - lastEanCartAddRef.current.at < 2500
    ) {
      return;
    }

    lastEanCartAddRef.current = { key: addKey, at: now };

    trackZiiplyEvent("product_added_to_cart", {
      source: eanScannerOpen ? "barcode_scanner" : "ean_search",
      productName,
      ean: ean || result.product.ean,
      chain: result.chain,
      storeName: result.storeName,
      price: getProductPrice(result.product),
    });

    triggerHaptic();
    if (options.showFlash !== false) {
      showScanSuccessFlash();
    }

    let cartLimitReached = false;

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => {
        const itemEan = normalizeEan(item.ean || item.product?.ean);
        if (isUsableEan(ean) && itemEan === ean) return true;
        return normalize(item.name) === normalize(productName);
      });

      if (existingItem) {
        const nextCart = currentCart.map((item) =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );

        persistCartImmediately(nextCart);
        void updateChainComparison(nextCart, { openCompare: false });
        showCartToast(`Määrä +1: ${existingItem.name}`);
        return nextCart;
      }

      if (currentCart.length >= MAX_ITEMS) {
        cartLimitReached = true;
        return currentCart;
      }

      const newItem: CartItem = {
        id: `ean-${result.chain}-${result.product.id}-${Date.now()}`,
        name: productName,
        price: getProductPrice(result.product),
        image: result.product.pictureUrl,
        chain: result.chain,
        storeName: result.storeName,
        quantity: 1,
        source: "search",
        product: result.product,
        ean: ean || result.product.ean,
      };

      const nextCart = [...currentCart, newItem];
      persistCartImmediately(nextCart);
      void updateChainComparison(nextCart, { openCompare: false });
      showCartToast(`Lisätty: ${newItem.name}`);

      const normalizedEan = normalizeEan(newItem.ean);
      if (isUsableEan(normalizedEan)) {
        setEanCache((prev) => ({
          ...prev,
          [normalizedEan]: newItem.name,
        }));
      }

      return nextCart;
    });

    if (cartLimitReached) {
      alert(`Demossa ostoskori on rajattu ${MAX_ITEMS} tuotteeseen.`);
      return;
    }

    // EAN/skannerilisäys ei saa siirtää käyttäjää automaattisesti Vertailu-kortille.
    // Vertailu päivittyy taustalla ja avataan vain käyttäjän omasta Vertailu-napista.

    // Jätä EAN-ikkuna auki seuraavaa koodia/kameraskannausta varten.
    setEanInput("");
    setEanResults([]);
    setEanLoading(false);
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;
    setEanMessage("");
    if (eanScannerOpen || eanHtml5ScannerRef.current) {
      setEanScannerOpen(true);
      // V594: valintaikkunan kautta lisättäessä annetaan vain hiljainen, läpikuultava kuittaus.
      // Ei piippiä eikä vihreää flashia, koska varsinainen skannauspiip on annettu jo EAN-lukuhetkellä.
      setEanScannerMessage("Tuote lisätty");
      window.setTimeout(() => {
        setEanScannerMessage((current) =>
          current === "Tuote lisätty" ? "" : current,
        );
      }, 2200);
    }
    setLastAutoEanSearch("");

    window.setTimeout(() => {
      eanInputRef.current?.focus();
    }, 0);
  }

  function removeMatchingSearchTerm(product: Product) {
    const currentTerms = parseTerms(input);
    const productName = normalize(product.name);
    const looseProductName = normalizeLooseProductMatch(product.name);
    const originalSearchTerm = normalizeLooseProductMatch(
      (product as Product & { originalSearchTerm?: string })
        .originalSearchTerm || "",
    );

    const matchedTerm = currentTerms.find((term) => {
      const normalizedTerm = normalize(term);
      const looseTerm = normalizeLooseProductMatch(term);
      const normalizedSearchQuery = normalize(getSearchQuery(term));
      const looseSearchQuery = normalizeLooseProductMatch(getSearchQuery(term));

      // Jos hakutulos on tuotettu tietylle jonotermille, se termi poistetaan varmasti.
      // Tämä estää viimeisen moniosaisen haun kuten "tuore kala" jäämisen Hae-kortille.
      if (originalSearchTerm && looseTerm === originalSearchTerm) return true;

      // Jauheliha-haussa hakukysely voi tietoisesti hakea ydintermillä "jauheliha".
      const termIsGroundMeat = normalizedTerm.includes("jauheliha");
      const productIsGroundMeat = productName.includes("jauheliha");

      // Cola/limsa: koko voi olla muodossa "1,5L" tai "1,5 l".
      // Normalisoidaan koko ennen vertailua, jotta Coca Cola zero 1,5L poistuu jonosta.
      const termIsCola = isColaSearchTerm(term);
      const productIsCola = isClearlyColaProduct(product.name);
      const termSize = getMetricSizeKey(term);
      const productSize = getMetricSizeKey(product.name);
      const colaSizeMatches =
        !termSize || !productSize || termSize === productSize;

      return (
        normalizedTerm.length > 0 &&
        (productName.includes(normalizedTerm) ||
          productName.includes(normalizedSearchQuery) ||
          looseProductName.includes(looseTerm) ||
          looseProductName.includes(looseSearchQuery) ||
          (termIsGroundMeat && productIsGroundMeat) ||
          (termIsCola && productIsCola && colaSizeMatches))
      );
    });

    if (!matchedTerm) return currentTerms;

    return currentTerms.filter((term) => term !== matchedTerm);
  }

  function addProductToCart(product: Product) {
    const remainingTerms = removeMatchingSearchTerm(product);
    const matchedTerms = parseTerms(input).filter(
      (term) => !remainingTerms.includes(term),
    );
    const normalizedProductName = normalize(product.name);

    const cartWithoutMatchingManualRows = cart.filter((item) => {
      if (item.source !== "manual") return true;

      const normalizedItemName = normalize(item.name);

      const matchedBySearchTerm = matchedTerms.some((term) => {
        const normalizedTerm = normalize(term);
        return (
          normalizedTerm.length > 0 && normalizedItemName === normalizedTerm
        );
      });

      const matchedByProductName =
        normalizedItemName.length > 0 &&
        normalizedProductName.includes(normalizedItemName);

      return !matchedBySearchTerm && !matchedByProductName;
    });

    if (
      cartWithoutMatchingManualRows.some(
        (x) => normalize(x.name) === normalize(product.name),
      )
    ) {
      const nextInputForDuplicate = remainingTerms.join(",");
      setInput(nextInputForDuplicate);
      setNormalResults([]);
      setVisibleNormalCount(8);
      setActiveNormalSearchTerm("");

      if (remainingTerms.length > 0) {
        void searchNormalPrices(nextInputForDuplicate);
      } else {
        setNormalSearchAttempted(false);
        setSearchPanelOpen(true);
        setActiveResult("none");
      }

      return;
    }

    if (cartWithoutMatchingManualRows.length >= MAX_ITEMS) {
      alert(`Demossa ostoskori on rajattu ${MAX_ITEMS} tuotteeseen.`);
      return;
    }

    const newItem: CartItem = {
      id: `search-${product.id}`,
      name: fixText(product.name),
      price: getProductPrice(product),
      image: product.pictureUrl,
      chain: "S",
      storeName: activeStores.sStoreName,
      quantity: 1,
      source: "search",
      product,
      ean: product.ean,
    };

    const nextCart = [...cartWithoutMatchingManualRows, newItem];

    trackZiiplyEvent("product_added_to_cart", {
      source: "normal_search",
      productName: newItem.name,
      ean: newItem.ean,
      chain: newItem.chain,
      storeName: newItem.storeName,
      price: newItem.price,
      cartItemsCount: nextCart.length,
    });

    setCart(nextCart);
    showCartToast(`Lisätty ostoskoriin: ${newItem.name}`);
    void updateChainComparison(nextCart);

    const nextInput = remainingTerms.join(",");

    setInput(nextInput);

    if (remainingTerms.length > 0) {
      void searchNormalPrices(nextInput);
    } else {
      // Fast add flow: lisää tuote koriin ja pidä käyttäjä hakutilassa seuraavaa tuotetta varten.
      // Ei hypätä vertailuun eikä näytetä vertailukortteja tuotteen lisäämisen jälkeen.
      setInput("");
      setNormalResults([]);
      setNormalSearchAttempted(false);
      setVisibleNormalCount(8);
      setActiveNormalSearchTerm("");
      setSearchPanelOpen(true);
      setCartModalOpen(false);
      setCartSavePanelOpen(false);
      setEanModalOpen(false);
      setActiveResult("none");

      window.requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }

  function addSingleCompareResultToCart(result: SingleProductCompareResult) {
    if (!result.productName || !result.price || result.price <= 0) return;

    const normalizedResultName = normalize(result.productName);
    const resultEan = normalizeEan(result.ean);
    const alreadyInCart = cart.some((item) => {
      const itemEan = normalizeEan(item.ean || item.product?.ean);
      if (resultEan && itemEan && resultEan === itemEan) return true;
      return (
        normalize(item.name) === normalizedResultName &&
        item.chain === result.key.toUpperCase()
      );
    });

    if (alreadyInCart) {
      showCartToast("Tuote on jo ostoskorissa.");
      return;
    }

    if (cart.length >= MAX_ITEMS) {
      alert(`Demossa ostoskori on rajattu ${MAX_ITEMS} tuotteeseen.`);
      return;
    }

    const product: Product = {
      id: resultEan ? Number(resultEan.slice(-8)) || Date.now() : Date.now(),
      name: fixText(result.productName),
      ean: result.ean,
      pictureUrl: result.image,
      price: result.price,
      comparisonPriceUnit: result.comparisonPrice || undefined,
      storeItems: [{ price: result.price }],
    };

    const newItem: CartItem = {
      id: `single-compare-${result.key}-${resultEan || normalize(result.productName)}-${Date.now()}`,
      name: fixText(result.productName),
      price: result.price,
      image: result.image,
      chain: result.key.toUpperCase() as "S" | "K",
      storeName: result.storeName,
      quantity: 1,
      source: "search",
      product,
      ean: result.ean,
    };

    const nextCart = [...cart, newItem];

    trackZiiplyEvent("product_added_to_cart", {
      source: "single_product_compare",
      productName: newItem.name,
      ean: newItem.ean,
      chain: newItem.chain,
      storeName: newItem.storeName,
      price: newItem.price,
      cartItemsCount: nextCart.length,
    });

    setCart(nextCart);
    showCartToast(`Lisätty ostoskoriin: ${newItem.name}`);
    triggerHaptic();
    void updateChainComparison(nextCart, { openCompare: false });

    // Single-vertailusta koriin lisätty tuote ei saa jättää hakutermiä elämään taustalle.
    clearSingleSearchState();
    setSearchPanelOpen(true);
    setCartModalOpen(false);
    setCartSavePanelOpen(false);
    setEanModalOpen(false);
    setActiveResult("none");
  }

  function addInputToCart() {
    triggerHaptic();
    const rows = parseTerms(input);
    const uniqueRows = Array.from(
      new Map(rows.map((row) => [normalize(row), row])).values(),
    ).slice(0, MAX_ITEMS);

    if (uniqueRows.length === 0) {
      alert("Kirjoita ensin tuotteita hakukenttään.");
      return;
    }

    const existingNames = new Set(cart.map((item) => normalize(item.name)));
    const rowsToAdd = uniqueRows.filter(
      (row) => !existingNames.has(normalize(row)),
    );

    if (rowsToAdd.length === 0) {
      showCartToast("Nämä muistilistarivit ovat jo ostoskorissa");
      setSearchPanelOpen(false);
      setCartModalOpen(true);
      return;
    }

    const freeSlots = Math.max(0, MAX_ITEMS - cart.length);
    if (freeSlots === 0) {
      alert(`Demossa ostoskori on rajattu ${MAX_ITEMS} tuotteeseen.`);
      return;
    }

    const addedRows = rowsToAdd.slice(0, freeSlots);
    const now = Date.now();
    const newItems: CartItem[] = addedRows.map((row, index) => ({
      id: `memo-${now}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      name: row,
      quantity: 1,
      source: "manual",
    }));

    setNormalResults([]);
    setVisibleNormalCount(8);

    const nextCart = [...cart, ...newItems].slice(0, MAX_ITEMS);

    trackZiiplyEvent("manual_items_added_to_cart", {
      addedCount: newItems.length,
      cartItemsCount: nextCart.length,
      itemNames: newItems.map((item) => item.name),
    });

    setCart(nextCart);
    persistCartImmediately(nextCart);

    const addedNames = new Set(addedRows.map((row) => normalize(row)));
    const remainingRows = rows.filter((row) => !addedNames.has(normalize(row)));
    setInput(remainingRows.join(","));

    showCartToast(
      `Lisätty muistilistaan: ${newItems.length} ${newItems.length === 1 ? "rivi" : "riviä"}`,
    );
    setActiveResult("compare");
    void updateChainComparison(nextCart);
    setSearchPanelOpen(false);
    setCartModalOpen(true);
  }

  function addRecentItemToCart(item: CartItem) {
    triggerHaptic();
    const nextCart = mergeItemsIntoCart(cart, [item]);

    if (
      nextCart.length === cart.length &&
      !cart.some(
        (cartItem) =>
          getCartItemMemoryKey(cartItem) === getCartItemMemoryKey(item),
      )
    ) {
      alert(`Demossa ostoskori on rajattu ${MAX_ITEMS} tuotteeseen.`);
      return;
    }

    setCart(nextCart);
    persistCartImmediately(nextCart);
    showCartToast(`Lisätty uudelleen: ${item.name}`);
    setSearchPanelOpen(false);
    setCartModalOpen(true);
    setActiveResult("compare");
    void updateChainComparison(nextCart);
  }

  function saveCurrentCartAsList() {
    triggerHaptic();

    if (cart.length === 0) {
      alert("Lisää ensin tuotteita ostoskoriin.");
      return;
    }

    const trimmedName = savedListName.trim();
    const defaultName = `Ostoslista ${new Date().toLocaleDateString("fi-FI")}`;
    const listName = trimmedName || defaultName;
    const now = Date.now();
    const items = cart.map(sanitizeCartItemForStorage).slice(0, MAX_ITEMS);

    trackZiiplyEvent("shopping_list_saved", {
      listName,
      cartItemsCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    });

    setSavedShoppingLists((current) => {
      const existingIndex = current.findIndex(
        (list) => normalize(list.name) === normalize(listName),
      );
      const nextList: SavedShoppingList = {
        id:
          existingIndex >= 0
            ? current[existingIndex].id
            : `list-${now}-${Math.random().toString(36).slice(2, 8)}`,
        name: listName,
        items,
        createdAt: existingIndex >= 0 ? current[existingIndex].createdAt : now,
        updatedAt: now,
      };

      const withoutExisting = current.filter(
        (_, index) => index !== existingIndex,
      );
      return [nextList, ...withoutExisting].slice(0, MAX_SAVED_SHOPPING_LISTS);
    });

    setSavedListName("");
    setCartSavePanelOpen(false);
    cartOverlayScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    if (typeof document !== "undefined") {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
    showCartToast(`Tallennettu lista: ${listName}`);
  }

  function addSavedListToCart(list: SavedShoppingList) {
    triggerHaptic();

    if (!list.items.length) return;

    const nextCart = mergeItemsIntoCart(cart, list.items);

    if (
      nextCart.length === cart.length &&
      list.items.every(
        (item) =>
          !cart.some(
            (cartItem) =>
              getCartItemMemoryKey(cartItem) === getCartItemMemoryKey(item),
          ),
      )
    ) {
      alert(`Demossa ostoskori on rajattu ${MAX_ITEMS} tuotteeseen.`);
      return;
    }

    setCart(nextCart);
    persistCartImmediately(nextCart);
    setCartSavePanelOpen(false);
    showCartToast(`Lisätty lista: ${list.name}`);
    setSearchPanelOpen(false);
    setCartModalOpen(true);
    setActiveResult("compare");
    void updateChainComparison(nextCart);
  }

  function deleteSavedShoppingList(id: string) {
    const list = savedShoppingLists.find((item) => item.id === id);
    const label = list ? `”${list.name}”` : "tämä tallennettu lista";
    const itemCount = list?.items.length || 0;

    const ok = window.confirm(
      `Poistetaanko tallennettu lista ${label}${itemCount ? ` (${itemCount} tuotetta)` : ""}? Tätä ei voi perua.`,
    );
    if (!ok) return;

    setSavedShoppingLists((current) =>
      current.filter((list) => list.id !== id),
    );
    showCartToast("Tallennettu lista poistettu");
  }

  function showCart() {
    if (cart.length === 0) {
      showCartToast("Lisää ensin tuote koriin.");
      return;
    }

    // V547: Kori avataan suoralla overlay-state-vaihdolla ilman vanhaa scroll/ref-hyppelyä.
    suppressHaeReadyBadgeV541();
    closeProductSelectionOverlay();
    setSearchPanelOpen(false);
    setShopsPanelOpen(false);
    setEanModalOpen(false);
    setCartSavePanelOpen(false);
    setActiveResult("none");
    setCartModalOpen(true);

    if (storesReadyForSearch) {
      void updateChainComparison(cart);
    }
  }

  function toggleCartModal() {
    suppressHaeReadyBadgeV541();

    if (cart.length === 0) {
      setSearchPanelOpen(false);
      closeProductSelectionOverlay();
      showCartToast("Lisää ensin tuote koriin.");
      return;
    }

    if (cartModalOpen) {
      setCartModalOpen(false);
      setCartSavePanelOpen(false);
      setActiveResult("none");
      return;
    }

    showCart();
  }

  function closeCartModal() {
    suppressHaeReadyBadgeV541();
    setCartModalOpen(false);
    setCartSavePanelOpen(false);
    setActiveResult("none");
  }

  function openComparisonView() {
    if (cart.length === 0) {
      showCartToast("Lisää ensin tuote koriin.");
      return;
    }

    // V547: Vertailu avataan samalla suoralla overlay-logiikalla kuin uudet mobiilikortit.
    suppressHaeReadyBadgeV541();
    closeProductSelectionOverlay();
    setRestoredCartPromptV320({ open: false, count: 0 });
    setSearchPanelOpen(false);
    setCartModalOpen(false);
    setCartSavePanelOpen(false);
    setShopsPanelOpen(false);
    setEanModalOpen(false);
    setLoadingNormal(false);
    setNormalResults([]);
    setVisibleNormalCount(8);
    setActiveResult("compare");

    if (storesReadyForSearch) {
      void updateChainComparison(cart);
    } else {
      setComparisonLoading(false);
      showCartToast("Valitse kaupat, niin vertailu hakee hinnat.");
    }
  }

  function toggleComparisonView() {
    suppressHaeReadyBadgeV541();

    if (cart.length === 0) {
      setSearchPanelOpen(false);
      closeProductSelectionOverlay();
      showCartToast("Lisää ensin tuote koriin.");
      return;
    }

    if (
      activeResult === "compare" &&
      !searchPanelOpen &&
      !cartModalOpen &&
      !eanModalOpen
    ) {
      setActiveResult("none");
      return;
    }

    openComparisonView();
  }

  function openShopsPanel() {
    // v367_MOBILE_GPS_PENDING_NO_OLD_SHOPS_RENDER:
    // Jos Kaupat-nappia painetaan heti käynnistyksen jälkeen ennen kuin GPS on
    // ehtinyt antaa koordinaatit/kaupat, älä avaa vanhaa Kaupat-paneelin renderiä.
    // Se oli mobiilissa vain välivaiheen fallback ja näkyi välähdyksenä.
    if (gpsStoreLocationPendingV366 || storeSearchLoading) {
      setShopsPanelOpen(true);
      setSearchPanelOpen(false);
      setCartModalOpen(false);
      setCartSavePanelOpen(false);
      setEanModalOpen(false);
      closeProductSelectionOverlay();
      setActiveResult("none");
      setInitialStoreNavPrompt(false);
      setOpenStorePicker(null);
      if (!(usingOwnLocation && gpsCoordsV320 && foundStores.length > 0)) {
        setLocationMessage(
          storeSearchLoading
            ? "Haetaan kauppoja sijainnin perusteella"
            : "Haetaan nykyistä sijaintia",
        );
      }
      // V471: älä starttaa GPS:ää Kaupat-paneelin fallbackista.
      // Jos boot-haku on kesken, näytä vain tila; jos käyttäjä haluaa uuden haun, GPS-nappi tekee sen.
      return;
    }

    trackZiiplyEvent("shops_panel_opened", {
      storeMode,
      sStoreName: activeStores.sStoreName,
      kStoreName: activeStores.kStoreName,
    });

    const applyShopsPanelV512 = () => {
      // V512: avaa Kaupat samassa tilapäivityksessä kuin Hae suljetaan.
      // Tämä estää välirenderin, jossa kaikki paneelit ovat kiinni ja pääsivu vilahtaa.
      setShopsPanelOpen(true);
      setSearchPanelOpen(false);
      setCartModalOpen(false);
      setCartSavePanelOpen(false);
      setEanModalOpen(false);
      closeProductSelectionOverlay();
      setActiveResult("none");
      setInitialStoreNavPrompt(false);
    };

    if (searchPanelOpen) {
      applyShopsPanelV512();
      return;
    }

    transitionMobilePanel("shops", applyShopsPanelV512);
  }

  function toggleShopsPanel() {
    // v316: Kaupat on alussa ainoa käytettävissä oleva nappi, mutta sekin toimii toggle-na.
    // Eli Kaupat-kortin voi avata ja sulkea myös ennen kauppavalintojen valmistumista.
    if (shopsPanelOpen) {
      closePanelWithFade("shops", () => setShopsPanelOpen(false));
      return;
    }

    openShopsPanel();
  }

  function closeShopsPanel() {
    closePanelWithFade("shops", () => setShopsPanelOpen(false));
  }

  function scrollToNormalResults() {
    window.setTimeout(() => {
      const target = normalResultsSectionRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
  }

  async function pasteFromClipboardToSearch() {
    triggerHaptic();

    try {
      const clipboardText = await navigator.clipboard?.readText?.();
      const cleanText = String(clipboardText || "").trim();

      if (!cleanText) {
        showCartToast("Leikepöytä on tyhjä.");
        return;
      }

      // v240: Liitä-painike tekee vain yhden asian: leikepöydän sisältö siirtyy
      // suoraan hakutekstiruutuun. Ei selaimen erillistä "Sijoita/Liitä"-valikkoa,
      // ei vahvistusmodalia, ei toista vaihetta eikä tekstikentän automaattifokusta.
      setSearchInputForMode(cleanText.slice(0, 1200));
      setNormalResults([]);
      setNormalSearchAttempted(false);
      setSingleProductCompareResults([]);
      setSingleProductCompareTerm("");
      setVisibleNormalCount(8);

      trackZiiplyEvent("clipboard_pasted_to_search", {
        pastedLength: cleanText.length,
        mode: searchCompareMode,
      });

      // Ei fokusoida tekstikenttää Liitä-painalluksen jälkeen, koska iOS Safari
      // näyttää muuten oman "Sijoita / Puhu" -valikon.
    } catch {
      showCartToast(
        "Liittäminen ei onnistunut suoraan. Tarkista selaimen leikepöytäoikeus.",
      );
      // Ei fallback-fokusta: käyttäjä ei halua selaimen omaa Sijoita-valikkoa tähän.
    }
  }

  async function compareSelectedSingleProduct(product: Product) {
    const selectedName = fixText(product.name);
    const selectedPrice = getProductPrice(product);

    if (!selectedName || selectedPrice <= 0 || singleProductCompareLoading)
      return;

    if (!hasActiveStores) {
      setLocationMessage(
        "Hae ensin alue tai käytä omaa sijaintia, jotta kaupat voidaan valita.",
      );
      showCartToast("Valitse ensin kaupat.");
      return;
    }

    trackZiiplyEvent("single_product_selected_for_compare", {
      productName: selectedName,
      ean: product.ean,
      storeMode,
      sStoreName: activeStores.sStoreName,
      kStoreName: activeStores.kStoreName,
    });

    setSearchPanelOpen(false);
    setCartModalOpen(false);
    setCartSavePanelOpen(false);
    setShopsPanelOpen(false);
    setEanModalOpen(false);
    setNormalResults([]);
    setVisibleNormalCount(8);
    setActiveNormalSearchTerm("");
    setSingleProductCompareTerm(selectedName);
    setSingleProductCompareResults([]);
    setSingleProductCompareLoading(true);
    setActiveResult("singleCompare");

    try {
      const sourceStoreName =
        (
          product as Product & {
            sourceStoreName?: string;
            fallbackStoreName?: string;
          }
        ).sourceStoreName ||
        (product as Product & { fallbackStoreName?: string })
          .fallbackStoreName ||
        activeStores.sStoreName;

      const nextResults: SingleProductCompareResult[] = [
        {
          key: "s",
          chain: "S-ryhmä",
          storeName: sourceStoreName,
          productName: selectedName,
          price: selectedPrice,
          ean: product.ean,
          image: product.pictureUrl,
          comparisonPrice: formatComparisonPrice(product),
        },
      ];

      try {
        let kBest: KProduct | undefined;
        const selectedEan = normalizeEan(product.ean);

        for (const kSearchTerm of getKSearchTerms(selectedName)) {
          const kItems = await fetchKProducts(
            kSearchTerm,
            activeStores.kStoreId,
          );
          kBest = pickBestKProduct(kItems, selectedName, selectedEan);
          if (kBest && !shouldKeepSearchingKOwnBrand(selectedName, kBest))
            break;
        }

        if (kBest && kBest.price > 0) {
          nextResults.push({
            key: "k",
            chain: "K-ryhmä",
            storeName: activeStores.kStoreName,
            productName: fixText(kBest.name),
            price: kBest.price,
            ean: kBest.ean,
            image: kBest.pictureUrl,
            comparisonPrice: null,
          });
        }
      } catch {}

      setSingleProductCompareResults(
        nextResults.sort((a, b) => a.price - b.price),
      );
    } finally {
      setSingleProductCompareLoading(false);
      window.requestAnimationFrame(() => {
        compareOverlayScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
      });
    }
  }

  async function compareSingleProduct() {
    const term = parseTerms(input)[0] || input.trim();

    if (!term || singleProductCompareLoading) return;

    if (!hasActiveStores) {
      setLocationMessage(
        "Hae ensin alue tai käytä omaa sijaintia, jotta kaupat voidaan valita.",
      );
      showCartToast("Valitse ensin kaupat.");
      return;
    }

    trackZiiplyEvent("single_product_compare_clicked", {
      query: term,
      storeMode,
      sStoreName: activeStores.sStoreName,
      kStoreName: activeStores.kStoreName,
    });

    setSearchPanelOpen(false);
    setCartModalOpen(false);
    setCartSavePanelOpen(false);
    setShopsPanelOpen(false);
    setEanModalOpen(false);
    setNormalResults([]);
    setVisibleNormalCount(8);
    setSingleProductCompareTerm(term);
    setSingleProductCompareResults([]);
    setSingleProductCompareLoading(true);
    setActiveResult("singleCompare");

    try {
      const nextResults: SingleProductCompareResult[] = [];

      try {
        let sBest: Product | undefined;

        for (const sSearchTerm of getNormalSearchQueries(term).slice(0, 6)) {
          const sItems = await fetchSProducts(
            sSearchTerm,
            activeStores.sStoreId,
          );
          sBest = pickBestSProduct(sItems, term);
          if (sBest && getProductPrice(sBest) > 0) break;
        }

        if (sBest && getProductPrice(sBest) > 0) {
          nextResults.push({
            key: "s",
            chain: "S-ryhmä",
            storeName: activeStores.sStoreName,
            productName: fixText(sBest.name),
            price: getProductPrice(sBest),
            ean: sBest.ean,
            image: sBest.pictureUrl,
            comparisonPrice: formatComparisonPrice(sBest),
          });
        }
      } catch {}

      try {
        let kBest: KProduct | undefined;
        for (const kSearchTerm of getKSearchTerms(term)) {
          const kItems = await fetchKProducts(
            kSearchTerm,
            activeStores.kStoreId,
          );
          kBest = pickBestKProduct(kItems, term);
          if (kBest) break;
        }

        if (kBest && kBest.price > 0) {
          nextResults.push({
            key: "k",
            chain: "K-ryhmä",
            storeName: activeStores.kStoreName,
            productName: fixText(kBest.name),
            price: kBest.price,
            ean: kBest.ean,
            image: kBest.pictureUrl,
            comparisonPrice: null,
          });
        }
      } catch {}

      setSingleProductCompareResults(
        nextResults.sort((a, b) => a.price - b.price),
      );
    } finally {
      setSingleProductCompareLoading(false);
      window.requestAnimationFrame(() => {
        compareOverlayScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
      });
    }
  }

  function handleMainNormalSearch() {
    if (!hasSearchInput || loadingNormal || singleProductCompareLoading) return;

    const singleModeTerm = getSingleSearchTerm(input);
    const searchQueryForMode =
      searchCompareMode === "single" ? singleModeTerm : terms.join(", ");

    trackZiiplyEvent("main_search_clicked", {
      query: searchQueryForMode,
      searchType:
        searchCompareMode === "single"
          ? "single_product_compare"
          : "normal_prices",
      cartItemsCount: cart.length,
    });

    // v244:
    // Yksi tuote -tila hakee vain yhden kokonaisen termin. Jos kentässä on pilkuilla
    // useampi tuote, niitä ei ajeta jonona eikä näytetä single-product flowssa.
    // Useamman tuotteen jono kuuluu vain Koko kori -tilaan.
    // V538: mobiili-Hae pysyy auki haun aikana. Tuloskortti avataan vasta jos osumia löytyy.
    setSearchPanelOpen(true);
    if (searchCompareMode === "single") {
      setInput(singleModeTerm);
      void searchNormalPrices(singleModeTerm);
    } else {
      void searchNormalPrices();
    }
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      scrollToNormalResults();
    }
  }

  function handleJustiinaProductSearch() {
    setOfferSearchDoneForQuery("");
    setOfferSearchQuerySnapshot("");
    if (!hasSearchInput || loadingNormal || singleProductCompareLoading) return;

    const searchQueryForMode = terms.join(", ") || input.trim();

    trackZiiplyEvent("justiina_product_search_clicked", {
      query: searchQueryForMode,
      searchType: "normal_prices",
      cartItemsCount: cart.length,
    });

    setSearchCompareMode("cart");
    // V538: älä sulje Hae-paneelia Justiina-haussa; tyhjällä haulla näytetään vain ohjepalkin ei-löytynyt.
    setSearchPanelOpen(true);
    void searchNormalPrices();
    // Ei scrollata mobiilissa tyhjään/puuttuvaan valintakorttiin.
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      scrollToNormalResults();
    }
  }

  function handleGostaOfferSearch() {
    if (gostaSearchDisabled) return;

    trackZiiplyEvent("gosta_offer_search_clicked", {
      query: currentSearchQueryKey,
      searchType: "offers",
      cartItemsCount: cart.length,
    });

    setSearchPanelOpen(false);
    void searchOffers();
  }

  function handleMainOfferSearch() {
    if (!hasSearchInput || loadingOffers) return;

    trackZiiplyEvent("main_search_clicked", {
      query: terms.join(", "),
      searchType: "offers",
      cartItemsCount: cart.length,
    });

    setSearchPanelOpen(false);
    void searchOffers();
  }

  function getMatchEan(match: Match) {
    return (
      match.product.ean ||
      (match.product as any)?.ean ||
      (match.product as any)?.product?.ean ||
      ""
    );
  }

  function buildShoppingListText(chain: ChainResult) {
    const lines = chain.matches.map((match) => {
      const ean = getMatchEan(match);
      const eanLine = ean ? `\nEAN: ${ean}` : "";
      return `${match.quantity} × ${fixText(match.product.name)} — ${formatEuro(match.price * match.quantity)}${eanLine}`;
    });

    const savingsLine =
      cheapest && secondCheapest && cheapest.key === chain.key && savings > 0
        ? `\nSäästö seuraavaan täyteen koriin verrattuna: ${formatEuro(savings)} (${savingsPercent.toFixed(1).replace(".", ",")} %)`
        : "";

    return [
      `Ziiply ostoskori — ${chain.storeName}`,
      `Yhteensä: ${chain.totalPrice > 0 ? formatEuro(chain.totalPrice) : "—"}`,
      savingsLine.trim(),
      "",
      ...lines,
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function copyTextToClipboard(textToCopy: string) {
    try {
      await navigator.clipboard.writeText(textToCopy);
      alert("Ostoskori kopioitu leikepöydälle.");
    } catch {
      window.prompt("Kopioi ostoskori:", textToCopy);
    }
  }

  async function shareShoppingList(chain: ChainResult) {
    trackZiiplyEvent("shopping_list_shared", {
      chain: chain.chain,
      storeName: chain.storeName,
      cartItemsCount: chain.matches.length,
      totalPrice: chain.totalPrice,
    });

    const textToShare = buildShoppingListText(chain);

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Ziiply ostoskori — ${chain.storeName}`,
          text: textToShare,
        });
        return;
      }
    } catch {
      // User may cancel native share; fallback below is still useful.
    }

    await copyTextToClipboard(textToShare);
  }

  async function buyShoppingList(chain: ChainResult) {
    trackZiiplyEvent("buy_clicked", {
      chain: chain.chain,
      storeName: chain.storeName,
      cartItemsCount: chain.matches.length,
      totalPrice: chain.totalPrice,
    });

    const textToShare = buildShoppingListText(chain);
    await copyTextToClipboard(textToShare);
    alert(
      "Osta-toiminto on MVP:ssä ostoskorin kopiointi. Myöhemmin tämä voi avata valitun kaupan verkkokaupan.",
    );
  }

  function syncCartDependentState(
    nextCart: CartItem[],
    changedId?: string,
    removedId?: string,
  ) {
    const quantityById = nextCart.reduce(
      (map, item) => {
        map[item.id] = item.quantity;
        return map;
      },
      {} as Record<string, number>,
    );

    setLastOptimizationSnapshot(null);

    setSMatches((current) => {
      const next = { ...current };

      if (removedId) delete next[removedId];
      if (changedId && next[changedId] && quantityById[changedId]) {
        next[changedId] = {
          ...next[changedId],
          quantity: quantityById[changedId],
        };
      }

      return next;
    });

    setKMatches((current) => {
      const next = { ...current };

      if (removedId) delete next[removedId];
      if (changedId && next[changedId] && quantityById[changedId]) {
        next[changedId] = {
          ...next[changedId],
          quantity: quantityById[changedId],
        };
      }

      return next;
    });
  }

  function changeQuantity(id: string, delta: number) {
    const currentItem = cart.find((item) => item.id === id);
    if (!currentItem) return;

    const nextQuantity = currentItem.quantity + delta;
    const removedItem = nextQuantity <= 0 ? currentItem : null;
    const nextCart = cart
      .map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item,
      )
      .filter((item) => item.quantity > 0);

    setCart(nextCart);
    syncCartDependentState(nextCart, id, removedItem?.id);

    if (removedItem) {
      setCheckedCartItems((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setQualityModesByCart((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      showCartToast(`Poistettu: ${removedItem.name}`);
    } else {
      showCartToast(`${currentItem.name}: ${nextQuantity} kpl`);
    }

    if (nextCart.length === 0) {
      setActiveResult("none");
      setCartModalOpen(false);
      setCartSavePanelOpen(false);
      setShopsPanelOpen(false);
      setEanModalOpen(false);
      setLoadingNormal(false);
      setNormalResults([]);
      setVisibleNormalCount(8);
      setNormalSearchAttempted(false);
      setActiveNormalSearchTerm("");
      if (activeResult !== "compare" && activeResult !== "singleCompare") {
        setActiveResult("none");
      }
      setSearchPanelOpen(true);
    }

    triggerHaptic();
    void updateChainComparison(nextCart);
  }

  function removeCartItem(id: string) {
    const removedItem = cart.find((item) => item.id === id);
    const nextCart = cart.filter((item) => item.id !== id);

    if (!removedItem) return;

    setCart(nextCart);

    // Jos poistettava tuote oli lisätty single-vertailun kautta, älä palauta sen vanhaa hakutermiä Hae-kortille.
    if (removedItem.source === "search") {
      clearSingleSearchState();
    }

    syncCartDependentState(nextCart, undefined, id);
    setCheckedCartItems((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setQualityModesByCart((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setSMatches((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setKMatches((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (nextCart.length === 0) {
      setActiveResult("none");
      setCartModalOpen(false);
      setCartSavePanelOpen(false);
      setShopsPanelOpen(false);
      setEanModalOpen(false);
      setSearchPanelOpen(true);
    }

    showCartToast(`Poistettu: ${removedItem.name}`);
    void updateChainComparison(nextCart);
  }

  function clearCart() {
    if (cart.length === 0) return false;

    const ok = window.confirm(
      `Tyhjennetäänkö koko ostoskori (${cart.length} tuotetta)?`,
    );
    if (!ok) return false;

    setCart([]);
    setCheckedCartItems({});
    setQualityModesByCart({});
    setSMatches({});
    setKMatches({});
    setAlternativeResults({});
    setExpandedAlternatives({});
    setLoadingAlternatives({});
    setOptimizingChains({});
    setLastOptimizationSnapshot(null);
    setNormalResults([]);
    setVisibleNormalCount(8);
    setActiveResult("none");
    setCartModalOpen(false);
    setCartSavePanelOpen(false);
    setShopsPanelOpen(false);
    setEanModalOpen(false);
    setSearchPanelOpen(true);
    showCartToast("Ostoskori tyhjennetty");
    return true;
  }

  function clearCartAndCloseModal() {
    const cleared = clearCart();
    if (cleared) setCartModalOpen(false);
  }

  function clearRestoredCartPromptV320() {
    setCart([]);
    setCheckedCartItems({});
    setQualityModesByCart({});
    setSMatches({});
    setKMatches({});
    setAlternativeResults({});
    setExpandedAlternatives({});
    setLoadingAlternatives({});
    setOptimizingChains({});
    setLastOptimizationSnapshot(null);
    setNormalResults([]);
    setSingleProductCompareResults([]);
    setSingleProductCompareTerm("");
    setVisibleNormalCount(8);
    setActiveResult("none");
    setRestoredCartPromptV320({ open: false, count: 0 });
    try {
      window.localStorage.setItem(
        "ziiply-cart-v1",
        JSON.stringify({ version: 2, savedAt: Date.now(), items: [] }),
      );
    } catch {}
    showCartToast("Ostoskori tyhjennetty");
  }

  function getAlternativeKey(
    chainKey: ChainResult["key"],
    match: Match,
    index: number,
  ) {
    return `${chainKey}-${match.cartItemId || match.product.id}-${index}`;
  }

  function getAlternativeSearchTerm(productName: string) {
    const normalized = normalize(productName);

    if (
      hasAnyToken(normalized, [
        "maito",
        "kevytmaito",
        "rasvaton maito",
        "täysmaito",
        "taysmaito",
      ])
    ) {
      return "maito 1l";
    }

    return (
      buildKSearchName(productName) ||
      getSearchQuery(productName) ||
      productName
    );
  }

  function getAlternativeSearchTerms(
    productName: string,
    chainKey: ChainResult["key"],
  ) {
    const normalized = normalize(productName);
    const terms: string[] = [];

    const addTerm = (term: string) => {
      const clean = normalize(term);
      if (clean && !terms.includes(clean)) terms.push(clean);
    };

    if (
      hasAnyToken(normalized, [
        "maito",
        "kevytmaito",
        "rasvaton maito",
        "täysmaito",
        "taysmaito",
      ])
    ) {
      if (chainKey === "k") {
        addTerm("pirkka maito 1l");
        addTerm("k-menu maito 1l");
      }
      addTerm("maito 1l");
      addTerm("maito");
      return terms;
    }

    if (
      hasAnyToken(normalized, [
        "ranskanperuna",
        "ranskanperunat",
        "fries",
        "peruna",
        "perunat",
        "poimutettu",
      ])
    ) {
      if (chainKey === "k") {
        addTerm("pirkka ranskanperunat");
        addTerm("k-menu ranskanperunat");
      }
      addTerm("ranskanperunat");
      addTerm("ranskanperuna");
      addTerm("pakasteperunat");
      addTerm("perunat pakaste");
      return terms;
    }

    if (hasAnyToken(normalized, ["kalapuikko", "kalapuikot", "fiskpinnar"])) {
      if (chainKey === "k") {
        addTerm("pirkka kalapuikot");
        addTerm("k-menu kalapuikot");
      }
      addTerm("kalapuikot");
      addTerm("kalapuikko");
      return terms;
    }

    if (hasAnyToken(normalized, ["kahvi", "juhla mokka"])) {
      addTerm("kahvi suodatinjauhatus");
      addTerm("kahvi");
    }

    if (hasAnyToken(normalized, ["cola", "coca-cola", "coca cola", "pepsi"])) {
      addTerm("cola 0,33l");
      addTerm("cola");
    }

    addTerm(getAlternativeSearchTerm(productName));

    const cleaned = buildKSearchName(productName);
    if (cleaned) addTerm(cleaned);

    const importantWords = cleaned
      .split(" ")
      .filter((word) => word.length > 3)
      .filter((word) => !/^\d/.test(word))
      .slice(0, 2);

    if (importantWords.length >= 1) addTerm(importantWords.join(" "));

    return terms;
  }

  function getQualityModeLabel(mode: QualityMode) {
    if (mode === "cheapest") return "Huokein";
    if (mode === "same_quality") return "Sama taso";
    if (mode === "own_brands") return "Omat merkit";
    return "Sama brändi";
  }

  function getMatchQualityMode(match: Match) {
    if (!match.cartItemId) return "cheapest" as QualityMode;
    return qualityModesByCart[match.cartItemId] || "cheapest";
  }

  function setMatchQualityMode(
    match: Match,
    mode: QualityMode,
    alternativeKey?: string,
    chainKey?: ChainResult["key"],
  ) {
    if (!match.cartItemId) return;

    setLastOptimizationSnapshot({
      cart: [...cart],
      sMatches: { ...sMatches },
      kMatches: { ...kMatches },
      alternativeResults: { ...alternativeResults },
      expandedAlternatives: { ...expandedAlternatives },
      chainKey: chainKey || "s",
      chainName: chainKey === "k" ? "K-ryhmä" : "S-ryhmä",
      savedAt: Date.now(),
    });

    setQualityModesByCart((prev) => ({
      ...prev,
      [match.cartItemId as string]: mode,
    }));

    if (alternativeKey) {
      clearAlternativesAutoCloseTimer(alternativeKey);

      setAlternativeResults((prev) => {
        const next = { ...prev };
        delete next[alternativeKey];
        return next;
      });

      // Jos vaihtoehtoikkuna on jo auki, pidetään se auki ja haetaan listaus uudella korvaustavalla.
      if (expandedAlternatives[alternativeKey] && chainKey) {
        void loadAlternatives(alternativeKey, chainKey, match, mode, true);
      }
    }
  }

  async function fetchAlternativesForMatch(
    chainKey: ChainResult["key"],
    match: Match,
    forcedQualityMode?: QualityMode,
  ) {
    const matchQualityMode = forcedQualityMode || getMatchQualityMode(match);
    let alternatives: Product[] = [];

    if (chainKey === "s") {
      const sTerms = getAlternativeSearchTerms(match.product.name, "s");
      const allSItems: Product[] = [];

      for (const term of sTerms.slice(0, 5)) {
        const items = await fetchSProducts(term, activeStores.sStoreId);
        allSItems.push(...items);
      }

      const uniqueSItems = Array.from(
        new Map(allSItems.map((item) => [item.id, item])).values(),
      );

      alternatives = uniqueSItems
        .filter((product) => getProductPrice(product) > 0)
        .filter((product) => product.id !== match.product.id)
        .filter(
          (product) =>
            !isHardRejectedOptimizationAlternative(
              match.product.name,
              product.name,
            ),
        )
        .filter((product) => productGroupGate(match.product.name, product.name))
        .filter((product) =>
          isAllowedByQualityMode(
            match.product.name,
            product.name,
            matchQualityMode,
          ),
        )
        .filter(
          (product) =>
            scoreNameMatch(match.product.name, product.name) +
              scoreQualityMode(
                match.product.name,
                product.name,
                matchQualityMode,
              ) >
            -100,
        )
        .sort((a, b) => {
          const aScore =
            scoreNameMatch(match.product.name, a.name) +
            scoreQualityMode(match.product.name, a.name, matchQualityMode);
          const bScore =
            scoreNameMatch(match.product.name, b.name) +
            scoreQualityMode(match.product.name, b.name, matchQualityMode);

          if (
            matchQualityMode !== "cheapest" &&
            Math.abs(bScore - aScore) > 20
          ) {
            return bScore - aScore;
          }

          return getProductPrice(a) - getProductPrice(b);
        })
        .slice(0, 3);
    }

    if (chainKey === "k") {
      const kTerms = getAlternativeSearchTerms(match.product.name, "k");
      const allKItems: KProduct[] = [];

      for (const term of kTerms.slice(0, 4)) {
        const items = await fetchKProducts(term, activeStores.kStoreId);
        allKItems.push(...items);
      }

      const uniqueKItems = Array.from(
        new Map(allKItems.map((item) => [item.id, item])).values(),
      );

      alternatives = uniqueKItems
        .filter((product) => product.price > 0)
        .filter((product) => product.id !== String(match.product.id))
        .filter(
          (product) =>
            !isHardRejectedOptimizationAlternative(
              match.product.name,
              product.name,
            ),
        )
        .filter(
          (product) => !isHardRejectedKMatch(match.product.name, product.name),
        )
        .filter((product) => productGroupGate(match.product.name, product.name))
        .filter((product) =>
          isAllowedByQualityMode(
            match.product.name,
            product.name,
            matchQualityMode,
          ),
        )
        .filter(
          (product) =>
            scoreNameMatch(match.product.name, product.name) +
              scoreQualityMode(
                match.product.name,
                product.name,
                matchQualityMode,
              ) >
            -100,
        )
        .map(convertKProductToProduct)
        .sort((a, b) => {
          const aScore =
            scoreNameMatch(match.product.name, a.name) +
            scoreQualityMode(match.product.name, a.name, matchQualityMode);
          const bScore =
            scoreNameMatch(match.product.name, b.name) +
            scoreQualityMode(match.product.name, b.name, matchQualityMode);

          if (
            matchQualityMode !== "cheapest" &&
            Math.abs(bScore - aScore) > 20
          ) {
            return bScore - aScore;
          }

          return getProductPrice(a) - getProductPrice(b);
        })
        .slice(0, 3);
    }

    return alternatives;
  }

  async function loadAlternatives(
    key: string,
    chainKey: ChainResult["key"],
    match: Match,
    forcedQualityMode?: QualityMode,
    forceReload = false,
  ) {
    if (
      !forceReload &&
      (alternativeResults[key]?.length || loadingAlternatives[key])
    )
      return;

    setLoadingAlternatives((prev) => ({ ...prev, [key]: true }));

    if (forceReload) {
      setAlternativeResults((prev) => ({
        ...prev,
        [key]: [],
      }));
    }

    try {
      const alternatives = await fetchAlternativesForMatch(
        chainKey,
        match,
        forcedQualityMode,
      );

      setAlternativeResults((prev) => ({
        ...prev,
        [key]: alternatives,
      }));
    } catch (error) {
      pushGpsDebugLogV492(`useOwnLocation CATCH code=${String((error as any)?.code ?? "?")}`);
      console.error(error);
      const gpsErrorCode =
        typeof error === "object" && error !== null && "code" in error
          ? Number((error as { code?: number }).code)
          : 0;
      if (gpsErrorCode === 1) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 2) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 3) {
        setGpsErrorMessage("GPS ei löydy");
      } else {
        setGpsErrorMessage("GPS ei löydy");
      }
      setAlternativeResults((prev) => ({
        ...prev,
        [key]: [],
      }));
    } finally {
      setLoadingAlternatives((prev) => ({ ...prev, [key]: false }));

      setExpandedAlternatives((prev) => {
        if (prev[key]) {
          startAlternativesAutoCloseTimer(key);
        }

        return prev;
      });
    }
  }

  function clearAlternativesAutoCloseTimer(key: string) {
    const existing = alternativesTimeoutsRef.current[key];

    if (existing) {
      window.clearTimeout(existing);
      delete alternativesTimeoutsRef.current[key];
    }
  }

  function startAlternativesAutoCloseTimer(key: string) {
    clearAlternativesAutoCloseTimer(key);

    // UI debounce / anti-duplicate protection
    alternativesTimeoutsRef.current[key] = window.setTimeout(() => {
      setExpandedAlternatives((prev) => ({
        ...prev,
        [key]: false,
      }));

      delete alternativesTimeoutsRef.current[key];
    }, ALTERNATIVES_AUTO_CLOSE_MS);
  }

  function closeAlternatives(key: string) {
    clearAlternativesAutoCloseTimer(key);

    setExpandedAlternatives((prev) => ({
      ...prev,
      [key]: false,
    }));
  }

  function toggleAlternatives(
    key: string,
    chainKey: ChainResult["key"],
    match: Match,
  ) {
    const isExpanded = expandedAlternatives[key];

    if (isExpanded) {
      closeAlternatives(key);
      return;
    }

    setExpandedAlternatives((prev) => ({
      ...prev,
      [key]: true,
    }));

    void loadAlternatives(key, chainKey, match);
  }

  function formatPriceDifference(currentPrice: number, nextPrice: number) {
    const diff = nextPrice - currentPrice;
    if (diff === 0) return "sama hinta";

    const prefix = diff > 0 ? "+" : "-";
    return `${prefix}${formatEuro(Math.abs(diff))}`;
  }

  function isSameAlternativeAsMatch(match: Match, alternative: Product) {
    const matchEan = getMatchEan(match);
    const alternativeEan = alternative.ean || "";

    if (matchEan && alternativeEan && matchEan === alternativeEan) return true;

    return normalize(match.product.name) === normalize(alternative.name);
  }

  function getAlternativeActionText(currentPrice: number, nextPrice: number) {
    const diff = nextPrice - currentPrice;

    if (diff < 0) {
      return `Vaihda · säästä ${formatEuro(Math.abs(diff))}`;
    }

    if (diff > 0) {
      return `Vaihda · +${formatEuro(diff)}`;
    }

    return "Vaihda";
  }

  function getCheaperAlternatives(
    chainKey: ChainResult["key"],
    match: Match,
    index: number,
  ) {
    const key = getAlternativeKey(chainKey, match, index);
    return (alternativeResults[key] || [])
      .filter((alternative) => getProductPrice(alternative) < match.price)
      .sort((a, b) => getProductPrice(a) - getProductPrice(b));
  }

  function hasKnownCheaperAlternatives(chain: ChainResult) {
    return chain.matches.some(
      (match, index) =>
        getCheaperAlternatives(chain.key, match, index).length > 0,
    );
  }

  function hasUncheckedOptimizationCandidates(chain: ChainResult) {
    return chain.matches.some((match, index) => {
      const key = getAlternativeKey(chain.key, match, index);
      return !(key in alternativeResults);
    });
  }

  function canOptimizeChain(chain: ChainResult) {
    return (
      !chain.comingSoon &&
      chain.matches.length > 0 &&
      (hasKnownCheaperAlternatives(chain) ||
        hasUncheckedOptimizationCandidates(chain))
    );
  }

  function getKnownOptimizationSavings(chain: ChainResult) {
    return chain.matches.reduce((sum, match, index) => {
      const cheapestAlternative = getCheaperAlternatives(
        chain.key,
        match,
        index,
      )[0];
      if (!cheapestAlternative) return sum;

      return (
        sum +
        Math.max(0, match.price - getProductPrice(cheapestAlternative)) *
          match.quantity
      );
    }, 0);
  }

  function getOptimizeCartLabel(chain: ChainResult) {
    if (optimizingChains[chain.key]) return "Haetaan huokeimmat...";

    const savings = getKnownOptimizationSavings(chain);

    if (savings > 0) {
      return `Viilaa · säästä ${formatEuro(savings)}`;
    }

    if (hasUncheckedOptimizationCandidates(chain)) {
      return "Viilaa";
    }

    return "Ei optimoitavaa";
  }

  function replaceMatchProduct(
    chainKey: ChainResult["key"],
    match: Match,
    alternative: Product,
    alternativeKey?: string,
  ) {
    if (!match.cartItemId) return;

    setLastOptimizationSnapshot({
      cart: [...cart],
      sMatches: { ...sMatches },
      kMatches: { ...kMatches },
      alternativeResults: { ...alternativeResults },
      expandedAlternatives: { ...expandedAlternatives },
      chainKey,
      chainName:
        chainKey === "s"
          ? "S-ryhmä"
          : chainKey === "k"
            ? "K-ryhmä"
            : "Valittu ketju",
      savedAt: Date.now(),
    });

    const nextMatch: Match = {
      ...match,
      product: alternative,
      price: getProductPrice(alternative),
      matchType:
        alternative.ean && alternative.ean === match.product.ean
          ? "ean"
          : "name",
      fallbackStoreName: undefined,
    };

    if (chainKey === "s") {
      setSMatches((prev) => ({
        ...prev,
        [match.cartItemId as string]: nextMatch,
      }));
    }

    if (chainKey === "k") {
      setKMatches((prev) => ({
        ...prev,
        [match.cartItemId as string]: nextMatch,
      }));
    }

    if (alternativeKey) {
      clearAlternativesAutoCloseTimer(alternativeKey);

      setExpandedAlternatives((prev) => ({
        ...prev,
        [alternativeKey]: false,
      }));
    }
  }

  async function optimizeCart(chain: ChainResult) {
    if (!canOptimizeChain(chain) || optimizingChains[chain.key]) return;

    trackZiiplyEvent("optimize_cart_clicked", {
      chain: chain.chain,
      storeName: chain.storeName,
      cartItemsCount: chain.matches.length,
      totalPrice: chain.totalPrice,
    });

    const snapshotBeforeOptimization: OptimizationSnapshot = {
      cart: [...cart],
      sMatches: { ...sMatches },
      kMatches: { ...kMatches },
      alternativeResults: { ...alternativeResults },
      expandedAlternatives: { ...expandedAlternatives },
      chainKey: chain.key,
      chainName: chain.chain,
      savedAt: Date.now(),
    };

    setOptimizingChains((prev) => ({
      ...prev,
      [chain.key]: true,
    }));

    try {
      const fetchedAlternativeResults: Record<string, Product[]> = {};
      const nextMatches: Record<string, Match> = {};
      const keysToClose: Record<string, boolean> = {};
      let replacedCount = 0;

      await Promise.all(
        chain.matches.map(async (match, index) => {
          if (!match.cartItemId) return;

          const key = getAlternativeKey(chain.key, match, index);
          let alternatives = alternativeResults[key];

          if (!alternatives) {
            alternatives = await fetchAlternativesForMatch(chain.key, match);
            fetchedAlternativeResults[key] = alternatives;
          }

          const cheapestAlternative = alternatives
            .filter(
              (alternative) =>
                !isHardRejectedOptimizationAlternative(
                  match.product.name,
                  alternative.name,
                ),
            )
            .filter((alternative) =>
              productGroupGate(match.product.name, alternative.name),
            )
            .filter((alternative) => getProductPrice(alternative) < match.price)
            .sort((a, b) => getProductPrice(a) - getProductPrice(b))[0];

          if (!cheapestAlternative) return;

          nextMatches[match.cartItemId] = {
            ...match,
            product: cheapestAlternative,
            price: getProductPrice(cheapestAlternative),
            matchType:
              cheapestAlternative.ean &&
              cheapestAlternative.ean === match.product.ean
                ? "ean"
                : "name",
            fallbackStoreName: undefined,
          };

          keysToClose[key] = false;
          replacedCount += 1;
        }),
      );

      if (Object.keys(fetchedAlternativeResults).length > 0) {
        setAlternativeResults((prev) => ({
          ...prev,
          ...fetchedAlternativeResults,
        }));
      }

      if (replacedCount === 0) {
        setLastOptimizationSnapshot(null);
        return;
      }

      setLastOptimizationSnapshot(snapshotBeforeOptimization);

      if (chain.key === "s") {
        setSMatches((prev) => ({
          ...prev,
          ...nextMatches,
        }));
      }

      if (chain.key === "k") {
        setKMatches((prev) => ({
          ...prev,
          ...nextMatches,
        }));
      }

      Object.keys(keysToClose).forEach(clearAlternativesAutoCloseTimer);

      setExpandedAlternatives((prev) => ({
        ...prev,
        ...keysToClose,
      }));
    } catch (error) {
      pushGpsDebugLogV492(`useOwnLocation CATCH code=${String((error as any)?.code ?? "?")}`);
      console.error(error);
      const gpsErrorCode =
        typeof error === "object" && error !== null && "code" in error
          ? Number((error as { code?: number }).code)
          : 0;
      if (gpsErrorCode === 1) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 2) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 3) {
        setGpsErrorMessage("GPS ei löydy");
      } else {
        setGpsErrorMessage("GPS ei löydy");
      }
      alert(
        "Korivaihtoehtojen haku epäonnistui. Kokeile hetken päästä uudelleen.",
      );
    } finally {
      setOptimizingChains((prev) => ({
        ...prev,
        [chain.key]: false,
      }));
    }
  }

  function getBarWidth(chain: ChainResult) {
    if (!cheapest || chain.totalPrice <= 0 || chain.comingSoon) return 0;
    return Math.max(
      15,
      Math.min(100, (cheapest.totalPrice / chain.totalPrice) * 100),
    );
  }

  const comparedStoreCards: Array<{
    key: ChainResult["key"];
    logo: string;
    title: string;
    name: string;
    tone: string;
    selectedTone: string;
    comingSoon?: boolean;
  }> = [
    {
      key: "s",
      logo: "S",
      title: "S-ryhmä",
      name: activeStores.sStoreName || "Valitse S",
      tone: "bg-green-700 shadow-md ring-1 ring-black/10 text-white ring-green-100",
      selectedTone: "border-[#08713b] bg-gradient-to-b from-[#f8ffe7] to-[#e2efad] text-green-900",
    },
    {
      key: "k",
      logo: "K",
      title: "K-ryhmä",
      name: activeStores.kStoreName || "Valitse K",
      tone: "bg-red-700 shadow-md ring-1 ring-black/10 text-white ring-red-100",
      selectedTone: "border-red-600 bg-red-50 text-red-900",
    },
    {
      key: "lidl",
      logo: "L",
      title: "Lidl",
      name: "Tulossa",
      tone: "bg-blue-600 text-white ring-blue-100",
      selectedTone: "border-blue-600 bg-blue-50 text-blue-900",
      comingSoon: true,
    },
    {
      key: "tokmanni",
      logo: "T",
      title: "Tokmanni",
      name: "Tulossa",
      tone: "bg-yellow-400 text-slate-950 ring-yellow-100",
      selectedTone: "border-yellow-500 bg-yellow-50 text-yellow-950",
      comingSoon: true,
    },
  ];

  // CLEAR_STALE_STORE_PICKER_V295
  useEffect(() => {
    setOpenStorePicker(null);
  }, [storeMode, storeCompareScope, withinChain, activeArea.label]);

  function handleStoreCompareScopeChange(nextScope: StoreCompareScope) {
    setOpenStorePicker(null);

    if (nextScope === "between_chains") {
      // v316: Ketjujen väliltä ei saa nollata jo valittua Tavaratalot/Lähikaupat-valintaa.
      // Jos käyttäjä valitsi ensin Tavaratalot tai Lähikaupat, se pysyy vihreänä ja kauppakortit aktivoituvat.
      const hadStoreModeChoice = storeModeChosenV299;
      setStoreCompareScope("between_chains");
      setWithinChain(null);
      setStoreModeChosenV299(hadStoreModeChoice);
      if (!hadStoreModeChoice) {
        selectedStoreModeRefV302.current = "hyper";
        setStoreMode("hyper");
      }
      setSelectedChains((current) => ({
        ...current,
        s: hadStoreModeChoice,
        k: hadStoreModeChoice,
        lidl: false,
        tokmanni: false,
      }));
      clearSearchAndComparisonState();
      setLocationMessage(
        hadStoreModeChoice
          ? `${activeArea.label || "Alue"} käytössä.`
          : `${activeArea.label || "Alue"} käytössä. Hakutapa: Tavaratalot tai Lähikaupat.`,
      );
      return;
    }

    // Ketjun sisällä näyttää sekä tavaratalo- että lähikauppavalinnan vihreänä,
    // mutta ei tallenna kumpaakaan varsinaiseksi between_chains-hakutavaksi.
    setStoreCompareScope("within_chain");
    setWithinChain(null);
    setStoreModeChosenV299(false);
    selectedStoreModeRefV302.current = "hyper";
    setStoreMode("hyper");
    setSelectedChains((current) => ({
      ...current,
      s: false,
      k: false,
      lidl: false,
      tokmanni: false,
    }));
    clearSearchAndComparisonState();
    setLocationMessage(
      " ketjun sisäistä vertailua varten.",
    );
  }

  function isLocalStoreForModeV295(store: StoreSearchItem) {
    const text = storeText(store);
    return (
      text.includes("k-market") ||
      text.includes("k market") ||
      text.includes("k-supermarket") ||
      text.includes("k supermarket") ||
      text.includes("s-market") ||
      text.includes("s market") ||
      text.includes("alepa") ||
      text.includes("sale")
    );
  }

  function isHyperStoreForModeV295(store: StoreSearchItem) {
    return isPrisma(store) || isKCitymarket(store);
  }

  function getStoreChainV320(store: StoreSearchItem): "S" | "K" | null {
    const raw = String(store.type || store.chain || "").toUpperCase();
    if (raw === "S" || raw.includes("S-RYHM") || raw.includes("SOK"))
      return "S";
    if (raw === "K" || raw.includes("K-RYHM") || raw.includes("KESKO"))
      return "K";

    const text = storeText(store);
    if (
      text.includes("prisma") ||
      text.includes("s-market") ||
      text.includes("smarket") ||
      text.includes("alepa") ||
      text.includes("sale")
    )
      return "S";
    if (
      text.includes("k-citymarket") ||
      text.includes("kcitymarket") ||
      text.includes("k-supermarket") ||
      text.includes("ksupermarket") ||
      text.includes("k-market") ||
      text.includes("kmarket")
    )
      return "K";

    return null;
  }

  function normalizeStoreForPickerV320(
    store: StoreSearchItem,
  ): StoreSearchItem {
    const chain = getStoreChainV320(store);
    return {
      ...store,
      type: chain || store.type,
    };
  }

  function getStoreModeRankV320(store: StoreSearchItem, mode: StoreMode) {
    const text = storeText(store);
    const isHyper = isHyperStoreForModeV295(store);
    const isStrictLocal = isLocalStoreForModeV295(store);
    const isLocalLike =
      isStrictLocal ||
      (!isHyper &&
        (text.includes("market") ||
          text.includes("alepa") ||
          text.includes("sale")));

    if (mode === "hyper") {
      if (isHyper) return 0;
      if (isLocalLike) return 3;
      return 5;
    }

    if (isStrictLocal) return 0;
    if (isLocalLike) return 1;
    if (isHyper) return 5;
    return 3;
  }

  function sortStoresForPickerV320(
    stores: StoreSearchItem[],
    mode: StoreMode,
    selectedId?: number,
    selectedName?: string,
  ) {
    return uniqueStoresByIdAndName(
      stores.map(normalizeStoreForPickerV320),
    ).sort((a, b) => {
      const aSelected = Boolean(
        (selectedId && a.id === selectedId) ||
        (selectedName && a.name === selectedName),
      );
      const bSelected = Boolean(
        (selectedId && b.id === selectedId) ||
        (selectedName && b.name === selectedName),
      );
      if (aSelected !== bSelected) return aSelected ? -1 : 1;

      const modeDiff =
        getStoreModeRankV320(a, mode) - getStoreModeRankV320(b, mode);
      if (modeDiff !== 0) return modeDiff;

      const cityA = normalize(a.city || "");
      const cityB = normalize(b.city || "");
      const area = normalize(activeArea.label || "");
      const aSameCity = area && cityA.includes(area);
      const bSameCity = area && cityB.includes(area);
      if (aSameCity !== bSameCity) return aSameCity ? -1 : 1;

      return normalize(a.name || "").localeCompare(
        normalize(b.name || ""),
        "fi",
      );
    });
  }

  function getStoresForPickerOptionsV295(chain: "S" | "K", mode: StoreMode) {
    const chainStores = foundStores
      .map(normalizeStoreForPickerV320)
      .filter((store) => getStoreChainV320(store) === chain);

    const selectedId = getSelectedStoreIdFor(chain, mode);
    const selectedName = getSelectedStoreNameFor(chain, mode);

    // Tavaratalot = vain Prisma / K-Citymarket jos niitä löytyy.
    // Lähikaupat = vain ketjun ei-tavaratalot jos niitä löytyy.
    // Jos API palauttaa suppean datan, fallback näyttää silti koko ketjun eikä tyhjää/virheellistä ikkunaa.
    const hyperStores = chainStores.filter(isHyperStoreForModeV295);
    const localStores = chainStores.filter(
      (store) => !isHyperStoreForModeV295(store),
    );

    const scoped =
      mode === "hyper"
        ? hyperStores.length > 0
          ? hyperStores
          : chainStores
        : localStores.length > 0
          ? localStores
          : chainStores;

    return sortStoresForPickerV320(scoped, mode, selectedId, selectedName);
  }

  function getStoresForPicker(chain: "S" | "K", mode: StoreMode) {
    const list = getStoresForPickerOptionsV295(chain, mode);
    if (list.length > 0) return list;

    // Fallback vain valittuun ketjuun ja nykyiseen modeen.
    const fallbackId =
      chain === "S"
        ? mode === "local"
          ? activeArea.sLocalStoreId
          : activeArea.sStoreId
        : mode === "local"
          ? activeArea.kLocalStoreId
          : activeArea.kStoreId;

    const fallbackName =
      chain === "S"
        ? mode === "local"
          ? activeArea.sLocalStoreName
          : activeArea.sStoreName
        : mode === "local"
          ? activeArea.kLocalStoreName
          : activeArea.kStoreName;

    if (fallbackId && fallbackName) {
      return [
        {
          id: fallbackId,
          name: fallbackName,
          type: chain,
          city: activeArea.label,
        } as StoreSearchItem,
      ];
    }

    return [];
  }

  function getSelectedStoreNameFor(chain: "S" | "K", mode: StoreMode) {
    if (chain === "S")
      return mode === "local"
        ? activeArea.sLocalStoreName
        : activeArea.sStoreName;
    return mode === "local"
      ? activeArea.kLocalStoreName
      : activeArea.kStoreName;
  }

  function getSelectedStoreIdFor(chain: "S" | "K", mode: StoreMode) {
    if (chain === "S")
      return mode === "local" ? activeArea.sLocalStoreId : activeArea.sStoreId;
    return mode === "local" ? activeArea.kLocalStoreId : activeArea.kStoreId;
  }

  function readStoreNumberV320(value: unknown) {
    if (value == null || value === "") return null;
    if (typeof value === "string") {
      const normalizedValue = value.replace(",", ".").replace(/[^0-9.\-]/g, "");
      if (!normalizedValue) return null;
      const numberValue = Number(normalizedValue);
      return Number.isFinite(numberValue) ? numberValue : null;
    }
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  function readNestedNumberByKeysV320(
    source: unknown,
    keys: string[],
    maxDepth = 5,
  ): number | null {
    if (!source || maxDepth < 0) return null;

    if (Array.isArray(source)) {
      for (const item of source) {
        const nested = readNestedNumberByKeysV320(item, keys, maxDepth - 1);
        if (nested != null) return nested;
      }
      return null;
    }

    if (typeof source !== "object") return null;

    const record = source as Record<string, unknown>;
    const lowerKeyMap = new Map(
      Object.keys(record).map((key) => [key.toLowerCase(), key]),
    );

    for (const key of keys) {
      const directKey = lowerKeyMap.get(key.toLowerCase());
      if (directKey) {
        const value = readStoreNumberV320(record[directKey]);
        if (value != null) return value;
      }
    }

    for (const value of Object.values(record)) {
      if (!value || typeof value !== "object") continue;
      const nested = readNestedNumberByKeysV320(value, keys, maxDepth - 1);
      if (nested != null) return nested;
    }

    return null;
  }

  function getStoreCoordinateV320(store: StoreSearchItem, keys: string[]) {
    const direct = readNestedNumberByKeysV320(store, keys, 4);
    if (direct != null) return direct;

    const wantsLatitude = keys.some((key) =>
      ["latitude", "lat", "y"].includes(key),
    );
    const coordinateContainers = [
      (store as any).coordinates,
      (store as any).location?.coordinates,
      (store as any).geometry?.coordinates,
      (store as any).geo?.coordinates,
      (store as any).position?.coordinates,
      (store as any).raw?.coordinates,
      (store as any).raw?.location?.coordinates,
      (store as any).raw?.geometry?.coordinates,
    ].filter(Array.isArray) as unknown[][];

    for (const coordinates of coordinateContainers) {
      if (coordinates.length < 2) continue;

      const first = readStoreNumberV320(coordinates[0]);
      const second = readStoreNumberV320(coordinates[1]);
      if (first == null || second == null) continue;

      // Tuetaan sekä GeoJSON-muotoa [lon, lat] että tavallista [lat, lon].
      const firstLooksLat = Math.abs(first) <= 90 && Math.abs(second) <= 180;
      const secondLooksLat = Math.abs(second) <= 90 && Math.abs(first) <= 180;

      if (wantsLatitude) {
        if (secondLooksLat && Math.abs(first) > 90) return second;
        if (firstLooksLat && Math.abs(second) > 90) return first;
        return secondLooksLat ? second : first;
      }

      if (secondLooksLat && Math.abs(first) > 90) return first;
      if (firstLooksLat && Math.abs(second) > 90) return second;
      return first;
    }

    return null;
  }

  function calculateDistanceKmV320(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
  ) {
    const earthRadiusKm = 6371;
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(to.latitude - from.latitude);
    const dLon = toRad(to.longitude - from.longitude);
    const lat1 = toRad(from.latitude);
    const lat2 = toRad(to.latitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDistanceKmV320(km: number) {
    if (!Number.isFinite(km) || km < 0) return "";
    if (km < 1) return `${Math.max(0.1, km).toFixed(1).replace(".", ",")} km`;
    return `${km.toFixed(km < 10 ? 1 : 0).replace(".", ",")} km`;
  }

  function readExplicitDistanceKmV320(store: StoreSearchItem) {
    const km = readNestedNumberByKeysV320(
      store,
      [
        "distanceKm",
        "distance_km",
        "distanceKilometers",
        "distance_kilometers",
        "distanceInKm",
        "distance_in_km",
        "kilometers",
        "kilometres",
        "km",
      ],
      5,
    );

    if (km != null) return km;

    const meters = readNestedNumberByKeysV320(
      store,
      [
        "distanceMeters",
        "distance_m",
        "distance_meters",
        "distanceInMeters",
        "distance_in_meters",
        "meters",
        "metres",
        "m",
      ],
      5,
    );

    if (meters != null) return meters / 1000;

    const genericDistance = readNestedNumberByKeysV320(
      store,
      [
        "distance",
        "distanceText",
        "distance_text",
        "distanceLabel",
        "distance_label",
      ],
      5,
    );

    if (genericDistance == null) return null;
    return genericDistance > 100 ? genericDistance / 1000 : genericDistance;
  }

  function getStoreDistanceKeyV320(store?: StoreSearchItem | null) {
    if (!store) return "";
    return `${store.type || store.chain || ""}:${store.id || ""}:${normalize(store.name || "")}:${normalize(store.city || "")}:${store.postalCode || ""}`;
  }

  function getStoreDistanceLabelWithoutFallbackV320(
    store?: StoreSearchItem | null,
  ) {
    if (!store) return "";

    const explicitKm = readExplicitDistanceKmV320(store);
    if (explicitKm != null && Number.isFinite(explicitKm)) {
      return formatDistanceKmV320(explicitKm);
    }

    const latitude = getStoreCoordinateV320(store, ["latitude", "lat", "y"]);
    const longitude = getStoreCoordinateV320(store, [
      "longitude",
      "lng",
      "lon",
      "x",
    ]);
    if (gpsCoordsV320 && latitude != null && longitude != null) {
      return formatDistanceKmV320(
        calculateDistanceKmV320(gpsCoordsV320, { latitude, longitude }),
      );
    }

    return "";
  }

  function getStoreDistanceLabelV320(store?: StoreSearchItem | null) {
    const directLabel = getStoreDistanceLabelWithoutFallbackV320(store);
    if (directLabel) return directLabel;

    const fallbackKm =
      storeDistanceFallbacksV320[getStoreDistanceKeyV320(store)];
    if (fallbackKm != null && Number.isFinite(fallbackKm)) {
      return formatDistanceKmV320(fallbackKm);
    }

    return "";
  }

  function findStoreForSelectionV320(chain: "S" | "K", mode: StoreMode) {
    const selectedId = getSelectedStoreIdFor(chain, mode);
    const selectedName = getSelectedStoreNameFor(chain, mode);

    return foundStores
      .map(normalizeStoreForPickerV320)
      .find(
        (store) =>
          getStoreChainV320(store) === chain &&
          Boolean(
            (selectedId && store.id === selectedId) ||
            (selectedName && store.name === selectedName),
          ),
      );
  }

  function uniqueStoresByIdAndName(stores: StoreSearchItem[]) {
    const seen = new Set<string>();
    const result: StoreSearchItem[] = [];

    for (const store of stores) {
      const key = store.id
        ? `${store.type || store.chain || ""}:${store.id}`
        : `${store.type || store.chain || ""}:${normalize(store.name || "")}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(store);
    }

    return result;
  }

  function getStoresForWithinChainPicker(
    chain: "S" | "K",
    slotMode: StoreMode,
  ) {
    // Ketjun sisällä: molemmat valintaikkunat näyttävät saman ketjun kaikki löydetyt kaupat.
    // Ainoa suodatus: toisessa slotissa jo valittu kauppa poistetaan, jotta vertailuun tulee kaksi eri kauppaa.
    const allChainStores = foundStores
      .map(normalizeStoreForPickerV320)
      .filter((store) => getStoreChainV320(store) === chain);

    const selectedId = getSelectedStoreIdFor(chain, slotMode);
    const selectedName = getSelectedStoreNameFor(chain, slotMode);
    const otherMode: StoreMode = slotMode === "hyper" ? "local" : "hyper";
    const otherSelectedId = getSelectedStoreIdFor(chain, otherMode);
    const otherSelectedName = getSelectedStoreNameFor(chain, otherMode);

    const fallbackStores = [
      ...getStoresForPicker(chain, "hyper"),
      ...getStoresForPicker(chain, "local"),
    ];

    return sortStoresForPickerV320(
      [...allChainStores, ...fallbackStores],
      slotMode,
      selectedId,
      selectedName,
    ).filter((store) => {
      if (otherSelectedId && store.id === otherSelectedId) return false;
      if (otherSelectedName && store.name === otherSelectedName) return false;
      return true;
    });
  }

  function getStoresForPickerContext(chain: "S" | "K", mode: StoreMode) {
    if (storeCompareScope === "within_chain")
      return getStoresForWithinChainPicker(chain, mode);
    return getStoresForPicker(chain, mode);
  }

  function renderStorePickerMenu(
    chain: "S" | "K",
    mode: StoreMode,
    pickerKey: string,
    compact: boolean,
  ) {
    if (openStorePicker !== pickerKey) return null;
    if (!storePickerCanOpenV366) return null;

    const options = getStoresForPickerContext(chain, mode);
    const selectedName = getSelectedStoreNameFor(chain, mode);
    const selectedId = getSelectedStoreIdFor(chain, mode);

    const menuTitle =
      storeCompareScope === "within_chain"
        ? `Valitse ${chain === "S" ? "S-ryhmän" : "K-ryhmän"} kauppa`
        : mode === "local"
          ? `Valitse ${chain === "S" ? "S-ryhmän" : "K-ryhmän"} lähikauppa`
          : `Valitse ${chain === "S" ? "S-ryhmän" : "K-ryhmän"} tavaratalo`;

    const selectFromPicker = (
      event:
        | React.MouseEvent<HTMLButtonElement>
        | React.PointerEvent<HTMLButtonElement>,
      store: StoreSearchItem,
    ) => {
      event.preventDefault();
      event.stopPropagation();

      const normalizedStore = normalizeStoreForPickerV320(store);
      if (getStoreChainV320(normalizedStore) !== chain) return;

      triggerHaptic();
      selectStoreForCurrentMode(normalizedStore, mode);
      window.setTimeout(() => setOpenStorePicker(null), 0);
    };

    const menuBody = (
      <>
        <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
          <p className="min-w-0 truncate text-[11px] font-black uppercase tracking-wide text-[#8a7349]">
            {menuTitle}
          </p>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpenStorePicker(null);
            }}
            className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1.5 text-[10px] font-black text-slate-600 active:scale-[0.98]"
          >
            Sulje
          </button>
        </div>

        <div
          className="max-h-[38dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] touch-pan-y"
          onTouchMove={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          {options.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-3 font-bold text-[#b7aa8d]">
              Ei kauppoja valittavana. Hae alue uudelleen.
            </p>
          ) : (
            options.map((store, index) => {
              const selected = Boolean(
                (selectedId && store.id === selectedId) ||
                (selectedName && store.name === selectedName),
              );
              const distanceLabel = getStoreDistanceLabelV320(store);

              return (
                <button
                  key={`${pickerKey}-${store.type || chain}-${store.id || index}-${normalize(store.name || "")}`}
                  type="button"
                  onClick={(event) => selectFromPicker(event, store)}
                  className={`mb-2 flex w-full touch-manipulation items-center justify-between gap-1 rounded-xl px-2 py-2.5 text-left font-extrabold transition last:mb-0 active:scale-[0.99] ${
                    selected
                      ? chain === "S"
                        ? "bg-green-700 text-white"
                        : "bg-red-700 text-white"
                      : "bg-slate-50 text-slate-700 active:bg-slate-100"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block whitespace-normal break-words text-[13px] leading-tight">
                      {store.name}
                    </span>
                    <span
                      className={`mt-1 block text-[11px] leading-tight ${selected ? "text-white/80" : "text-[#b7aa8d]"}`}
                    >
                      {[
                        store.city || activeArea.label || "",
                        store.postalCode || "",
                        distanceLabel,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {(selected || distanceLabel) && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${selected ? "bg-[#fff8df]/20 text-white" : "bg-[#fff8df] text-[#b7aa8d]"}`}
                    >
                      {selected ? "Valittu" : distanceLabel}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </>
    );

    if (typeof document === "undefined") return null;

    const portalContent = (
      <div
        className="fixed inset-0 z-[2147483647] bg-transparent ziiply-store-picker-fade"
        onClick={() => setOpenStorePicker(null)}
        onTouchMove={(event) => {
          event.preventDefault();
        }}
      >
        <div
          className="fixed left-1/2 overflow-hidden rounded-[1.35rem] bg-[#fff8df] p-1.5 text-left text-xs shadow-[0_18px_55px_rgba(15,23,42,0.28)] ring-1 ring-slate-200 ziiply-store-picker-panel-fade"
          style={{
            top: `${storePickerViewportStyle.top}px`,
            width: `${storePickerViewportStyle.width}px`,
            transform: "translateX(-50%)",
          }}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
        >
          {menuBody}
        </div>
      </div>
    );

    return createPortal(portalContent, document.body);
  }

  function renderStoreChoiceButton(
    chain: "S" | "K",
    mode: StoreMode,
    pickerKey: string,
    compact: boolean,
  ) {
    const options =
      storeCompareScope !== "within_chain" && !storeModeChosenV299
        ? []
        : getStoresForPickerContext(chain, mode);
    const hasMany = options.length > 1;

    return (
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!storePickerCanOpenV366) {
            setOpenStorePicker(null);
            if (usingOwnLocation && gpsCoordsV320 && foundStores.length > 0) {
              setLocationMessage(`${activeArea.label || "Sijainti"} käytössä`);
            } else {
              setLocationMessage(
                storeSearchLoading || gpsStoreLocationPendingV366 || gpsStorePickerBlockedV382
                  ? "Haetaan kauppoja sijainnin perusteella"
                  : "GPS ei vielä valmis",
              );
            }
            return;
          }
          if (!hasMany) {
            setOpenStorePicker(null);
            return;
          }
          setOpenStorePicker((current) =>
            current === pickerKey ? null : pickerKey,
          );
        }}
        className={`mt-1 rounded-full px-2 py-1 font-black ring-1 ${compact ? "text-[9px]" : "text-[10px]"} ${
          hasMany
            ? "bg-[#fff8df]/90 text-slate-700 ring-slate-200"
            : "bg-slate-100 text-[#b7aa8d] ring-slate-200"
        }`}
      >
        {hasMany ? "Vaihda" : "Valittu"}
      </button>
    );
  }

  const selectedRealChainCount =
    Number(Boolean(selectedChains.s)) + Number(Boolean(selectedChains.k));
  function renderComparedStoreCards(compact = false) {
    if (storeCompareScope === "none") {
      return null;
    }

    if (storeCompareScope === "within_chain" && !compact) {
      const chainCards = comparedStoreCards.filter(
        (store) => store.key === "s" || store.key === "k",
      );
      const selectedChainKey =
        withinChain === "S" ? "s" : withinChain === "K" ? "k" : null;

      return (
        <div className={compact ? (storeMode === "local" ? "mt-8" : "mt-0") : "mt-3"}>
          <div
            className={
              compact ? `${storeMode === "local" ? "pt-2 " : ""}grid grid-cols-2 gap-2` : "grid grid-cols-2 gap-3"
            }
          >
            {chainCards.map((store) => {
              const selected = selectedChainKey === store.key;
              const chain = store.key === "s" ? "S" : "K";
              const modeA: StoreMode = "hyper";
              const modeB: StoreMode = "local";
              const storeNameA =
                getSelectedStoreNameFor(chain, modeA) ||
                (chain === "S" ? "S-kauppa 1" : "K-kauppa 1");
              const storeNameB =
                getSelectedStoreNameFor(chain, modeB) ||
                (chain === "S" ? "S-kauppa 2" : "K-kauppa 2");
              const selectedStoreA = findStoreForSelectionV320(chain, modeA);
              const selectedStoreB = findStoreForSelectionV320(chain, modeB);
              const distanceA = getStoreDistanceLabelV320(selectedStoreA);
              const distanceB = getStoreDistanceLabelV320(selectedStoreB);

              return (
                <div
                  key={store.key}
                  className={`${compact ? "min-h-[7.8rem] rounded-xl p-2" : "rounded-2xl p-3"} relative border shadow-sm ring-1 transition ${
                    selected
                      ? `${store.selectedTone} ring-current/20`
                      : "border-slate-200 bg-white text-slate-600 ring-slate-200"
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      const nextChain = chain;
                      setWithinChain(nextChain);
                      setSelectedChains((current) => ({
                        ...current,
                        s: nextChain === "S",
                        k: nextChain === "K",
                        lidl: false,
                        tokmanni: false,
                      }));
                      setOpenStorePicker(null);
                      setLocationMessage(
                        `${store.title} valittu ketjun sisäiseen vertailuun. Valitse kaksi vertailtavaa kauppaa.`,
                      );
                    }}
                    className="w-full text-center"
                  >
                    <span
                      className={`absolute ${compact ? "right-2 top-2 h-5 w-5 text-[10px]" : "right-3 top-3 h-6 w-6 text-xs"} flex items-center justify-center rounded-full font-black ${
                        selected
                          ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white"
                          : "bg-slate-100 text-slate-300"
                      }`}
                    >
                      {selected ? "✓" : ""}
                    </span>
                    <div
                      className={`absolute left-2 top-2 z-30 flex items-center justify-center rounded-xl bg-white p-1.5 shadow-md ring-1 ring-slate-200 ${compact ? "h-8 w-8" : "h-9 w-9"}`}
                    >
                      <img
                        src={store.key === "s" ? "/storelogos/s-group.png" : "/storelogos/k-group.png"}
                        alt={store.title}
                        draggable={false}
                        className="h-full w-full object-contain"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                    <div className={compact ? "h-9" : "h-10"} aria-hidden="true" />
                    <p
                      className={
                        compact
                          ? "mt-0 text-[9px] font-black uppercase tracking-tight text-slate-500"
                          : "mt-0 text-[10px] font-black uppercase tracking-wide text-slate-500"
                      }
                    >
                      {store.title}
                    </p>
                  </button>

                  {selected && (
                    <div
                      className={
                        compact
                          ? "mt-1.5 grid grid-cols-2 gap-1.5"
                          : "mt-2 grid grid-cols-2 gap-1.5"
                      }
                    >
                      <div
                        className={
                          compact
                            ? "relative rounded-lg bg-white/90 px-1.5 py-1 text-center ring-1 ring-slate-200"
                            : "relative rounded-xl bg-white/80 p-1.5 text-center ring-1 ring-slate-200"
                        }
                      >
                        <p className="text-[9px] font-black uppercase text-slate-400">
                          Kauppa 1
                        </p>
                        <p
                          className={
                            compact
                              ? "min-h-[2.1rem] whitespace-normal break-words text-[9px] font-extrabold leading-tight text-slate-800"
                              : "min-h-[2.7rem] whitespace-normal break-words text-[11px] font-extrabold leading-tight text-slate-800"
                          }
                        >
                          {storeNameA}
                        </p>
                        {distanceA && (
                          <p className="mt-0 text-[9px] font-black text-slate-400">
                            {distanceA}
                          </p>
                        )}
                        {renderStoreChoiceButton(
                          chain,
                          modeA,
                          `${store.key}-within-hyper`,
                          compact,
                        )}
                        {renderStorePickerMenu(
                          chain,
                          modeA,
                          `${store.key}-within-hyper`,
                          compact,
                        )}
                      </div>
                      <div
                        className={
                          compact
                            ? "relative rounded-lg bg-white/90 px-1.5 py-1 text-center ring-1 ring-slate-200"
                            : "relative rounded-xl bg-white/80 p-1.5 text-center ring-1 ring-slate-200"
                        }
                      >
                        <p className="text-[9px] font-black uppercase text-slate-400">
                          Kauppa 2
                        </p>
                        <p
                          className={
                            compact
                              ? "min-h-[2.1rem] whitespace-normal break-words text-[9px] font-extrabold leading-tight text-slate-800"
                              : "min-h-[2.7rem] whitespace-normal break-words text-[11px] font-extrabold leading-tight text-slate-800"
                          }
                        >
                          {storeNameB}
                        </p>
                        {distanceB && (
                          <p className="mt-0 text-[9px] font-black text-slate-400">
                            {distanceB}
                          </p>
                        )}
                        {renderStoreChoiceButton(
                          chain,
                          modeB,
                          `${store.key}-within-local`,
                          compact,
                        )}
                        {renderStorePickerMenu(
                          chain,
                          modeB,
                          `${store.key}-within-local`,
                          compact,
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (compact) {
      const topStores = comparedStoreCards.filter(
        (store) => store.key === "s" || store.key === "k",
      );
      const bottomStores =
        storeCompareScope === "within_chain"
          ? []
          : comparedStoreCards.filter(
              (store) => store.key !== "s" && store.key !== "k",
            );


      const renderBetweenChainCard = (
        store: (typeof comparedStoreCards)[number],
        isTopRow: boolean,
      ) => {
        const isRealChain = store.key === "s" || store.key === "k";
        const chain = store.key === "s" ? "S" : store.key === "k" ? "K" : null;
        const selected =
          storeCompareScope === "within_chain" && chain
            ? withinChain === chain
            : Boolean(selectedChains[store.key]);
        const selectedStoreForCard = chain
          ? findStoreForSelectionV320(chain, storeMode)
          : null;
        const distanceForCard = chain
          ? getStoreDistanceLabelV320(selectedStoreForCard)
          : "";
        const pickerKey = chain
          ? `${store.key}-${storeMode}-between`
          : `${store.key}-coming-soon`;
        const isComingSoon = Boolean(store.comingSoon);

        const cardTone =
          store.key === "s"
            ? selected
              ? "border-[#076b3a] bg-[linear-gradient(180deg,#fbffdf_0%,#eef7c1_48%,#dbeaa4_100%)] text-[#17382b] shadow-[0_4px_0_rgba(80,58,25,0.16),0_10px_16px_rgba(39,88,44,0.09),inset_0_0_0_2px_rgba(255,255,255,0.68)]"
              : "border-[#d3b673] bg-[linear-gradient(180deg,#fff8dc_0%,#f7ebc3_100%)] text-[#5f4b25] shadow-[0_2px_0_rgba(94,71,31,0.10),inset_0_0_0_1px_rgba(255,255,255,0.66)]"
            : store.key === "k"
              ? selected
                ? "border-[#8e4a35] bg-[linear-gradient(180deg,#fff7e3_0%,#f7dfb8_54%,#edca93_100%)] text-[#17382b] shadow-[0_4px_0_rgba(80,58,25,0.16),0_10px_16px_rgba(120,50,20,0.08),inset_0_0_0_2px_rgba(255,255,255,0.64)]"
                : "border-[#d3b673] bg-[linear-gradient(180deg,#fff8dc_0%,#f7ebc3_100%)] text-[#5f4b25] shadow-[0_2px_0_rgba(94,71,31,0.10),inset_0_0_0_1px_rgba(255,255,255,0.66)]"
              : selected
                ? "border-[#c2a15d] bg-[linear-gradient(180deg,#fff6d6_0%,#ead9ad_100%)] text-[#76633f] opacity-88 shadow-[0_2px_0_rgba(94,71,31,0.10),inset_0_0_0_1px_rgba(255,255,255,0.60)]"
                : "border-[#dec88f] bg-[linear-gradient(180deg,#fff8dd_0%,#f4e8c3_100%)] text-[#9b875f] opacity-50";

        const logoTone =
          store.key === "s"
            ? "bg-[#009A36] text-white ring-[#DFF5E7]"
            : store.key === "k"
              ? "bg-[#E3000F] text-white ring-[#FFE0E0]"
              : store.key === "lidl"
                ? "bg-[#6D95F8] text-white ring-[#E9F0FF]"
                : "bg-[#F5D75C] text-[#344054] ring-[#FFF4BF]";

        const cardLabel =
          store.key === "s"
            ? "S-RYHMÄ"
            : store.key === "k"
              ? "K-RYHMÄ"
              : store.key === "lidl"
                ? "LIDL"
                : "TOKMANNI";

        const storeLogoSrc =
          store.key === "s"
            ? "/storelogos/s-group.png"
            : store.key === "k"
              ? "/storelogos/k-group.png"
              : store.key === "lidl"
                ? "/storelogos/lidl.png"
                : "/storelogos/spar.png";

        const displayName =
          storeCompareScope === "within_chain" && chain
            ? selected
              ? store.title
              : `Valitse ${store.title}`
            : !storeModeChosenV299 && chain
              ? "Vertailuparia ei löytynyt"
              : isComingSoon
                ? "Tulossa"
                : store.name;

        return (
          <div
            key={store.key}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            onClick={() => {
              if (storeCompareScope === "within_chain" && chain) {
                setWithinChain(chain);
                setSelectedChains((current) => ({
                  ...current,
                  s: chain === "S",
                  k: chain === "K",
                  lidl: false,
                  tokmanni: false,
                }));
              } else {
                setSelectedChains((current) => ({
                  ...current,
                  [store.key]: !current[store.key],
                }));
              }
              setOpenStorePicker(null);
              triggerHaptic();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              if (storeCompareScope === "within_chain" && chain) {
                setWithinChain(chain);
                setSelectedChains((current) => ({
                  ...current,
                  s: chain === "S",
                  k: chain === "K",
                  lidl: false,
                  tokmanni: false,
                }));
              } else {
                setSelectedChains((current) => ({
                  ...current,
                  [store.key]: !current[store.key],
                }));
              }
              setOpenStorePicker(null);
              triggerHaptic();
            }}
            className={`relative cursor-pointer overflow-hidden rounded-[1.18rem] border-[2.5px] px-2 pb-1 pt-1 text-center transition active:scale-[0.985] h-[104px] min-h-[104px] max-h-[104px] shadow-[0_3px_0_rgba(94,71,31,0.12),0_9px_14px_rgba(52,38,14,0.06),inset_0_0_0_1px_rgba(255,255,255,0.76)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.42),transparent_58%)] after:pointer-events-none after:absolute after:inset-[4px] after:rounded-[0.95rem] after:border after:border-white/35 ${cardTone}`}
          >
            <span
              className={`absolute right-2 top-2 z-30 flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-black shadow-[0_3px_7px_rgba(15,23,42,0.14)] ${selected ? "border border-[#063d22] bg-[radial-gradient(circle_at_35%_25%,#2ca85a_0%,#08743a_48%,#064928_100%)] text-[#fff7de]" : "border border-[#d0ad68] bg-[#fff8dc] text-transparent"}`}
            >
              ✓
            </span>

            <div
              className="absolute left-3 top-2.5 z-30 flex h-7 w-7 items-center justify-center rounded-xl border border-[#d0ad68] bg-[linear-gradient(180deg,#fffdf0_0%,#fff3cf_100%)] p-1 shadow-[0_2px_0_rgba(94,71,31,0.11),inset_0_1px_0_rgba(255,255,255,0.82)] ring-1 ring-[#fff1bf]"
            >
              <img
                src={storeLogoSrc}
                alt={cardLabel}
                draggable={false}
                className="h-full w-full object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>

            <div className="h-7" aria-hidden="true" />

            {store.key !== "s" && store.key !== "k" && (
              <p
                className="mx-auto mt-0 max-w-[72%] font-black uppercase tracking-wide text-slate-400 text-[8px]"
              >
                {cardLabel}
              </p>
            )}

            <>
              <p
                className={`absolute left-3 right-3 top-[39px] z-20 mx-auto h-[1.45rem] max-w-[7.9rem] overflow-hidden text-center text-[10px] font-black leading-tight ${
                  isComingSoon ? "text-[#aaa087]" : "text-[#132338]"
                }`}
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {displayName}
              </p>

              {isTopRow && distanceForCard && storeModeChosenV299 && storeCompareScope !== "within_chain" && (
                <p className="absolute left-0 right-0 top-[59px] z-20 text-[8.5px] font-black leading-none text-[#8a7247]">
                  {distanceForCard}
                </p>
              )}

              <div
                className="absolute bottom-[6px] left-0 right-0 z-30 flex justify-center"
                onClick={(event) => event.stopPropagation()}
              >
                {storeCompareScope === "within_chain" && chain ? (
                  <span className="rounded-full border border-[#d6bd82] bg-[linear-gradient(180deg,#fffaf0_0%,#f4e6bd_100%)] px-2.5 py-[3px] text-[8.5px] font-black text-[#9a8354] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] ring-1 ring-[#fff1bf]">
                    {selected ? "Valittu" : "Valitse"}
                  </span>
                ) : !storeModeChosenV299 && chain ? (
                  <span className="rounded-full border border-[#d6bd82] bg-[linear-gradient(180deg,#fffaf0_0%,#f4e6bd_100%)] px-2.5 py-[3px] text-[8.5px] font-black text-[#9a8354] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] ring-1 ring-[#fff1bf]">
                    Valitse tyyppi
                  </span>
                ) : chain ? (
                  isTopRow ? (
                    <>
                      {renderStoreChoiceButton(
                        chain,
                        storeMode,
                        pickerKey,
                        true,
                      )}
                      {renderStorePickerMenu(chain, storeMode, pickerKey, true)}
                    </>
                  ) : (
                    <span className="rounded-full border border-[#d6bd82] bg-[linear-gradient(180deg,#fffaf0_0%,#f4e6bd_100%)] px-2.5 py-[3px] text-[8.5px] font-black text-[#9a8354] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] ring-1 ring-[#fff1bf]">
                      Tulossa
                    </span>
                  )
                ) : (
                  <span className="rounded-full border border-[#d6bd82] bg-[#fff7dc] px-2.5 py-1 text-[9px] font-black text-[#9a8354] ring-1 ring-[#fff1bf]">
                    Tulossa
                  </span>
                )}
              </div>
            </>
          </div>
        );
      };

      return (
        <div className="mt-2 pb-1 overflow-visible">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 overflow-visible">
            {topStores.map((store) => renderBetweenChainCard(store, true))}
          </div>
          {bottomStores.length > 0 && (
            <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {bottomStores.map((store) => renderBetweenChainCard(store, false))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={`${storeMode === "local" ? "mt-5" : "mt-3"} grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4`}>
        {comparedStoreCards.map((store) => {
          const isRealChain = store.key === "s" || store.key === "k";
          const selected = Boolean(selectedChains[store.key]);
          const chain =
            store.key === "s" ? "S" : store.key === "k" ? "K" : null;
          const pickerKey = `${store.key}-${storeMode}`;
          const selectedStoreForCard = chain
            ? findStoreForSelectionV320(chain, storeMode)
            : null;
          const distanceForCard =
            getStoreDistanceLabelV320(selectedStoreForCard);
          const isComingSoon = Boolean(store.comingSoon);

          const cardTone =
            store.key === "s"
              ? selected
                ? "border-[#08A343] bg-[#EEF9F2] text-[#1F2B42] shadow-[0_5px_16px_rgba(8,163,67,0.16)]"
                : "border-[#d9c79a] bg-[#fff9ea] text-[#6f6b59] opacity-70"
              : store.key === "k"
                ? selected
                  ? "border-[#E3000F] bg-[#FFF1F1] text-[#1F2B42] shadow-[0_5px_16px_rgba(227,0,15,0.13)]"
                  : "border-[#d9c79a] bg-[#fff9ea] text-[#6f6b59] opacity-70"
                : selected
                  ? "border-[#d9c79a] bg-[#f5ead0] text-[#6f6b59] opacity-90"
                  : "border-[#d9c79a] bg-[#fff9ea] text-[#6f6b59] opacity-60";

          const logoTone =
            store.key === "s"
              ? "bg-[#009A36] text-white ring-[#DFF5E7]"
              : store.key === "k"
                ? "bg-[#E3000F] text-white ring-[#FFE0E0]"
                : store.key === "lidl"
                  ? "bg-[#6D95F8] text-white ring-[#E9F0FF]"
                  : "bg-[#F5D75C] text-[#344054] ring-[#FFF4BF]";

          const cardLabel =
            store.key === "s"
              ? "S-RYHMÄ"
              : store.key === "k"
                ? "K-RYHMÄ"
                : store.key === "lidl"
                  ? "LIDL"
                  : "TOKMANNI";

          const storeLogoSrc =
            store.key === "s"
              ? "/storelogos/s-group.png"
              : store.key === "k"
                ? "/storelogos/k-group.png"
                : store.key === "lidl"
                  ? "/storelogos/lidl.png"
                  : "/storelogos/spar.png";

          return (
            <div
              key={store.key}
              className={`relative flex h-[152px] min-h-0 flex-col items-center justify-start rounded-[1.55rem] border-[3px] px-2 pb-1.5 pt-1.5 text-center shadow-[0_4px_0_rgba(89,65,27,0.12),inset_0_0_0_1px_rgba(255,255,255,0.5)] transition active:scale-[0.985] ${cardTone}`}
            >
              <button
                type="button"
                aria-pressed={selected}
                disabled={false}
                onClick={() => {
                  setSelectedChains((current) => ({
                    ...current,
                    [store.key]: !current[store.key],
                  }));
                  setOpenStorePicker(null);
                }}
                className="flex w-full flex-1 flex-col items-center justify-start text-center"
              >
                <span
                  className={`absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-base font-black shadow-[0_4px_10px_rgba(15,23,42,0.18)] ${
                    selected
                      ? "bg-[#008C35] text-white"
                      : "bg-slate-50 text-transparent"
                  }`}
                >
                  ✓
                </span>

                <div className="absolute left-2.5 top-2.5 z-30 flex h-9 w-9 items-center justify-center rounded-xl bg-white p-1.5 shadow-md ring-1 ring-slate-200">
                  <img
                    src={storeLogoSrc}
                    alt={cardLabel}
                    draggable={false}
                    className="h-full w-full object-contain"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                </div>

                <div className="h-8" aria-hidden="true" />

                {store.key !== "s" && store.key !== "k" && (
                  <p className="mt-0 text-[11px] font-black uppercase tracking-wide text-slate-400">
                    {cardLabel}
                  </p>
                )}

                <p
                  className={`absolute left-4 right-4 top-[54px] mx-auto max-w-[8.8rem] whitespace-normal break-words text-center text-[11px] font-black leading-tight ${
                    isComingSoon ? "text-[#aaa087]" : "text-[#132338]"
                  }`}
                >
                  {isComingSoon ? "Tulossa" : store.name}
                </p>

                {isRealChain && distanceForCard && (
                  <p className="absolute left-0 right-0 top-[88px] text-[10px] font-black text-slate-400">
                    {distanceForCard}
                  </p>
                )}
              </button>

              {!compact && isRealChain && chain && selected && (
                <div
                  onClick={(event) => event.stopPropagation()}
                  className="absolute bottom-[10px] left-0 right-0 z-20 block"
                >
                  {renderStoreChoiceButton(
                    chain,
                    storeMode,
                    pickerKey,
                    compact,
                  )}
                  {renderStorePickerMenu(chain, storeMode, pickerKey, compact)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <section
        className={`hidden xl:block h-[100dvh] overflow-hidden bg-[#efe5cf] px-2 py-2 text-[#1f2619] ${suppressUiForEanClose ? "pointer-events-none" : ""}`}
      >
        <style>{`
          html, body, #__next { background: #efe5cf !important; }
        `}</style>

        {showLaunchScreen && <ZiiplyLaunchScreen appVersion={APP_VERSION} />}

        {!showLaunchScreen && (
          <div className="mx-auto grid h-full max-w-[1540px] grid-rows-[auto_minmax(0,1fr)] gap-2">
            <header className="h-[6.2rem] rounded-[1.6rem] border-[5px] border-[#073b2d] bg-[#fff4d8] p-2 shadow-[0_5px_0_#073b2d]">
              <div className="grid grid-cols-[150px_minmax(0,1fr)_320px] items-stretch gap-2">
                <div className="flex items-center justify-center overflow-hidden rounded-[1.4rem] border border-[#d7bd87] bg-[#fffaf0] px-4">
                  <img
                    src="/ziiplylogo_mobile.png"
                    alt="Ziiply"
                    className="h-14 w-auto object-contain"
                  />
                </div>

                <div className="grid grid-cols-4 overflow-hidden rounded-[1.4rem] border border-[#d7bd87] bg-[#fffaf0]">
                  {[
                    { id: "weather", label: "SÄÄ", value: "+18°", emoji: "🌤️" },
                    {
                      id: "electricity",
                      label: "SÄHKÖ",
                      value: "4,2",
                      emoji: "⚡",
                    },
                    { id: "fuel", label: "BENSA", value: "1,65", emoji: "⛽" },
                    { id: "calendar", label: "KAL", value: "3", emoji: "📅" },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-center gap-3 border-r border-[#d7bd87] px-4 last:border-r-0"
                    >
                      <span className="text-4xl">{item.emoji}</span>
                      <div>
                        <p className="text-sm font-black text-[#003B2E]">
                          {item.label}
                        </p>
                        <p className="text-3xl font-black text-[#003B2E]">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSearchPanelOpen(false);
                    setCartModalOpen(false);
                    setCartSavePanelOpen(false);
                    setEanModalOpen(false);
                    setActiveResult("none");
                    setShopsPanelOpen(true);
                  }}
                  className="flex min-w-0 items-center gap-4 rounded-[1.4rem] border border-[#d7bd87] bg-[#fffaf0] px-5 text-left text-[#003B2E]"
                >
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ring-1 ${usingOwnLocation ? "bg-green-50 ring-green-200" : "bg-red-50 ring-red-200"}`}>
                    📍
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xl font-black leading-tight">
                      {activeArea.label}
                    </span>

                  </span>
                </button>
              </div>
            </header>

            <div className="grid min-h-0 grid-cols-[0.62fr_1.72fr_1.28fr] gap-2 overflow-hidden">
              <aside className="min-h-0 space-y-2 overflow-y-auto pr-1">
                <section className="h-[6.2rem] rounded-[1.6rem] border border-[#d6bf8f] bg-[#fff8e8] px-5 py-6 text-center shadow-[0_3px_0_rgba(7,59,45,0.16)] ring-1 ring-white/60">
                  <p
                    className="text-[2.05rem] font-black italic leading-[0.95] tracking-[-0.055em] text-[#28492e]"
                    style={{ fontFamily: '"Cooper Black", "Cooper Std Black", Georgia, serif' }}
                  >
                    Viilaa ruokakorisi
                    <br />
                    huokeammaks
                  </p>
                  <div className="mx-auto my-4 h-[3px] w-20 rounded-full bg-[#d6bf8f]" />
                  <p
                    className="text-[1rem] font-bold leading-snug text-[#6f6b59]"
                    style={{ fontFamily: 'Trebuchet MS, Arial, sans-serif' }}
                  >
                    Gösta ja Justiina auttavat
                    <br />
                    arjen valinnoissa.
                  </p>
                </section>

                <section className="relative overflow-hidden rounded-[2.1rem] border-[3px] border-[#bfa063] bg-[#fbf3d8] p-3 shadow-[0_5px_0_rgba(80,58,25,0.14),0_16px_24px_rgba(45,31,12,0.10),inset_0_0_0_2px_rgba(255,252,235,0.72)] ring-1 ring-[#fff7df]/80">
                  <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:radial-gradient(#c9ad6b_0.85px,transparent_0.85px)] [background-size:17px_17px]" />
                  <div className="relative z-10">
                    <ZiiplyMobileStoreModeSelector
                      storeMode={storeMode}
                      storeModeChosen={storeModeChosenV299}
                      storeCompareScope={storeCompareScope}
                      withinChain={withinChain}
                      selectedRealChainCount={selectedRealChainCount}
                      missingStoresMessageVisible={false}
                      foundStoresCount={foundStores.length}
                      hyperStorePairMissing={hyperStorePairMissingV391}
                      onStoreModeChange={handleStoreModeChange}
                      onStoreCompareScopeChange={handleStoreCompareScopeChange}
                      onWithinChainChange={setWithinChain}
                    />
                  </div>

                  <div className="relative z-10 mt-3">
                    {renderComparedStoreCards(true)}
                  </div>
                </section>
              </aside>

              <main className="min-h-0 space-y-2 overflow-y-auto pr-1">
                <div className="relative z-10 overflow-hidden rounded-[36px]">
                  <ZiiplyStoreLocaCard
                    locationInput={locationInput}
                    onLocationInputChange={(nextValue) => {
                      setLocationInput(nextValue);
                      if (nextValue.trim()) {
                        pushGpsDebugLogV492("GPS BUTTON -> OFF");
                  gpsUserDisabledRefV306.current = true;
                        setUsingOwnLocation(false);
                      }
                      setLocationMessage("Kirjoita alue tai postinumero");
                    }}
                    
                    // V486: GPS-nappi pois testistä; automaattinen boot-startti hoitaa paikannuksen.
                    onUseOwnLocation={() => undefined}
                    onDisableOwnLocation={() => undefined}
                    onOpenShops={() => {
                      setCartModalOpen(false);
                      setCartSavePanelOpen(false);
                      setEanModalOpen(false);
                      closeProductSelectionOverlay();
                      setSearchPanelOpen(false);
                      setShopsPanelOpen(true);
                    }}
                    onOpenMap={() => {
                      setMapStoresOverlayOpenV433(true);
                    }}
                    usingOwnLocation={usingOwnLocation}
                    locationMessage={
                      usingOwnLocation && !storeSearchLoading && !gpsErrorMessage
                        ? `${activeArea.label || "Sijainti"} käytössä`
                        : formatLocationNoticeV465(locationMessage)
                    }
                    locationMessageVisible={true}
                    storeSearchLoading={storeSearchLoading}
                    placeholder="05510 tai Hyvinkää"
                  />
                </div>

                <ZiiplySearchCard
                  className="z-20"
                  value={input}
                  onChange={setSearchInputForMode}
                  mode={searchCompareMode}
                  onModeChange={setSearchCompareMode}
                  onAddFromNotebook={() => void pasteFromClipboardToSearch()}
                  onScan={() => openDesktopScanner()}
                  onGostaSearch={handleGostaOfferSearch}
                  onJustiinaSearch={handleJustiinaProductSearch}
                  chips={instantSearchSuggestions.map((suggestion) => ({
                    id: suggestion.label,
                    label: suggestion.label,
                    onClick: () => applyInstantSearchSuggestion(suggestion.label),
                  }))}
                  instructionText="Justiina ehdottaa sopivia hakusanoja kirjoituksen mukaan."
                  notFoundTerms={notFoundSearchTerms}
                  gostaLoading={loadingOffers}
                  justiinaLoading={loadingNormal || singleProductCompareLoading}
                  activePanel={
                    activeResult === "compare"
                      ? "compare"
                      : filteredOffers.length > 0 ||
                          visibleNormalResults.length > 0 ||
                          singleProductCompareResults.length > 0
                        ? "results"
                        : "none"
                  }
                  onOpenResults={() => setActiveResult((current) => current === "offers" ? "none" : "offers")}
                  onOpenCompare={() => {
                    if (activeResult === "compare") {
                      setActiveResult("none");
                      return;
                    }
                    if (cart.length > 0 && !comparisonLoading) {
                      void updateChainComparison(cart, { openCompare: true });
                      return;
                    }
                    setActiveResult("compare");
                  }}
                  resultsPanel={
                    <div className="space-y-3">
                      {loadingOffers ? null : activeResult === "offers" && filteredOffers.length > 0 ? (
                        filteredOffers.slice(0, 12).map((item) => {
                          const product = offerToProduct(item);
                          return (
                            <div
                              key={`desktop-offer-card-${item.id}`}
                              className="rounded-[1.2rem] border-2 border-[#d5bd82] bg-[#fff3d5] p-3 shadow-[0_3px_0_rgba(113,82,31,0.16),inset_0_0_0_1px_rgba(255,255,255,0.55)]"
                            >
                              <div className="flex items-center gap-3">
                                {product.pictureUrl && (
                                  <img
                                    src={product.pictureUrl}
                                    alt=""
                                    className="h-16 w-16 shrink-0 rounded-xl bg-[#fff8df] object-contain"
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="line-clamp-2 text-base font-black leading-tight text-[#1f2619]">
                                    {fixText(product.name)}
                                  </p>
                                  <p className="text-xs font-bold text-[#6f6b59]">
                                    {item.storeName} · {formatEuro(getProductPrice(product))}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addOfferToCart(item)}
                                  className={`rounded-xl px-3 py-2 text-xs font-black text-white transition ${justAdded === item.id ? "bg-emerald-700" : "bg-green-600 hover:bg-green-700"}`}
                                >
                                  {justAdded === item.id ? "✓ Lisätty" : "Lisää"}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : loadingNormal || singleProductCompareLoading ? null : visibleNormalResults.length > 0 ? (
                        visibleNormalResults.slice(0, 12).map((product) => (
                          <div
                            key={`desktop-product-card-${product.id}-${product.ean || product.name}`}
                            className="flex items-center gap-3 rounded-[1.2rem] border-2 border-[#d5bd82] bg-[#fff3d5] p-3 shadow-[0_3px_0_rgba(113,82,31,0.16),inset_0_0_0_1px_rgba(255,255,255,0.55)]"
                          >
                            {product.pictureUrl && (
                              <img
                                src={product.pictureUrl}
                                alt=""
                                className="h-16 w-16 shrink-0 rounded-xl bg-[#fff8df] object-contain"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-base font-black leading-tight text-[#1f2619]">
                                {fixText(product.name)}
                              </p>
                              <p className="text-xs font-bold text-[#6f6b59]">
                                {formatEuro(getProductPrice(product))}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addProductToCart(product)}
                              className="rounded-xl bg-green-600 px-3 py-2 text-xs font-black text-white"
                            >
                              Lisää
                            </button>
                          </div>
                        ))
                      ) : singleProductCompareResults.length > 0 ? (
                        singleProductCompareResults.slice(0, 12).map((result, index) => (
                          <div
                            key={`desktop-single-card-${index}-${result.chain}-${result.storeName}-${result.productName}`}
                            className="rounded-[1.2rem] border-2 border-[#d5bd82] bg-[#fff3d5] p-3 shadow-[0_3px_0_rgba(113,82,31,0.16),inset_0_0_0_1px_rgba(255,255,255,0.55)]"
                          >
                            <p className="truncate text-sm font-black text-[#1f2619]">
                              {fixText(result.productName)}
                            </p>
                            <p className="text-xs font-bold text-[#6f6b59]">
                              {result.storeName} · {formatEuro(result.price)}
                            </p>
                          </div>
                        ))
                      ) : hasSearchedOffers ? null : null}
                    </div>
                  }
                  comparePanel={
                    <ZiiplyCompareCard
                      stores={chainResults
                        .filter((result) => !result.comingSoon)
                        .map((result) => ({
                          id: result.key,
                          name: result.storeName || result.chain,
                          chain: result.key === "s" ? "S" : result.key === "k" ? "K" : undefined,
                          totalPrice: Math.round((result.totalPrice || 0) * 100),
                          itemCount: result.foundItems,
                          isBest: cheapest?.key === result.key,
                          badge: result.missingItems > 0 ? `${result.missingItems} puuttuu` : "Täysi kori",
                        }))}
                      title="Vertailu"
                      subtitle={cart.length > 0 ? `${cart.length} tuotetta korissa` : "Lisää tuotteita koriin ja vertaile kauppoja"}
                      loading={comparisonLoading}
                    />
                  }
                />


              </main>

              <aside className="min-h-0">
                <div className="ziiply-cart-retro-fix h-full min-h-0 space-y-2 overflow-y-auto pr-1">
                  <ZiiplyCartCard
                    cart={cart}
                    shoppingListItems={shoppingListItems}
                    checkedCartItems={checkedCartItems}
                    checkedCount={checkedCount}
                    shoppingListCount={shoppingListCount}
                    shoppingProgressPercent={shoppingProgressPercent}
                    cheapest={cheapest}
                    secondCheapest={secondCheapest}
                    savings={savings}
                    savingsPercent={savingsPercent}
                    bestShoppingListGroups={bestShoppingListGroups}
                    getShoppingListItemKey={getShoppingListItemKey}
                    toggleShoppingListItem={toggleShoppingListItem}
                    onToggleShoppingListItem={toggleShoppingListItem}
                    onToggleCollected={toggleShoppingListItem}
                    markAllShoppingListItemsChecked={markAllShoppingListItemsChecked}
                    clearShoppingListChecks={clearShoppingListChecks}
                    formatEuro={formatEuro}
                    fixText={fixText}
                    setCheckedCartItems={setCheckedCartItems}
                    shoppingItemRefs={shoppingItemRefs}
                    onIncreaseQuantity={(itemId: string) => changeQuantity(itemId, 1)}
                    onDecreaseQuantity={(itemId: string) => changeQuantity(itemId, -1)}
                    onRemoveItem={removeCartItem}
                    onAddMore={openSearchPanel}
                    onClearCart={clearCart}
                    onCompare={() => {
                      if (!cart.length || comparisonLoading) return;
                      void updateChainComparison(cart, { openCompare: true });
                    }}
                    cartSavePanelOpen={cartSavePanelOpen}
                    onToggleSavePanel={() => setCartSavePanelOpen((value) => !value)}
                    savedListName={savedListName}
                    setSavedListName={setSavedListName}
                    onSaveCurrentCartAsList={saveCurrentCartAsList}
                    savedShoppingLists={savedShoppingLists}
                    onAddSavedListToCart={addSavedListToCart}
                    onDeleteSavedShoppingList={deleteSavedShoppingList}
                  />
                </div>
              </aside>
            </div>
          </div>
        )}

        {eanModalOpen && (
          <div
            className={`fixed inset-0 z-[120] hidden items-center justify-center overflow-y-auto bg-[#13251b]/78 px-4 py-5 backdrop-blur-sm xl:flex ${eanModalClosing ? "ziiply-soft-close" : "ziiply-soft-open"}`}
          >
            <div className="relative w-full max-w-[58rem] overflow-hidden rounded-[2.25rem] border-4 border-[#d5b982] bg-[#f7ead0] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] ring-4 ring-[#263b24]/50">
              <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:radial-gradient(#6f5a31_1px,transparent_1px)] [background-size:14px_14px]" />
              <div className="relative rounded-[1.7rem] border border-[#b99e67] bg-[#fbf2dc]/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <div className="grid grid-cols-[14rem_1fr] gap-4">
                  <aside className="space-y-4">
                    <div>
                      <p className="font-serif text-[3.25rem] font-black italic leading-[0.88] text-[#31402c] drop-shadow-sm">
                        Skanneri
                      </p>
                    </div>

                    <div className="rounded-[1.2rem] border-2 border-[#7b5f32] bg-[#efe0bf] p-4 text-[#2e2b21] shadow-[inset_0_0_0_3px_rgba(255,255,255,0.35)]">
                      <p className="font-serif text-2xl font-black italic text-[#2f3d28]">
                        Näin se toimii:
                      </p>
                      <div className="mt-4 space-y-4 text-sm font-bold leading-tight">
                        <div className="flex gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#465638] text-white">1</span>
                          <span>Ota kuva kuitista tai tuotteesta</span>
                        </div>
                        <div className="flex gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#465638] text-white">2</span>
                          <span>Skanneri etsii hinnat ja hinnanhuojennukset</span>
                        </div>
                        <div className="flex gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#465638] text-white">3</span>
                          <span>Säästöt näkyviin heti</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.2rem] border-2 border-[#7b5f32] bg-[#efe0bf] p-4 text-center shadow-[inset_0_0_0_3px_rgba(255,255,255,0.35)]">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#4c4633]">
                        Tänään skannattu
                      </p>
                      <div className="mt-3 grid grid-cols-2 divide-x divide-[#b99e67]">
                        <div>
                          <p className="text-4xl font-black text-[#3f4935]">
                            {Math.max(0, eanResults.length)}
                          </p>
                          <p className="text-xs font-bold text-[#5d5845]">osumaa</p>
                        </div>
                        <div>
                          <p className="text-4xl font-black text-[#3f4935]">
                            {cart.length}
                          </p>
                          <p className="text-xs font-bold text-[#5d5845]">korissa</p>
                        </div>
                      </div>
                      <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-[#4c4633]">
                        Säästöpotentiaali
                      </p>
                      <p className="text-4xl font-black text-[#5f7a45]">
                        {formatEuro(savings > 0 ? savings : 0)}
                      </p>
                    </div>
                  </aside>

                  <main className="min-w-0">
                    <div className="mb-3 grid grid-cols-[1fr] gap-3">
                      <div>
                        <p className="flex min-h-[4.25rem] items-center rounded-2xl bg-[#efe0bf] px-5 py-3 font-serif text-[1.45rem] italic leading-tight text-[#31402c] shadow-sm">
                          {desktopKeyboardScannerOpen
                            ? "Piippaa tuote lukijalla. Ziiply lukee koodin kuin näppäimistösyötön."
                            : eanScannerOpen
                              ? "Kuva otetaan, hinnanhuojennukset talteen. Säästöt esiin!"
                              : "Valitse skannaustapa: kamera tai erillinen viivakoodinlukija."}
                        </p>
                      </div>
                    </div>

                    {eanScannerMessage && (
                      <div className="mb-3 rounded-2xl bg-[#f2e3c4] px-4 py-3 text-sm font-black leading-snug text-[#4f4733] ring-1 ring-[#d8bd86]">
                        {eanScannerMessage}
                      </div>
                    )}

                    {!eanScannerOpen && !desktopKeyboardScannerOpen && (
                      <div className="grid min-h-[26rem] grid-cols-2 gap-4 rounded-[2rem] border-[6px] border-[#7b5f32] bg-[#efe0bf] p-5 shadow-[inset_0_0_0_3px_rgba(255,255,255,0.35),0_10px_20px_rgba(0,0,0,0.16)]">
                        <button
                          type="button"
                          onClick={() => void openDesktopCameraScanner()}
                          className="group flex flex-col justify-between h-[6.2rem] rounded-[1.6rem] border-[4px] border-[#1f211a] bg-[#10140f] p-4 text-left shadow-[inset_0_0_0_2px_rgba(255,255,255,0.14),0_8px_0_rgba(61,42,18,0.30)] transition hover:brightness-110 active:translate-y-[1px]"
                        >
                          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.25rem] border-4 border-[#5d5037] bg-slate-950">
                            <div className="absolute left-1/2 top-1/2 h-1 w-[72%] -translate-x-1/2 -translate-y-1/2 bg-[#9fbe66]/75 shadow-[0_0_18px_4px_rgba(159,190,102,0.45)]" />
                            <div className="absolute inset-[14%] rounded-2xl border-4 border-[#f7ead0]/80">
                              <div className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-[#f7ead0]" />
                              <div className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-[#f7ead0]" />
                              <div className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-[#f7ead0]" />
                              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-[#f7ead0]" />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center text-6xl">📷</div>
                          </div>
                          <div className="mt-4 rounded-2xl bg-[#fbf2dc] px-4 py-3 text-[#2f3d28] shadow-sm">
                            <p className="font-serif text-[1.8rem] font-black italic leading-none">Käytä kameraa</p>
                            <p className="mt-2 text-sm font-black leading-tight text-[#4f4733]">Nykyinen kameraskanneri. Sopii erilliselle webkameralle tai hyvälle laitekameralle.</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => openDesktopKeyboardScanner()}
                          className="group flex flex-col justify-between h-[6.2rem] rounded-[1.6rem] border-[4px] border-[#7b5f32] bg-[#f6e7c4] p-4 text-left shadow-[inset_0_0_0_3px_rgba(255,255,255,0.35),0_8px_0_rgba(61,42,18,0.25)] transition hover:brightness-105 active:translate-y-[1px]"
                        >
                          <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[1.25rem] border-4 border-[#b99e67] bg-[#fff8e7]">
                            <div className="absolute inset-x-8 top-1/2 h-3 -translate-y-1/2 rounded-full bg-[#9fbe66]/70 shadow-[0_0_18px_4px_rgba(159,190,102,0.28)]" />
                            <div className="flex items-end gap-2 text-[#23351f]">
                              {[8, 18, 11, 28, 14, 22, 9, 30, 16, 24, 10, 20].map((height, index) => (
                                <span
                                  key={index}
                                  className="w-2 rounded-sm bg-[#23351f]"
                                  style={{ height }}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="mt-4 rounded-2xl bg-[#fbf2dc] px-4 py-3 text-[#2f3d28] shadow-sm">
                            <p className="font-serif text-[1.8rem] font-black italic leading-none">Käytä viivakoodinlukijaa</p>
                            <p className="mt-2 text-sm font-black leading-tight text-[#4f4733]">USB- tai Bluetooth-lukija syöttää EAN-koodin automaattisesti.</p>
                          </div>
                        </button>
                      </div>
                    )}

                    {eanScannerOpen && (
                      <>
                        <div className="relative overflow-hidden rounded-[2rem] border-[10px] border-[#1f211a] bg-[#10140f] p-4 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.16),0_10px_20px_rgba(0,0,0,0.25)]">
                          <div className="absolute left-1/2 top-3 z-10 h-9 w-28 -translate-x-1/2 rounded-xl border-2 border-[#cfc1a0] bg-transparent/70 shadow-inner" />
                          <div className="absolute right-5 top-4 z-10 h-11 w-11 rounded-full border-4 border-[#cfc1a0] bg-[#0c0d0b] shadow-inner" />
                          <div
                            className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] border-4 border-[#5d5037] bg-slate-950"
                            onPointerDown={(event) => void (focusScannerCameraAtPoint as any)(EAN_SCANNER_REGION_ID, event)}
                          >
                            <div
                              id={EAN_SCANNER_REGION_ID}
                              className="ziiply-desktop-scanner-region absolute inset-0 h-full w-full overflow-hidden rounded-[1.2rem] bg-slate-950 [&_*]:!box-border [&_canvas]:!hidden [&_div]:!border-0 [&_div]:!shadow-none [&_video]:!absolute [&_video]:!inset-0 [&_video]:!h-full [&_video]:!w-full [&_video]:rounded-[1.2rem] [&_video]:!object-cover"
                            />
                            <div className="pointer-events-none absolute inset-0 rounded-[1.2rem] bg-[radial-gradient(circle_at_center,transparent_0%,transparent_58%,rgba(0,0,0,0.38)_84%)]" />
                            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-[#9fbe66]/70 shadow-[0_0_18px_4px_rgba(159,190,102,0.45)]" />
                            <div className="pointer-events-none absolute inset-[13%] rounded-2xl border-4 border-[#f7ead0]/80">
                              <div className="absolute -left-1 -top-1 h-10 w-10 rounded-tl-2xl border-l-4 border-t-4 border-[#f7ead0]" />
                              <div className="absolute -right-1 -top-1 h-10 w-10 rounded-tr-2xl border-r-4 border-t-4 border-[#f7ead0]" />
                              <div className="absolute -bottom-1 -left-1 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4 border-[#f7ead0]" />
                              <div className="absolute -bottom-1 -right-1 h-10 w-10 rounded-br-2xl border-b-4 border-r-4 border-[#f7ead0]" />
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setEanManualInputOpen((open) => !open)}
                              className="rounded-xl border border-[#8b744b] bg-[#d7c196] px-4 py-3 text-sm font-black text-[#3a3325] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] active:scale-[0.98]"
                            >
                              EAN käsin
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleScannerTorch()}
                              className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#d6bf8f] text-2xl shadow-lg active:scale-[0.98] ${scannerTorchOn ? "bg-yellow-100 text-yellow-900" : "bg-[#789155] text-[#f7ead0]"}`}
                              aria-label="Valo"
                            >
                              📷
                            </button>
                            <button
                              type="button"
                              onClick={() => void closeEanModal()}
                              className="rounded-xl bg-[#3d5a2f] px-4 py-3 text-sm font-black text-[#f7ead0] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] active:scale-[0.98]"
                            >
                              Sulje kamera
                            </button>
                          </div>
                        </div>

                        <div
                          className={`mt-3 flex min-h-[4.25rem] gap-2 rounded-2xl border border-[#d6bf8f] bg-[#efe0bf] p-2 transition-opacity duration-150 ${eanManualInputOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
                          aria-hidden={!eanManualInputOpen}
                        >
                          <input
                            ref={eanInputRef}
                            value={eanInput}
                            onChange={(event) =>
                              setEanInput(event.target.value.replace(/\D/g, ""))
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") void searchByEan();
                            }}
                            inputMode="numeric"
                            placeholder="Syötä EAN, esim. 641..."
                            className="min-w-0 flex-1 rounded-xl border border-[#d6bf8f] bg-[#fff8df] px-4 py-3 text-base font-bold tracking-wide text-[#172016] outline-none focus:border-green-700"
                          />
                          <button
                            type="button"
                            onClick={() => void searchByEan()}
                            className="rounded-xl bg-[#0c7c38] px-5 py-3 text-sm font-black text-white"
                          >
                            Hae
                          </button>
                        </div>
                      </>
                    )}

                    {desktopKeyboardScannerOpen && !eanScannerOpen && (
                      <div className="rounded-[2rem] border-[6px] border-[#7b5f32] bg-[#efe0bf] p-5 shadow-[inset_0_0_0_3px_rgba(255,255,255,0.35),0_10px_20px_rgba(0,0,0,0.16)]">
                        <div className="rounded-[1.5rem] border-[4px] border-[#b99e67] bg-[#fff8e7] p-5 text-center shadow-[inset_0_0_0_2px_rgba(255,255,255,0.65)]">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#2f7c3f] bg-[#dff2c4] text-3xl shadow-[0_0_0_4px_rgba(47,124,63,0.12)]">
                            ▌▌▌
                          </div>
                          <p className="mt-4 font-serif text-[2.35rem] font-black italic leading-none text-[#31402c]">
                            Valmis lukemaan
                          </p>
                          <p className="mx-auto mt-2 max-w-[30rem] text-sm font-black leading-snug text-[#4f4733]">
                            Klikkaa kenttään ja piippaa tuote lukijalla. Lukija kirjoittaa koodin ja lähettää yleensä Enterin lopuksi.
                          </p>

                          <div className="mt-5 flex gap-3">
                            <input
                              ref={eanInputRef}
                              value={eanInput}
                              onChange={(event) =>
                                setEanInput(event.target.value.replace(/\D/g, ""))
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") void searchByEan();
                              }}
                              inputMode="numeric"
                              autoComplete="off"
                              placeholder="Skannaa EAN-koodi"
                              className="min-w-0 flex-1 rounded-[1.25rem] border-[3px] border-[#b99e67] bg-[#fff8df] px-5 py-5 text-center text-2xl font-black tracking-[0.22em] text-[#172016] shadow-[inset_0_2px_8px_rgba(91,65,28,0.10)] outline-none placeholder:tracking-normal placeholder:text-[#8b846f] focus:border-[#2f7c3f] focus:ring-4 focus:ring-[#c4dfbd]"
                              onPaste={(event) => {
                                const pastedText = event.clipboardData.getData("text");
                                const code = normalizeEan(pastedText);
                                if (!code) return;
                                event.preventDefault();
                                setEanInput(code);
                                window.setTimeout(() => void searchByEan(code), 30);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => void searchByEan()}
                              className="rounded-[1.25rem] border-[3px] border-[#063d22] bg-gradient-to-b from-[#159b46] to-[#087a35] px-8 py-4 text-base font-black text-[#fff0d5] shadow-[0_5px_0_#064a26] active:translate-y-1 active:shadow-[0_2px_0_#064a26]"
                            >
                              Hae
                            </button>
                          </div>

                          {eanMessage && (
                            <div className="mt-4 rounded-2xl bg-[#f2e3c4] px-4 py-3 text-sm font-black text-[#4f4733] ring-1 ring-[#d8bd86]">
                              {eanMessage}
                            </div>
                          )}

                          <div className="mt-5 flex justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setDesktopKeyboardScannerOpen(false);
                                setEanScannerMessage("");
                                setEanInput("");
                                setEanMessage("");
                              }}
                              className="rounded-xl border border-[#8b744b] bg-[#d7c196] px-5 py-3 text-sm font-black text-[#3a3325] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] active:scale-[0.98]"
                            >
                              Takaisin
                            </button>
                            <button
                              type="button"
                              onClick={() => void closeEanModal()}
                              className="rounded-xl bg-[#3d5a2f] px-5 py-3 text-sm font-black text-[#f7ead0] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] active:scale-[0.98]"
                            >
                              Sulje
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {eanResults.length > 0 && (
                      <div className="mt-3 rounded-2xl border border-[#d6bf8f] bg-[#fbf2dc] p-3 text-sm font-bold text-[#3a3325]">
                        Löysin {eanResults.length} tulosta. Lisää tuotteet koriin normaalista EAN-tuloslistasta.
                      </div>
                    )}
                  </main>
                </div>
              </div>
            </div>
          </div>
        )}

      </section>

      <main
        className={`xl:hidden min-h-screen overflow-x-hidden bg-[#EAF4F1] px-2 pb-44 pt-0 text-slate-950 sm:bg-[radial-gradient(circle_at_top,#ecfdf3_0%,#f8fafc_42%,#f1f5f9_100%)] sm:px-4 sm:pb-32 sm:py-3 sm:py-4 md:pb-4 ${suppressUiForEanClose ? "pointer-events-none" : ""}`}
      >
        <style>{`
        html,
        body {
          background: #EAF4F1 !important;
        }

        #__next {
          background: #EAF4F1 !important;
          min-height: 100dvh;
        }

        @media (min-width: 640px) {
          .ziiply-desktop-debug-compact {
            max-width: 1180px;
          }

          .ziiply-desktop-debug-compact img[src="/ziiplylogo_mobile.png"] {
            max-height: 96px !important;
          }

          .ziiply-desktop-debug-compact input,
          .ziiply-desktop-debug-compact button {
            min-height: 0;
          }
        }


        @keyframes ziiply-store-picker-fade {
          from { opacity: 0; filter: blur(3px); }
          to { opacity: 1; filter: blur(0); }
        }
        .ziiply-store-picker-fade {
          animation: ziiply-store-picker-fade 440ms ease-out both;
        }
        .ziiply-store-picker-panel-fade {
          animation: ziiply-store-picker-fade 520ms ease-out both;
        }

        @keyframes ziiply-soft-open {
          from { opacity: 0; transform: translateY(10px) scale(0.985); filter: blur(2px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .ziiply-soft-open {
          animation: ziiply-soft-open 260ms cubic-bezier(0.16, 1, 0.3, 1) both;
          transform-origin: top center;
        }
        .ziiply-soft-open-fast {
          animation: ziiply-soft-open 190ms cubic-bezier(0.16, 1, 0.3, 1) both;
          transform-origin: top center;
        }
        @keyframes ziiply-soft-close {
          from { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          to { opacity: 0; transform: translateY(10px) scale(0.985); filter: blur(2px); }
        }
        .ziiply-soft-close {
          animation: ziiply-soft-close 260ms cubic-bezier(0.7, 0, 0.84, 0) both;
          pointer-events: none;
          transform-origin: top center;
        }
        @keyframes ziiply-search-ready-bounce {
          0% { transform: translateY(0) scale(1); }
          24% { transform: translateY(-9px) scale(1.08); }
          48% { transform: translateY(0) scale(1); }
          68% { transform: translateY(-4px) scale(1.03); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes ziiply-search-ready-attention {
          0%, 100% { background-color: transparent; box-shadow: none; filter: none; }
          18%, 58% { background-color: rgba(250, 204, 21, 0.95); box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.22), 0 8px 18px rgba(202, 138, 4, 0.28); filter: saturate(1.18); }
        }
        .ziiply-search-ready-bounce {
          animation: ziiply-search-ready-bounce 1.15s cubic-bezier(0.22, 1, 0.36, 1) both, ziiply-search-ready-attention 1.15s ease-in-out both;
          transform-origin: center bottom;
          will-change: transform, background-color, box-shadow, filter;
          display: inline-flex;
          min-width: 1.75rem;
          min-height: 1.75rem;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
        }

        #ziiply-ean-scanner-region,
        #ziiply-ean-scanner-region > div,
        #ziiply-ean-scanner-region video {
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          max-height: none !important;
          overflow: hidden !important;
          border-radius: 1rem !important;
        }
        #ziiply-ean-scanner-region video {
          object-fit: cover !important;
        }

        /* Desktop scanner preview mirror: fixes left/right direction in camera view only. */
        @media (min-width: 1280px) {
          .ziiply-desktop-scanner-region video {
            transform: scaleX(-1) !important;
            transform-origin: center center !important;
          }
        }
        #ziiply-ean-scanner-region canvas,
        #ziiply-ean-scanner-region svg {
          display: none !important;
        }

        .ziiply-mobile-home-layer-lock {
          position: relative;
          z-index: 1;
          transform: translate3d(0, 0, 0);
          contain: layout paint;
          isolation: isolate;
          min-height: 0;
        }

        @media (max-width: 639px) {
          .ziiply-mobile-home-layer-lock {
            margin-top: 0 !important;
          }
        }
      `}</style>
        {showLaunchScreen && <ZiiplyLaunchScreen appVersion={APP_VERSION} />}

        <div
          className={`relative z-[80] m-0 p-0 mt-1 mb-0 ziiply-desktop-debug-compact sm:mx-auto sm:max-w-[1180px] sm:px-4 ${showLaunchScreen ? "hidden" : ""}`}
        >
          {/* v388_TOPBAR_BACKGROUND_LOCK: keeps Safari from pulling the hero/background upward after idle/reload. */}
<KauppiasMobileTopBar
            hidden={searchFullscreenOpenV621}
            areaLabel={activeArea.label}
            gpsCoords={gpsCoordsV320}
            weatherEnabled={Boolean(gpsCoordsV320)}
            onOpenCalendar={() => {
              try {
                window.location.href = "calshow://";
              } catch {
                window.location.href = "webcal://";
              }
            }}
          />
        </div>
        {/* v389_MOBILE_HOME_LAYER_ANCHOR:
            KauppiasMobileTopBar is fixed, so it must reserve a permanent
            non-render-dependent background slot. This prevents iOS Safari from
            pulling the mobile home artwork upward after idle/reload/viewport restore. */}
        <div
          aria-hidden="true"
          className="block h-[104px] shrink-0 select-none sm:hidden"
        />
<div className="mx-auto max-w-6xl space-y-2 sm:space-y-3">
          <section
            className={`-mx-2 bg-transparent px-2 pb-1 pt-1 sm:-mx-4 sm:px-4 sm:pb-2 sm:pt-2 ${
              showLaunchScreen ? "hidden" : "hidden sm:block"
            }`}
          >
            <div className="mx-auto max-w-6xl">
              <div className="overflow-hidden rounded-[1.25rem] bg-[#fff8df]/95 px-4 py-2 shadow-sm ring-1 ring-slate-100 sm:rounded-[1.5rem] sm:px-5 sm:py-2">
                <img
                  src="/ziiply.png"
                  alt="Ziiply"
                  className="mx-auto max-h-[90px] w-auto object-contain py-1 sm:max-h-[108px] sm:py-1"
                />
                <div className="mx-auto mt-1 max-w-3xl text-center">
                  <p className="text-base font-black leading-tight tracking-[-0.04em] text-slate-950">
                    Viilaa ruokakorisi huokeammaks
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-snug text-[#8a7349]">
                    Gösta ja Justiina auttavat arjen valinnoissa.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {!showLaunchScreen &&
            !searchPanelOpen &&
            !cartModalOpen &&
            !shopsPanelOpen &&
            !eanModalOpen &&
            activeResult === "none" && (
              <>
                <div className="ziiply-mobile-home-layer-lock -translate-y-[24px] transform-gpu">
                  <ZiiplyMobileHomeView
                    activeAssistant={activeAssistant}
                    onSelectAssistant={setActiveAssistant}
                  />
                </div>

                <ZiiplyMobileAssistantPanel
                  activeAssistant={activeAssistant}
                  onClose={() => setActiveAssistant(null)}
                />
              </>
            )}

          {!showLaunchScreen && (
            <div
              className={`${shopsPanelOpen ? "fixed inset-0 z-50 overflow-hidden bg-[radial-gradient(circle_at_50%_4%,#fff7df_0%,#f1dfad_48%,#ddbd78_100%)] px-3 pb-[calc(env(safe-area-inset-bottom)+5.6rem)] pt-[calc(env(safe-area-inset-top)+5.2rem)] sm:static sm:contents sm:overflow-visible sm:bg-transparent sm:p-0" : "hidden sm:contents"} ${closingPanels.shops ? "ziiply-soft-close" : shopsPanelOpen ? "ziiply-soft-open" : ""}`}
            >
          <div className="mb-2">
            <ZiiplyMobileLocationBar
              locationInput={locationInput}
              usingOwnLocation={usingOwnLocation}
              storeSearchLoading={storeSearchLoading}
              gpsErrorMessage={gpsErrorMessage}
              gpsStatusText={
                usingOwnLocation && !storeSearchLoading && !gpsErrorMessage
                  ? `${activeArea.label || "Sijainti"} käytössä`
                  : locationMessageVisible
                    ? formatLocationNoticeV465(locationMessage)
                    : ""
              }
              onApplyLocation={() => {
                pushGpsDebugLogV492("MAP/APPLY disabled in v492 test");
              }}
              onOpenMap={() => {
                setMapStoresOverlayOpenV433(true);
              }}
              onLocationInputChange={(nextValue: string) => {
                setLocationInput(nextValue);
                if (nextValue.trim()) {
                  gpsUserDisabledRefV306.current = true;
                  setUsingOwnLocation(false);
                  setGpsErrorMessage("");
                }
                setLocationMessage("Kirjoita alue tai postinumero");
                setLocationMessageVisible(true);
              }}
              // V488: GPS-nappi palautettu.
              // - jos GPS on päällä tai paikannus on kesken, painallus sammuttaa GPS:n
              // - jos GPS on pois päältä, painallus käynnistää manuaalisen GPS-haun
              onGpsClick={() => {
                pushGpsDebugLogV492(`GPS BUTTON click using=${String(usingOwnLocation)} loading=${String(storeSearchLoading)} coords=${gpsCoordsV320 ? "yes" : "no"}`);
                if (usingOwnLocation || storeSearchLoading || gpsCoordsV320) {
                  gpsUserDisabledRefV306.current = true;
                  gpsManualSuccessGuardUntilRefV485.current = 0;
                  gpsManualSuccessCoordsRefV485.current = null;
                  if (gpsFailTimerRefV391.current) {
                    window.clearTimeout(gpsFailTimerRefV391.current);
                    gpsFailTimerRefV391.current = null;
                  }
                  if (gpsBootTimerRefV483.current) {
                    window.clearTimeout(gpsBootTimerRefV483.current);
                    gpsBootTimerRefV483.current = null;
                  }
                  if (gpsBootWatchdogRefV483.current) {
                    window.clearTimeout(gpsBootWatchdogRefV483.current);
                    gpsBootWatchdogRefV483.current = null;
                  }
                  const gpsWindowLock = getZiiplyGpsWindowLockV470();
                  if (gpsWindowLock) {
                    gpsWindowLock.inFlight = false;
                    gpsWindowLock.lastFinishedAt = Date.now();
                  }
                  gpsSearchInFlightRefV465.current = false;
                  ziiplyGpsHardInFlightV469 = false;
                  setUsingOwnLocation(false);
                  setGpsCoordsV320(null);
                  setStoreSearchLoading(false);
                  setGpsStorePickerBlockedV382(false);
                  setGpsErrorMessage("");
                  setLocationMessage("GPS pois päältä");
                  setLocationMessageVisible(true);
                  return;
                }

                pushGpsDebugLogV492("GPS BUTTON -> MANUAL START");
                gpsUserDisabledRefV306.current = false;
                gpsManualSuccessGuardUntilRefV485.current = 0;
                gpsManualSuccessCoordsRefV485.current = null;
                void useOwnLocation("manual");
              }}
              
              
            />
          </div>

          <section
            className={`relative overflow-hidden rounded-[2.05rem] border-[4px] border-[#b98e4d] px-5 pb-4 pt-3 shadow-[0_18px_34px_rgba(52,38,14,0.18),0_4px_0_rgba(116,78,31,0.18),inset_0_0_0_2px_rgba(255,252,235,0.96),inset_0_18px_28px_rgba(255,255,255,0.30)] ring-1 ring-[#fff7d6]/95 ${
              storeMode === "local"
                ? "bg-[#fbf1d2]"
                : "bg-[#fcf4da]"
            }`}
            style={{
              backgroundImage:
                storeMode === "local"
                  ? "radial-gradient(rgba(190,154,88,0.24) 0.7px, transparent 0.7px), radial-gradient(circle at 18% 4%, rgba(255,255,255,0.55), transparent 34%), linear-gradient(180deg, rgba(255,255,242,0.95), rgba(249,238,203,0.96))"
                  : "radial-gradient(rgba(190,154,88,0.22) 0.7px, transparent 0.7px), radial-gradient(circle at 82% 6%, rgba(255,255,255,0.52), transparent 35%), linear-gradient(180deg, rgba(255,255,243,0.96), rgba(251,242,211,0.97))",
              backgroundSize: "18px 18px, 100% 100%, 100% 100%",
            }}
          >
            <div className="relative z-10">
              <ZiiplyMobileStoreModeSelector
                storeMode={storeMode}
                storeModeChosen={storeModeChosenV299}
                storeCompareScope={storeCompareScope}
                withinChain={withinChain}
                selectedRealChainCount={selectedRealChainCount}
                missingStoresMessageVisible={false}
                foundStoresCount={foundStores.length}
                hyperStorePairMissing={hyperStorePairMissingV391}
                onStoreModeChange={handleStoreModeChange}
                onStoreCompareScopeChange={handleStoreCompareScopeChange}
                onWithinChainChange={setWithinChain}
              />
            </div>

            <div className={storeMode === "local" ? "mt-2.5" : "mt-2"}>
              {renderComparedStoreCards(true)}
            </div>

            {false && foundStores.length > 0 && (
              <div className="mt-3 rounded-2xl bg-[#fff8df] p-3 text-xs text-slate-600 ring-1 ring-slate-200">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-bold text-slate-700">
                    Valitse kaupat ({foundStores.length})
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-green-700">
                      S-ryhmä
                    </p>
                    <div className="max-h-44 space-y-2 overflow-auto pr-1">
                      {foundStores
                        .filter((store) => {
                          if (store.type !== "S") return false;
                          if (storeCompareScope === "within_chain") return true;
                          if (!storeModeChosenV299) return true;
                          const storeNameForMode = normalize(store.name || "");
                          const isLocalStoreForMode = hasAnyToken(
                            storeNameForMode,
                            ["market", "alepa", "sale", "s-market", "s market"],
                          );
                          return storeMode === "local"
                            ? isLocalStoreForMode
                            : !isLocalStoreForMode;
                        })
                        .map((store) => {
                          const selected =
                            storeMode === "local"
                              ? activeArea.sLocalStoreId === store.id
                              : activeArea.sStoreId === store.id;

                          return (
                            <button
                              key={store.id}
                              type="button"
                              onClick={() =>
                                selectStoreForCurrentMode(store, storeMode)
                              }
                              className={`w-full min-w-[min(86vw,360px)] rounded-xl px-4 py-3 text-left transition ${
                                selected
                                  ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white"
                                  : "bg-slate-50 text-slate-700 hover:bg-green-50"
                              }`}
                            >
                              <span className="block font-bold break-words">
                                {store.name}
                              </span>
                              <span
                                className={`block text-xs ${selected ? "text-green-50" : "text-[#b7aa8d]"}`}
                              >
                                ID {store.id} · {store.city || ""}{" "}
                                {store.postalCode || ""}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-red-700">
                      K-ryhmä
                    </p>
                    <div className="max-h-44 space-y-2 overflow-auto pr-1">
                      {foundStores
                        .filter((store) => {
                          if (store.type !== "K") return false;
                          if (storeCompareScope === "within_chain") return true;
                          if (!storeModeChosenV299) return true;
                          const storeNameForMode = normalize(store.name || "");
                          const isLocalStoreForMode = hasAnyToken(
                            storeNameForMode,
                            [
                              "market",
                              "k-market",
                              "k market",
                              "k-supermarket",
                              "k supermarket",
                            ],
                          );
                          return storeMode === "local"
                            ? isLocalStoreForMode
                            : !isLocalStoreForMode;
                        })
                        .map((store) => {
                          const selected =
                            storeMode === "local"
                              ? activeArea.kLocalStoreId === store.id
                              : activeArea.kStoreId === store.id;

                          // AUTO_GPS_DEFAULT_DISABLED_V305
                          // Ei automaattista GPS-kyselyä latauksessa. GPS käynnistyy vain käyttäjän napista.

                          // DEFAULT_STORE_MODE_DISABLED_V305
                          // Ei automaattista Tavaratalot-oletusta refreshissä.
                          useEffect(() => {
                            setStoreModeChosenV299(false);
                            setStoreCompareScope("none");
                            setOpenStorePicker(null);
                            setStoreDrillViewV320("main");
                          }, []);

                          // GPS_STICKY_STATE_DISABLED_V305
                          // Ei palauteta GPS-tilaa localStoragesta.

                          // GPS_DEFAULT_VISUAL_ON_V307
                          // GPS-nuppineula pidetään oletuksena vihreänä kaupat-näkymässä.

                          // STORE_SELECTION_DOES_NOT_PICK_MODE_V307
                          // Kaupan valinta ei saa itsessään valita Tavaratalot/Lähikaupat-hakutapaa.

                          return (
                            <button
                              key={store.id}
                              type="button"
                              onClick={() =>
                                selectStoreForCurrentMode(store, storeMode)
                              }
                              className={`w-full min-w-[min(86vw,360px)] rounded-xl px-4 py-3 text-left transition ${
                                selected
                                  ? "bg-red-700 shadow-md ring-1 ring-black/10 text-white"
                                  : "bg-slate-50 text-slate-700 hover:bg-red-50"
                              }`}
                            >
                              <span className="block whitespace-normal break-words font-bold leading-tight">
                                {store.name}
                              </span>
                              <span
                                className={`block text-xs ${selected ? "text-red-50" : "text-[#b7aa8d]"}`}
                              >
                                ID {store.id} · {store.city || ""}{" "}
                                {store.postalCode || ""}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

            </div>
          )}

          {/* v358_DESKTOP_DEBUG_ALL_FLOWS:
            Desktop-only debug board. Mobile CSS/classes below 640px are not touched.
            Purpose: keep the existing mobile app flow intact, but expose the main states and actions
            side-by-side on desktop so debugging does not require opening one mobile bottom-sheet at a time. */}
          {!showLaunchScreen && (
            <section className="hidden sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-4 rounded-[2rem] bg-[#fff8df]/95 p-4 shadow-sm ring-1 ring-slate-100">
              <div className="rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wide text-[#b7aa8d]">
                      Debug
                    </p>
                    <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">
                      Haku
                    </h2>
                  </div>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-800 ring-1 ring-green-200">
                    {searchCompareMode === "single"
                      ? "Yksi tuote"
                      : "Koko kori"}
                  </span>
                </div>

                <textarea
                  value={input}
                  onChange={(event) =>
                    setSearchInputForMode(event.target.value)
                  }
                  placeholder={
                    searchCompareMode === "single"
                      ? "Kirjoita yksi tuote"
                      : "maito, kahvi, jauheliha"
                  }
                  className="h-28 w-full resize-none rounded-[1.15rem] border border-slate-300 bg-[#fff8df] px-3 py-3 text-[15px] font-semibold text-slate-950 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchCompareMode("cart")}
                    className={`rounded-[1rem] px-3 py-2 text-sm font-black ring-1 transition ${searchCompareMode === "cart" ? "bg-green-700 text-white ring-green-800" : "bg-[#fff8df] text-slate-700 ring-slate-200"}`}
                  >
                    Koko kori
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchCompareMode("single");
                      setInput((currentInput) =>
                        getSingleSearchTerm(currentInput),
                      );
                    }}
                    className={`rounded-[1rem] px-3 py-2 text-sm font-black ring-1 transition ${searchCompareMode === "single" ? "bg-green-700 text-white ring-green-800" : "bg-[#fff8df] text-slate-700 ring-slate-200"}`}
                  >
                    Yksi tuote
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleMainNormalSearch}
                    disabled={
                      !hasSearchInput ||
                      loadingNormal ||
                      singleProductCompareLoading
                    }
                    className="rounded-[1rem] bg-slate-900 px-3 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-[#b7aa8d]"
                  >
                    {loadingNormal || singleProductCompareLoading
                      ? "Haetaan..."
                      : "Hae"}
                  </button>
                  <button
                    type="button"
                    onClick={openEanModal}
                    className="rounded-[1rem] bg-green-700 px-3 py-3 text-sm font-black text-white"
                  >
                    EAN / Skannaa
                  </button>
                </div>

                <div className="mt-3 max-h-64 overflow-auto rounded-[1.15rem] bg-[#fff8df] p-2 ring-1 ring-slate-200">
                  <p className="mb-2 px-1 text-xs font-black uppercase tracking-wide text-[#b7aa8d]">
                    Hakutulokset
                  </p>
                  {visibleNormalResults.length === 0 &&
                  singleProductCompareResults.length === 0 ? (
                    <p className="px-1 py-6 text-center text-sm font-bold text-[#b7aa8d]">
                      Ei hakutuloksia vielä.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {visibleNormalResults.slice(0, 6).map((product) => (
                        <div
                          key={`desktop-normal-${product.id}-${product.ean || product.name}`}
                          className="flex items-center gap-2 rounded-xl bg-slate-50 p-2"
                        >
                          {product.pictureUrl && (
                            <img
                              src={product.pictureUrl}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg object-contain bg-[#fff8df]"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-[#17322a]">
                              {fixText(product.name)}
                            </p>
                            <p className="text-xs font-bold text-green-700">
                              {formatEuro(getProductPrice(product))}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addProductToCart(product)}
                            className="rounded-xl bg-green-600 px-3 py-2 text-xs font-black text-white"
                          >
                            Lisää
                          </button>
                        </div>
                      ))}
                      {singleProductCompareResults.slice(0, 4).map((result) => (
                        <div
                          key={`desktop-single-${result.key}-${result.storeName}-${result.productName}`}
                          className="rounded-xl bg-slate-50 p-2"
                        >
                          <p className="truncate text-sm font-black text-[#17322a]">
                            {fixText(result.productName)}
                          </p>
                          <p className="text-xs font-bold text-[#8a7349]">
                            {result.storeName} · {formatEuro(result.price)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wide text-[#b7aa8d]">
                      Debug
                    </p>
                    <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">
                      Kori
                    </h2>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                    {cart.length} tuotetta
                  </span>
                </div>
                <div className="max-h-[27rem] overflow-auto rounded-[1.15rem] bg-[#fff8df] p-2 ring-1 ring-slate-200">
                  {cart.length === 0 ? (
                    <p className="px-1 py-10 text-center text-sm font-bold text-[#b7aa8d]">
                      Kori on tyhjä.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {cart.map((item, cartIndex) => (
                    <div
                      key={item.id}
                      className="relative min-w-0 overflow-hidden rounded-[1.65rem] border-[3px] border-[#c2a05e] bg-gradient-to-b from-[#fff8e8] via-[#f6e8c5] to-[#ead19a] p-3 text-[#20301f] shadow-[0_5px_0_rgba(80,58,25,0.22),inset_0_0_0_2px_rgba(255,255,255,0.55)]"
                    >
                      <div className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:radial-gradient(#b59c67_1px,transparent_1px)] [background-size:13px_13px]" />
                      <div className="relative grid min-w-0 grid-cols-[42px_82px_minmax(0,1fr)_auto] items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] border-[#b99d62] bg-[#fff7df] text-lg font-black text-[#7a6842] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.65)]">
                          {cartIndex + 1}
                        </span>

                        <span className="flex h-[74px] w-[82px] shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border-2 border-[#d6bf8f] bg-[#fff8df] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <span className="text-2xl">🛒</span>
                          )}
                        </span>

                        <div className="min-w-0 overflow-hidden">
                          <p className="line-clamp-2 break-words text-[17px] font-black leading-[1.05] text-[#20301f]">
                            {item.name}
                          </p>
                          <p className="mt-1 truncate text-[12px] font-bold text-[#6f6b59]">
                            {item.storeName
                              ? `${item.storeName} · ${item.chain}`
                              : "Muistilistarivi"}
                          </p>
                          <p className="mt-1 text-[13px] font-black text-[#6f6b59]">
                            {item.quantity} kpl
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="whitespace-nowrap text-[18px] font-black text-[#20301f]">
                            {item.price ? formatEuro(item.price * item.quantity) : "—"}
                          </p>
                          {item.price ? (
                            <p className="mt-1 whitespace-nowrap text-[11px] font-bold text-[#6f6b59]">
                              {formatEuro(item.price)} / kpl
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="relative mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <button
                            type="button"
                            disabled
                            className="min-w-0 rounded-full border-2 border-[#d6bf8f] bg-[#fff4cf] px-3 py-2 text-[11px] font-black leading-none text-[#8a3f16] opacity-75 shadow-[0_2px_0_rgba(91,72,44,0.14)]"
                            title="Tuotekohtainen hinnanhuojennushaku rakennetaan myöhemmin"
                            aria-label="Hinnanhuojennukset tulossa"
                          >
                            🔥 Hinnanhuojennukset
                          </button>
                          {item.price
                            ? renderPriceHistoryBadge(
                                getPriceHistoryKeyFromCartItem(item),
                                item.price,
                              )
                            : null}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <div className="flex items-center rounded-full border-2 border-[#d6bf8f] bg-[#fff7df] p-1 shadow-[0_2px_0_rgba(91,72,44,0.14)]">
                            <button
                              type="button"
                              onClick={() => changeQuantity(item.id, -1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f7ecd0] text-xl font-black text-[#8a7a52] transition active:scale-[0.94]"
                              aria-label={
                                item.quantity <= 1
                                  ? `Poista ${item.name} ostoskorista`
                                  : `Vähennä tuotteen ${item.name} määrää`
                              }
                              title={item.quantity <= 1 ? "Poista korista" : "Vähennä määrää"}
                            >
                              −
                            </button>
                            <span
                              className="min-w-[30px] px-1 text-center text-base font-black text-[#20301f]"
                              aria-label={`Määrä ${item.quantity}`}
                            >
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => changeQuantity(item.id, 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#07a445] text-xl font-black text-white shadow-sm transition active:scale-[0.94]"
                              aria-label={`Lisää tuotteen ${item.name} määrää`}
                              title="Lisää määrää"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeCartItem(item.id)}
                            className="flex h-10 min-w-[68px] shrink-0 items-center justify-center rounded-full border-2 border-[#8a3f16] bg-[#a4471c] px-3 text-[13px] font-black leading-none text-[#fff7df] shadow-[0_2px_0_rgba(91,72,44,0.22)] transition active:scale-[0.98]"
                            aria-label={`Poista ${item.name} ostoskorista`}
                          >
                            Pois
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}                </div>
              )}
            </div>
          </div>
        </section>
        )}
        </div>

        {restoredCartPromptV320.open &&
          cart.length > 0 &&
          !showLaunchScreen && (
            <div className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+10.5rem)] z-[70] mx-auto max-w-[34rem] ziiply-soft-open sm:top-5">
              <div className="rounded-[1.35rem] border border-green-100 bg-[#fff8df]/95 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-white/70 backdrop-blur-2xl">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-xl ring-1 ring-green-100">
                    🛒
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-950">
                      Säilytetäänkö ostoskori?
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-[#8a7349]">
                      {restoredCartPromptV320.count} tuotetta valmiina
                      jatkamista varten.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRestoredCartPromptV320({ open: false, count: 0 });
                          setSearchPanelOpen(false);
                          setShopsPanelOpen(false);
                          setEanModalOpen(false);
                          setActiveResult("none");
                          setCartModalOpen(true);
                        }}
                        className="rounded-full bg-green-700 px-4 py-2 text-sm font-black text-white shadow-sm active:scale-[0.98]"
                      >
                        Jatka
                      </button>
                      <button
                        type="button"
                        onClick={clearRestoredCartPromptV320}
                        className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-200 active:scale-[0.98]"
                      >
                        Tyhjennä kori
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {searchPanelOpen && (
          <>
            <ZiiplyMobileSearchCard
              open={true}
              title="HAKU"
              input={input}
              onInputChange={setSearchInputForMode}
              inputRef={searchInputRef}
              searchMode={searchCompareMode}
              onSearchModeChange={(mode) => {
                setSearchCompareMode(mode);
                setNormalResults([]);
                setSingleProductCompareResults([]);
                setSingleProductCompareTerm("");
                setVisibleNormalCount(8);
              }}
              hasSearchInput={hasSearchInput}
              loading={loadingNormal}
              loadingOffers={loadingOffers}
              loadingNormal={loadingNormal}
              singleProductCompareLoading={singleProductCompareLoading}
              products={normalResults}
              emptyText="Kirjoita tuotteet hakukenttään."
              onClose={() => {
                setSearchPanelOpen(false);
                setNormalResults([]);
                setMobileResultsReadyQueryV537("");
                setNormalSearchAttempted(false);
                setVisibleNormalCount(8);
                setActiveNormalSearchTerm("");
              }}
              onAddInputToCart={addInputToCart}
              onOfferSearch={handleMainOfferSearch}
              onNormalSearch={handleMainNormalSearch}
              onVoiceClick={() => toggleVoiceInput()}
              onScannerClick={openEanModal}
              voiceState={isListening ? "recording" : "idle"}
              scannerState={eanScannerOpen || eanModalOpen ? "active" : "idle"}
              onAddProduct={(product: any) => {
                addProductToCart(product as Product);
                setNormalResults([]);
                setMobileResultsReadyQueryV537("");
                setNormalSearchAttempted(false);
                setVisibleNormalCount(8);
                setActiveNormalSearchTerm("");
              }}
            />

            <ZiiplyMobileSearchResultsCard
              open={
                searchPanelOpen &&
                !loadingNormal &&
                normalResults.length > 0 &&
                mobileResultsReadyQueryV537.length > 0
              }
              loading={false}
              title={activeNormalSearchTerm || "Tuotteet"}
              products={normalResults}
              onClose={() => {
                setMobileResultsReadyQueryV537("");
                setNormalSearchAttempted(false);
                setVisibleNormalCount(8);
                setActiveNormalSearchTerm("");
              }}
              onAddProduct={(product: any) => {
                addProductToCart(product as Product);
                setNormalResults([]);
                setMobileResultsReadyQueryV537("");
                setNormalSearchAttempted(false);
                setVisibleNormalCount(8);
                setActiveNormalSearchTerm("");
              }}
            />
          </>
        )}

        {eanModalOpen && (
          <div
            className="fixed inset-0 z-[9999] flex items-stretch justify-center overflow-hidden overscroll-none bg-[#EAF4F1] px-2 pb-[calc(env(safe-area-inset-bottom)+5.65rem)] pt-[calc(env(safe-area-inset-top)+0.85rem)] sm:items-center sm:p-4"
          >
            <div
              className={`flex h-full w-full max-w-[430px] flex-col overflow-hidden ${eanModalClosing ? "opacity-0" : "opacity-100"}`}
            >

              {eanScannerMessage && !eanScannerOpen && (
                <div className="mt-3 rounded-2xl bg-slate-100 p-3 text-sm font-bold text-slate-700 ziiply-soft-open-fast">
                  {eanScannerMessage}
                </div>
              )}

              {desktopKeyboardScannerOpen && !eanScannerOpen && (
                <div className="mt-3 rounded-[1.5rem] border border-[#dec07a] bg-[#fff8df] p-3 shadow-sm ziiply-soft-open">
                  <div className="rounded-2xl bg-green-50 px-3 py-2 text-center text-sm font-black leading-snug text-green-900 ring-1 ring-green-100">
                    USB/Bluetooth-lukija toimii kuten näppäimistö. Klikkaa kenttään ja skannaa viivakoodi.
                  </div>

                  <div className="mt-3 flex gap-2">
                    <input
                      ref={eanInputRef}
                      value={eanInput}
                      onChange={(event) =>
                        setEanInput(event.target.value.replace(/\D/g, ""))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void searchByEan();
                      }}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Skannaa tai syötä EAN-koodi"
                      className="min-w-0 flex-1 rounded-2xl border border-slate-300 px-4 py-4 text-lg font-black tracking-[0.18em] text-slate-950 outline-none transition placeholder:tracking-normal placeholder:text-[#b7aa8d] focus:border-green-600 focus:ring-4 focus:ring-green-100"
                      onPaste={(event) => {
                        const pastedText = event.clipboardData.getData("text");
                        const code = normalizeEan(pastedText);

                        if (!isUsableEan(code)) return;

                        event.preventDefault();

                        if (eanAutoSearchTimeoutRef.current) {
                          window.clearTimeout(eanAutoSearchTimeoutRef.current);
                          eanAutoSearchTimeoutRef.current = null;
                        }

                        setEanInput(code);
                        setLastAutoEanSearch(code);
                        setEanSearchStartedAutomatically(true);
                        eanAutoSearchActiveRef.current = true;
                        setEanMessage(`Luettu koodi: ${code}. Haetaan...`);
                        void searchByEan(code);
                      }}
                    />
                    <button
                      type="button"
                      onClick={clearEanSearch}
                      disabled={!eanInput && eanResults.length === 0 && !eanMessage}
                      className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-extrabold text-slate-700 transition active:scale-[0.98] disabled:opacity-40"
                    >
                      Tyhjennä
                    </button>
                  </div>

                  {eanMessage && (
                    <div className="mt-3 rounded-2xl bg-slate-100 p-3 text-sm font-bold text-slate-700">
                      {eanMessage}
                    </div>
                  )}

                  <div className="fixed inset-0 z-[160] h-[100dvh] w-screen overflow-hidden bg-[#fff5d9] sm:hidden">
                    <button
                      type="button"
                      onClick={closeEanModal}
                      className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-sm transition active:scale-[0.98]"
                    >
                      Sulje
                    </button>
                  </div>
                </div>
              )}

              {(eanScannerOpen || (!desktopKeyboardScannerOpen && eanModalOpen)) && (
                <ZiiplyMobileScannerCard
                  regionId={MOBILE_EAN_SCANNER_REGION_ID}
                  fullscreen
                  flashState={scanSuccessFlash ? "success" : scanMissFlash ? "error" : "idle"}
                  loading={eanLoading}
                  scannerMessage={eanLoading ? "Haetaan tuotetta" : eanScannerMessage}
                  torchOn={scannerTorchOn}
                  manualInputOpen={eanManualInputOpen}
                  selectionResults={[]}
                  formatPrice={formatEuro}
                  getProductPrice={(result) =>
                    getProductPrice(((result as any).product ?? result) as Product)
                  }
                  onCameraTap={(event) =>
                    void (focusScannerCameraAtPoint as any)(MOBILE_EAN_SCANNER_REGION_ID, event)
                  }
                  onToggleManualInput={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      const code = normalizeEan(text);

                      if (!isUsableEan(code)) {
                        setEanManualInputOpen(true);
                        setEanMessage("Leikepöydältä ei löytynyt kelvollista EAN-koodia.");
                        window.setTimeout(() => eanInputRef.current?.focus(), 0);
                        return;
                      }

                      setEanManualInputOpen(true);
                      setEanInput(code);
                      setLastAutoEanSearch(code);
                      setEanSearchStartedAutomatically(true);
                      eanAutoSearchActiveRef.current = true;
                      setEanMessage(`Liitetty koodi: ${code}. Haetaan...`);
                      void searchByEan(code);
                    } catch {
                      setEanManualInputOpen(true);
                      window.setTimeout(() => eanInputRef.current?.focus(), 0);
                    }
                  }}
                  onToggleTorch={() => void toggleScannerTorch()}
                  onClose={closeEanModal}
                />
              )}

              {eanResults.length > 1 &&
                !desktopKeyboardScannerOpen &&
                (eanScannerOpen || (!desktopKeyboardScannerOpen && eanModalOpen)) && (
                  <div className="fixed inset-0 z-[175] flex w-screen items-stretch justify-center bg-black/18 px-2 pb-[calc(env(safe-area-inset-bottom)+5.65rem)] pt-[calc(env(safe-area-inset-top)+0.85rem)] sm:hidden">
                    <ZiiplyMobileProductPickCard
                      title="Valitse lisättävä tuote"
                      subtitle="Sama EAN löytyi useammasta kaupasta"
                      results={eanResults.map((result) => ({
                        ...result,
                        store: result.storeName,
                        image: result.product.pictureUrl,
                        price: getProductPrice(result.product),
                      }))}
                      formatPrice={formatEuro}
                      getProductPrice={(result) =>
                        getProductPrice(((result as any).product ?? result) as Product)
                      }
                      onAdd={(result) => {
                        addEanResultToCart(
                          {
                            ...result,
                            eanMatch: true,
                          } as EanSearchResult,
                          { showFlash: false },
                        );
                        setEanResults([]);
                        setEanMessage("");
                        setEanScannerMessage("Tuote lisätty");
                        window.setTimeout(() => {
                          setEanScannerMessage("");
                        }, 900);
                      }}
                    />
                  </div>
                )}

              {eanMessage &&
                !eanSearchStartedAutomatically &&
                !(eanScannerOpen || (!desktopKeyboardScannerOpen && eanModalOpen)) && (
                  <div className="mt-3 rounded-2xl bg-slate-100 p-3 text-sm font-bold text-slate-700">
                    {eanMessage}
                  </div>
                )}

              {eanResults.length > 0 &&
                !eanSearchStartedAutomatically &&
                !(eanScannerOpen || (!desktopKeyboardScannerOpen && eanModalOpen)) && (
                  <div ref={eanResultsRef} className="mt-4 scroll-mt-4">
                    <ZiiplyMobileProductPickCard
                      title={eanResults.length === 1 ? "Löytynyt tuote" : "Valitse lisättävä tuote"}
                      subtitle={eanResults.length === 1 ? "Tarkka EAN-osuma" : "Sama EAN löytyi useammasta kaupasta"}
                      results={eanResults.map((result) => ({
                        ...result,
                        store: result.storeName,
                        image: result.product.pictureUrl,
                        price: getProductPrice(result.product),
                      }))}
                      formatPrice={formatEuro}
                      getProductPrice={(result) =>
                        getProductPrice(((result as any).product ?? result) as Product)
                      }
                      onAdd={(result) => {
                        addEanResultToCart(
                          {
                            ...result,
                            eanMatch: true,
                          } as EanSearchResult,
                          { showFlash: false },
                        );
                        setEanResults([]);
                        setEanMessage("");
                        setEanScannerMessage("Tuote lisätty");
                        window.setTimeout(() => {
                          setEanScannerMessage("");
                        }, 900);
                      }}
                    />
                  </div>
                )}
            </div>
          </div>
        )}

        {false &&
          cheapest &&
          !cartModalOpen &&
          !searchPanelOpen &&
          !shopsPanelOpen &&
          !eanModalOpen &&
          activeResult !== "compare" &&
          !(loadingNormal || normalResults.length > 0) && (
            <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-3 right-3 z-40 mx-auto max-w-md rounded-[1.35rem] border border-white/10 bg-slate-950/92 p-3 text-white shadow-[0_18px_55px_rgba(15,23,42,0.35)] backdrop-blur-2xl sm:hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-wide text-green-300">
                    Huokein täysi kori
                  </p>
                  <p className="truncate text-sm font-black">
                    {cheapest.storeName}
                  </p>
                  {secondCheapest && savings > 0 && (
                    <p className="text-[11px] font-bold text-green-200">
                      Säästö {formatEuro(savings)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={openShoppingListForCheapest}
                  className="shrink-0 rounded-2xl bg-green-500 px-4 py-3 text-sm font-black text-slate-950"
                >
                  {formatEuro(cheapest.totalPrice)}
                </button>
              </div>
            </div>
          )}

        {/* V542_MOBILE_CART_PAPER_CARD_CONNECTED:
            Mobiili-Kori renderöidään erillisellä paperivihko/keräilylista-komponentilla.
            Desktop käyttää edelleen ZiiplyCartCardia muualla. */}
        {!showLaunchScreen && cartModalOpen && (
          <ZiiplyMobileCartCard
            open={true}
            items={cart.map((item: any) => {
              const key =
                item.id ??
                item.ean ??
                item.name ??
                item.product?.id ??
                item.product?.ean ??
                JSON.stringify(item);

              return {
                ...item,
                id: key,
                name: item.name ?? item.product?.name ?? item.title ?? item.productName,
                price:
                  item.price ??
                  item.product?.price ??
                  item.product?.unitPrice ??
                  item.product?.comparisonPrice,
                image:
                  item.image ??
                  item.imageUrl ??
                  item.pictureUrl ??
                  item.product?.image ??
                  item.product?.imageUrl ??
                  item.product?.pictureUrl,
                checked: Boolean(checkedCartItems[String(key)]),
              };
            })}
            savedListsCount={savedShoppingLists.length}
            onClose={closeCartModal}
            onSaveList={() => setCartSavePanelOpen(true)}
            onOpenSavedLists={() => setCartSavePanelOpen((current) => !current)}
            onClearCart={clearCart}
            onCompare={openComparisonView}
            onRemoveItem={(item: any) => {
              const match = cart.find((cartItem: any) => {
                const key =
                  cartItem.id ??
                  cartItem.ean ??
                  cartItem.name ??
                  cartItem.product?.id ??
                  cartItem.product?.ean ??
                  JSON.stringify(cartItem);

                return String(key) === String(item.id);
              });

              if (match) {
                const key =
                  (match as any).id ??
                  (match as any).ean ??
                  (match as any).name ??
                  (match as any).product?.id ??
                  (match as any).product?.ean ??
                  JSON.stringify(match);

                removeCartItem(String(key));
              }
            }}
            onToggleItem={(item: any) => {
              const key = String(item.id ?? "");
              setCheckedCartItems((current) => ({
                ...current,
                [key]: !current[key],
              }));
            }}
            onIncreaseItem={(item: any) => updateMobileCartItemQuantityV546(item, 1)}
            onDecreaseItem={(item: any) => updateMobileCartItemQuantityV546(item, -1)}
          />
        )}

        {!showLaunchScreen && activeResult === "compare" && !searchPanelOpen && !cartModalOpen && !shopsPanelOpen && !eanModalOpen && (
          <div
            className={`fixed inset-0 z-[53] overflow-y-auto bg-[#edf8f4] px-3 pb-[calc(env(safe-area-inset-bottom)+5.9rem)] pt-[calc(env(safe-area-inset-top)+5.35rem)] sm:hidden ziiply-soft-open`}
          >
            <div
              ref={compareOverlayScrollRef}
              className="mx-auto max-w-md space-y-3"
            >
              <ZiiplyCompareCard
                stores={chainResults
                  .filter((result) => !result.comingSoon)
                  .map((result) => ({
                    id: result.key,
                    name: result.storeName || result.chain,
                    chain: result.key === "s" ? "S" : result.key === "k" ? "K" : undefined,
                    totalPrice: Math.round((result.totalPrice || 0) * 100),
                    itemCount: result.foundItems,
                    isBest: cheapest?.key === result.key,
                    badge: result.missingItems > 0 ? `${result.missingItems} puuttuu` : "Täysi kori",
                  }))}
                title="Vertailu"
                subtitle={cart.length > 0 ? `${cart.length} tuotetta korissa` : "Lisää tuotteita koriin ja vertaile kauppoja"}
                loading={comparisonLoading}
              />

              <div className="rounded-[1.5rem] bg-[#fff8df]/95 p-3 shadow-sm ring-1 ring-slate-100">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={openSearchPanel}
                    className="rounded-[1rem] bg-green-700 px-3 py-3 text-sm font-black text-white shadow-sm active:scale-[0.98]"
                  >
                    Lisää tuote
                  </button>
                  <button
                    type="button"
                    onClick={showCart}
                    className="rounded-[1rem] bg-slate-900 px-3 py-3 text-sm font-black text-white shadow-sm active:scale-[0.98]"
                  >
                    Avaa kori
                  </button>
                </div>

                {!storesReadyForSearch && (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-black text-amber-800 ring-1 ring-amber-100">
                    Valitse kaupat, niin vertailu hakee hinnat.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        

        {lastCartToast && (
          <div className="fixed left-3 right-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[60] mx-auto max-w-md animate-[ziiplyFade_2.6s_ease-in-out] rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-black text-white shadow-2xl sm:hidden">
            ✓ {lastCartToast}
          </div>
        )}

        {/* V531_HAE_READY_MICRO_BADGE_RENDER */}
          {haeReadyBadgeVisibleV502 ? (
            <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+5.05rem)] left-[39%] z-[10001] animate-[ziiplyMicroReady_2.15s_ease-out_forwards] sm:hidden">
              <div className="relative rounded-[0.58rem] border-[2px] border-[#0b5b31] bg-[linear-gradient(180deg,#0c9143_0%,#087237_100%)] px-2.5 py-[3px] text-[9px] font-black italic leading-none text-[#fff1c8] shadow-[0_3px_0_#064a26,0_8px_18px_rgba(8,75,42,0.24),inset_0_0_0_1px_rgba(255,255,255,0.20)]">
                <span className="absolute -left-[5px] -top-[6px] text-[10px] leading-none text-[#f8c94b] drop-shadow-[0_1px_0_#6c4a10]">✦</span>
                {haeReadyBadgeTextV502}
              </div>
            </div>
          ) : null}
          <style jsx>{`
            @keyframes ziiplyMicroReady {
              0% {
                opacity: 0;
                transform: translate(-50%, 7px) scale(0.72) rotate(-2deg);
              }
              16% {
                opacity: 1;
                transform: translate(-50%, -2px) scale(1.04) rotate(-1deg);
              }
              28% {
                opacity: 1;
                transform: translate(-50%, 0) scale(1) rotate(0deg);
              }
              78% {
                opacity: 1;
                transform: translate(-50%, 0) scale(1) rotate(0deg);
              }
              100% {
                opacity: 0;
                transform: translate(-50%, 4px) scale(0.86) rotate(1deg);
              }
            }
          `}</style>
          <div className="V507_BOTTOM_NAV_CLICK_LAYER relative z-[10000]">
          <ZiiplyBottomNav
          shopsPanelOpen={shopsPanelOpen}
          initialStoreNavPrompt={initialStoreNavPrompt}
          searchBottomNavDisabled={searchBottomNavDisabled}
          initialStoreSelectionLocked={initialStoreSelectionLocked}
          searchPanelOpen={searchPanelOpen}
          searchReadyBounceKeyV320={0}
          storesReadyForSearch={false}
          cartLength={cart.length}
          cartModalOpen={cartModalOpen}
          activeResult={activeResult}
          onShopsClick={() => { suppressHaeReadyBadgeV541(); setNormalResults([]); setMobileResultsReadyQueryV537(""); toggleShopsPanel(); }}
          onSearchClick={() => { suppressHaeReadyBadgeV541(); setNormalResults([]); setMobileResultsReadyQueryV537(""); toggleSearchPanel(); }}
          onCartClick={() => { suppressHaeReadyBadgeV541(); setNormalResults([]); setMobileResultsReadyQueryV537(""); toggleCartModal(); }}
          onCompareClick={() => { suppressHaeReadyBadgeV541(); setNormalResults([]); setMobileResultsReadyQueryV537(""); toggleComparisonView(); }}
        />
          </div>

        <style>{`

          .ziiply-cart-retro-fix * { min-width: 0; }
          .ziiply-cart-retro-fix button { white-space: nowrap; }
          .ziiply-cart-retro-fix img { object-fit: contain; }
          .ziiply-cart-retro-fix [class*="rounded"] { box-sizing: border-box; }
          .ziiply-cart-retro-fix [class*="Pois"] { flex-shrink: 0; }
        @keyframes ziiplyHintPop {
          0%, 100% { opacity: 0; transform: translateY(4px) scale(0.96); }
          18%, 78% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ziiplyInlineNoticeFade {
          0% { opacity: 0; transform: scale(0.96); }
          12% { opacity: 1; transform: scale(1); }
          82% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.98); }
        }

        @keyframes ziiplyFade {
          0% { opacity: 0; transform: translateY(10px); }
          12% { opacity: 1; transform: translateY(0); }
          82% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(8px); }
        }
      `}</style>

        



        {mapStoresOverlayOpenV433 && (
          <div className="fixed inset-0 z-[120] bg-[#062f29]/45 px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-sm sm:hidden">
            <div className="mx-auto flex h-full max-w-[430px] flex-col overflow-hidden rounded-[2rem] border-[3px] border-[#c9a85c] bg-[#fff8dc] shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between border-b border-[#d6bd76] bg-[#073d32] px-4 py-3 text-white">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-[#9fd8d0] shadow-inner ring-1 ring-[#6dbbb2]">
                    <img
                      src="/icons/ziiply-compass.png"
                      alt=""
                      className="h-16 w-16 object-contain drop-shadow-[0_3px_7px_rgba(7,61,50,0.38)]"
                      draggable={false}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.18em] text-[#f6d77b]">
                      Kartta
                    </div>
                    <div className="text-lg font-black leading-tight">
                      Valitut kaupat
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMapStoresOverlayOpenV433(false)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-[#fff8df]/12 text-2xl font-black active:scale-95"
                  aria-label="Sulje kartta"
                >
                  ×
                </button>
              </div>

              <div className="relative min-h-0 flex-1 bg-[#fff8df]">
                <iframe
                  title="Ziiply kauppakartta"
                  src={mapStoresIframeSrcV433}
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              <div className="space-y-2 border-t border-[#d6bd76] bg-[#fff8dc] p-3">
                {gpsCoordsV320 ? (
                  <div className="rounded-2xl bg-[#e7f6ee] px-3 py-2 text-sm font-black text-[#087a3a]">
                    Oma sijainti mukana reittilinkeissä.
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[#fff1c7] px-3 py-2 text-sm font-black text-[#7b5a14]">
                    GPS ei ole päällä. Reitti avautuu ilman lähtöpistettä.
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2">
                  {selectedMapStoresV433.map((store) => (
                    <a
                      key={`${store.key}-${store.name}`}
                      href={getMapRouteUrlV433(store)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-2xl bg-[#fff8df] px-4 py-3 text-left shadow-sm ring-1 ring-[#ead99f] active:scale-[0.99]"
                    >
                      <span>
                        <span className="block text-base font-black text-[#17223b]">
                          {store.name}
                        </span>
                        <span className="block text-xs font-black uppercase tracking-[0.12em] text-[#7a6a43]">
                          Näytä reitti
                        </span>
                      </span>
                      <span className="text-2xl">↗</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}


        {/* V506 GPS debug panel removed */}


      </main>
    </>
  );
}

export {};
