// Only stable UI action names cross the analytics boundary.
export const BETA_ACTIONS = [
  "app_opened", "guide_opened", "store_mode_changed", "store_selected", "store_search_used",
  "shops_panel_opened", "main_search_clicked", "justiina_product_search_clicked",
  "search_used", "search_priced_results_shown", "search_no_priced_results", "search_failed",
  "gosta_offer_search_clicked", "gosta_offer_api_search_used", "gosta_watch_saved",
  "gosta_watch_results_opened", "barcode_scanner_opened", "barcode_search_used",
  "desktop_scanner_selector_opened", "desktop_camera_scanner_opened", "desktop_barcode_reader_opened",
  "arvo_scanner_opened", "arvo_scan_success", "arvo_product_found", "arvo_product_not_found",
  "arvo_scanner_error", "arvo_cart_added", "arvo_meal_saved", "arvo_settings_opened",
  "comparison_opened", "single_product_selected_for_compare", "single_product_compare_clicked",
  "optimize_cart_clicked", "cart_opened", "cart_item_removed", "cart_quantity_changed",
  "cart_cleared", "offer_added_to_cart", "manual_items_added_to_cart", "product_added_to_cart",
  "shopping_list_saved", "shopping_list_shared", "recipe_search_requested",
  "recipe_saved", "recipe_item_added", "buy_clicked", "clipboard_pasted_to_search",
] as const;
const actions: ReadonlySet<string> = new Set(BETA_ACTIONS);
export function isBetaAction(value: unknown): value is typeof BETA_ACTIONS[number] {
  return typeof value === "string" && actions.has(value);
}

export function trackBetaAction(action: string, layout?: "desktop" | "mobile") {
  if (typeof window === "undefined" || window.location.hostname !== "beta.ziiply.fi" || !isBetaAction(action)) return;
  let internalTest = false;
  try { internalTest = window.localStorage.getItem("ziiply_internal_test_user") === "1"; } catch {}
  const surface = layout ?? (window.location.pathname.startsWith("/desktop-preview") ||
    window.matchMedia("(min-width: 1024px)").matches ? "desktop" : "mobile");
  void fetch("/api/analytics/beta-action", {
    method: "POST", credentials: "same-origin", keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, surface, internalTest }),
  }).catch(() => {});
}
