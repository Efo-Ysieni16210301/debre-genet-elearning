const SPINES = ["bg-lapis", "bg-fern", "bg-madder", "bg-saffron"];

export function spineFor(id: string) {
  let sum = 0;
  for (const char of id) {
    sum += char.charCodeAt(0);
  }
  return SPINES[sum % SPINES.length];
}
