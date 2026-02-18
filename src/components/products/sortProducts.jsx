/**
 * Sorts products by: category name → diameter (numeric asc) → length (numeric asc)
 * Products without diameter are pushed to the bottom.
 */
export function sortProducts(products) {
  return [...products].sort((a, b) => {
    // 1. Category
    const catA = (a.category_name || "").toLowerCase();
    const catB = (b.category_name || "").toLowerCase();
    if (catA < catB) return -1;
    if (catA > catB) return 1;

    // 2. Diameter (numeric) – no diameter → end
    const dA = a.diameter != null ? Number(a.diameter) : Infinity;
    const dB = b.diameter != null ? Number(b.diameter) : Infinity;
    if (dA !== dB) return dA - dB;

    // 3. Length (numeric) – no length → end
    const lA = a.length != null ? Number(a.length) : Infinity;
    const lB = b.length != null ? Number(b.length) : Infinity;
    return lA - lB;
  });
}

/**
 * Splits and sorts products into favorites-first, then rest.
 * Each section sorted by category → diameter → length.
 */
export function sortWithFavorites(products, favoriteProductIds) {
  const favs = products.filter((p) => favoriteProductIds.has(p.id));
  const rest = products.filter((p) => !favoriteProductIds.has(p.id));
  return { favs: sortProducts(favs), rest: sortProducts(rest) };
}