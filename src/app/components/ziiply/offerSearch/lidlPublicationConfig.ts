/** Lidl's parsed public leaflet is national, not store-specific.
 * The persisted key is kept for backwards compatibility with already staged
 * publications; application logic must never treat FI0218 as an availability
 * restriction or a Hyvinkää-only publication.
 */
export const LIDL_NATIONAL_PUBLICATION_CHAIN = "LIDL:FI0218";
