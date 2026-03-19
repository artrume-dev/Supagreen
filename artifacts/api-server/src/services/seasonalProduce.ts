const SOUTHERN_HEMISPHERE_COUNTRIES = new Set([
  "australia",
  "new zealand",
  "argentina",
  "brazil",
  "chile",
  "south africa",
]);

const SEASONAL_PRODUCE_BY_SEASON: Record<
  "spring" | "summer" | "autumn" | "winter",
  string[]
> = {
  spring: [
    "asparagus",
    "artichoke",
    "peas",
    "spinach",
    "lettuce",
    "spring onion",
    "radish",
    "strawberry",
    "new potato",
    "carrot",
    "mint",
    "broccoli",
  ],
  summer: [
    "tomato",
    "zucchini",
    "cucumber",
    "eggplant",
    "bell pepper",
    "corn",
    "green beans",
    "basil",
    "watermelon",
    "blueberries",
    "peach",
    "cherry",
  ],
  autumn: [
    "pumpkin",
    "butternut squash",
    "sweet potato",
    "beetroot",
    "cauliflower",
    "kale",
    "pear",
    "apple",
    "fig",
    "mushroom",
    "leek",
    "parsnip",
  ],
  winter: [
    "cabbage",
    "brussels sprouts",
    "carrot",
    "parsnip",
    "turnip",
    "leek",
    "onion",
    "potato",
    "orange",
    "grapefruit",
    "broccoli",
    "cauliflower",
  ],
};

const COUNTRY_SPECIFIC_ALIASES: Record<string, string[]> = {
  "united kingdom": ["courgette", "aubergine", "swede", "rocket"],
  uk: ["courgette", "aubergine", "swede", "rocket"],
  australia: ["capsicum", "silverbeet", "rockmelon", "pawpaw"],
};

export function isSouthernHemisphereCountry(country: string | null): boolean {
  return country ? SOUTHERN_HEMISPHERE_COUNTRIES.has(country.toLowerCase()) : false;
}

export function getSeasonForCountryMonth(
  country: string | null,
  month: number,
): "spring" | "summer" | "autumn" | "winter" {
  const zeroIndexedMonth = month - 1;
  const isSouthern = isSouthernHemisphereCountry(country);

  if (zeroIndexedMonth >= 2 && zeroIndexedMonth <= 4) {
    return isSouthern ? "autumn" : "spring";
  }
  if (zeroIndexedMonth >= 5 && zeroIndexedMonth <= 7) {
    return isSouthern ? "winter" : "summer";
  }
  if (zeroIndexedMonth >= 8 && zeroIndexedMonth <= 10) {
    return isSouthern ? "spring" : "autumn";
  }
  return isSouthern ? "summer" : "winter";
}

export function getSeasonalProduceForCountryMonth(
  country: string | null,
  month: number,
): string[] {
  const season = getSeasonForCountryMonth(country, month);
  const base = [...SEASONAL_PRODUCE_BY_SEASON[season]];
  const countryAliases = country
    ? COUNTRY_SPECIFIC_ALIASES[country.toLowerCase()] ?? []
    : [];
  return [...new Set([...base, ...countryAliases])];
}

