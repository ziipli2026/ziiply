# 41LV preview V130

Not approved for production or as a prerequisite for running 42AV.

The immutable 41LV publisher replay retains 102 source rows. Exactly three transaction corrections versus V129 were confirmed against the original printed PDF: shower gel 2.99 EUR per item, biodegradable shower soap 1.75 EUR per item, and fabric conditioner two items for 5.50 EUR. The parser requires printed euro/cents glyphs and the product's own unit rate; arithmetic alone cannot supply a missing printed price.

Store-publication normalization distinguishes package contents from a multibuy only when explicit content count, size, own printed unit rate and any printed deposit reconcile with the unchanged transaction price. Rates before the regular-price disclaimer take precedence over the regular-price API unit rate. Ambiguous sizes or rates cannot prove this distinction.

Classification now recognizes frozen vegetable mixes and baby-food branding. A unique aligned uppercase hyphen prefix can recover a wrapped product heading, including cleaning concentrates; broad neighbouring text is not used for classification.

Validation: 84 parser, transaction, category, display and image-identity tests passed, including the complete immutable-source transaction comparison. This is not proof of all product identities, categories or images. Fragmented offer titles, image gaps and unresolved source rows still require review before final 41LV approval. Production is unchanged.
