const FIRST_NAMES_MAP: Record<string, string> = {
  Noah: "Nuru",
  Ethan: "Elias",
  Sofia: "Selamawit",
  Grace: "Genet",
  Amara: "Abebech",
  Maria: "Mulugeta",
  Zara: "Zewditu",
  John: "Yohannes",
  Daniel: "Dawit",
  Ahmed: "Abebe",
  Fatima: "Frehiwot",
  Liam: "Lemessa",
  Sarah: "Selam",
  Marcus: "Mulugeta",
  Tom: "Tadesse",
  Peter: "Petros",
  Ivy: "Eleni",
  Omar: "Omer",
  Hana: "Hana",
};

const LAST_NAMES_MAP: Record<string, string> = {
  Hassan: "Tadesse",
  Adeyemi: "Alemu",
  Alvarez: "Bekele",
  Mwangi: "Yilma",
  Novak: "Worku",
  Rossi: "Mamo",
  Petrov: "Tefera",
  Kaur: "Reda",
  Sato: "Assefa",
  Doe: "Hailemariam",
  Okoro: "Tadesse",
  Lin: "Alemu",
  Reid: "Bekele",
  Haddad: "Worku",
  Fielding: "Mamo",
  Wanjiru: "Tefera",
  Salaam: "Reda",
  Chen: "Assefa",
  Farah: "Hailemariam",
};

export function toEthiopianName(name: string | null | undefined): string {
  if (!name) return "Abebech Tadesse";
  
  // If it already looks like an Ethiopian name (e.g. Abebe, Bethlehem, Dawit), return as is
  const ethiopianTokens = [
    "abebe", "abebech", "tigist", "dawit", "almaz", "bethlehem", "getachew",
    "yohannes", "kebede", "bereketeab", "selamawit", "mulugeta", "eleni",
    "haile", "solomon", "frehiwot", "tadesse", "alemu", "bekele", "yilma",
    "worku", "mamo", "tefera", "reda", "assefa", "hailemariam"
  ];

  const lower = name.toLowerCase();
  const alreadyEthiopian = ethiopianTokens.some(tok => lower.includes(tok));
  if (alreadyEthiopian) return name;

  const parts = name.trim().split(/\s+/);
  const transformed = parts.map((part) => {
    const clean = part.replace(/[^a-zA-Z]/g, "");
    if (FIRST_NAMES_MAP[clean]) return FIRST_NAMES_MAP[clean];
    if (LAST_NAMES_MAP[clean]) return LAST_NAMES_MAP[clean];
    return part;
  });

  return transformed.join(" ");
}
