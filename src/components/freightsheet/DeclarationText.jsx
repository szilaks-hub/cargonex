// Helper to generate the mandatory declaration paragraph
const COUNTRY_ADJECTIVES_HU = {
  HU: "magyarországi",
  SK: "szlovákiai",
  RO: "romániai",
  PL: "lengyelországi",
  HR: "horvátországi",
  SI: "szlovéniai",
  RS: "szerb",
  AT: "ausztriai",
  DE: "német",
  CZ: "cseh",
  BG: "bolgár",
  UA: "ukrán",
  BA: "boszniai",
  ME: "montenegrói",
  MK: "macedón",
  AL: "albán",
};

export function getDeclarationText(sheet) {
  const originAddress = [sheet.origin_address, sheet.origin_city, sheet.origin_country]
    .filter(Boolean)
    .join(", ");

  const supplierName = sheet.supplier_name || "—";
  const goodsOrigin = sheet.goods_origin_description || "—";
  const countryAdj = COUNTRY_ADJECTIVES_HU[sheet.destination_country] || sheet.destination_country;
  const incotermsPlace = sheet.incoterms_place || sheet.origin_city || "—";
  const incoterms = sheet.incoterms || "FCA";

  return `
A Steel-Transz Kft. (Címe: 2371 Dabas, Kandó Kálmán u. 6.), ezen nyilatkozatával kijelenti, hogy a ${originAddress} -től vásárolt áru, mely ${goodsOrigin} jön, és ${incoterms}-${incotermsPlace} paritással van ellátva, és a listán szereplő ${countryAdj} városokba megy, azoknál a következő fuvardíjakkal kell számolni:
  `.trim();
}