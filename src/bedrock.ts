export const IS_BEDROCK = localStorage.getItem("bedrockEdition") === "1";
export function enterBedrock(): void  { localStorage.setItem("bedrockEdition","1"); location.reload(); }
export function exitBedrock():  void  { localStorage.removeItem("bedrockEdition");   location.reload(); }
