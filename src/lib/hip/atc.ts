/**
 * WHO ATC (Anatomical Therapeutic Chemical) coding for medication orders.
 *
 * A curated subset covering medicines on Ethiopia's essential medicines list
 * that this platform prescribes (internal medicine, antimicrobials, supportive
 * care and oncology). Orders keep their free-text name; the ATC code is added
 * at export (FHIR) and measured on the data-quality tab.
 */

export const ATC_SYSTEM = "http://www.whocc.no/atc";

type AtcEntry = { code: string; name: string; aliases?: string[] };

const ENTRIES: AtcEntry[] = [
  // Diabetes & endocrine
  { code: "A10BA02", name: "metformin" },
  { code: "A10BB09", name: "gliclazide" },
  { code: "A10BB01", name: "glibenclamide", aliases: ["glyburide"] },
  { code: "A10AC01", name: "insulin isophane", aliases: ["nph insulin", "insulin nph"] },
  { code: "A10AB01", name: "insulin", aliases: ["soluble insulin", "regular insulin"] },
  { code: "H03AA01", name: "levothyroxine" },
  { code: "H02AB06", name: "prednisolone" },
  { code: "H02AB07", name: "prednisone" },
  { code: "H02AB02", name: "dexamethasone" },
  { code: "H02AB09", name: "hydrocortisone" },
  // Cardiovascular
  { code: "C08CA01", name: "amlodipine" },
  { code: "C08CA05", name: "nifedipine" },
  { code: "C09AA02", name: "enalapril" },
  { code: "C09AA03", name: "lisinopril" },
  { code: "C09CA01", name: "losartan" },
  { code: "C03AA03", name: "hydrochlorothiazide", aliases: ["hctz"] },
  { code: "C03CA01", name: "furosemide", aliases: ["frusemide"] },
  { code: "C03DA01", name: "spironolactone" },
  { code: "C07AB03", name: "atenolol" },
  { code: "C07AB02", name: "metoprolol" },
  { code: "C07AG02", name: "carvedilol" },
  { code: "C10AA05", name: "atorvastatin" },
  { code: "C10AA01", name: "simvastatin" },
  { code: "B01AC06", name: "aspirin", aliases: ["acetylsalicylic acid"] },
  { code: "B01AC04", name: "clopidogrel" },
  { code: "B01AA03", name: "warfarin" },
  { code: "B01AB05", name: "enoxaparin" },
  { code: "B01AB01", name: "heparin" },
  // Antimicrobials
  {
    code: "J01CR02",
    name: "amoxicillin and clavulanic acid",
    aliases: ["co-amoxiclav", "amoxicillin-clavulanate", "amoxicillin/clavulanate", "augmentin"],
  },
  { code: "J01CA04", name: "amoxicillin" },
  { code: "J01CA01", name: "ampicillin" },
  {
    code: "J01CE01",
    name: "benzylpenicillin",
    aliases: ["penicillin g", "crystalline penicillin"],
  },
  { code: "J01DD04", name: "ceftriaxone" },
  { code: "J01MA02", name: "ciprofloxacin" },
  { code: "J01FA10", name: "azithromycin" },
  { code: "J01AA02", name: "doxycycline" },
  {
    code: "J01EE01",
    name: "sulfamethoxazole and trimethoprim",
    aliases: ["cotrimoxazole", "co-trimoxazole", "bactrim"],
  },
  { code: "J01GB03", name: "gentamicin" },
  { code: "J01XA01", name: "vancomycin" },
  { code: "P01AB01", name: "metronidazole" },
  { code: "J02AC01", name: "fluconazole" },
  {
    code: "P01BF01",
    name: "artemether and lumefantrine",
    aliases: ["artemether-lumefantrine", "coartem"],
  },
  { code: "J05AR27", name: "tenofovir, lamivudine and dolutegravir", aliases: ["tld"] },
  // Analgesia, GI & supportive care
  { code: "N02BE01", name: "paracetamol", aliases: ["acetaminophen"] },
  { code: "M01AE01", name: "ibuprofen" },
  { code: "M01AB05", name: "diclofenac" },
  { code: "N02AX02", name: "tramadol" },
  { code: "N02AA01", name: "morphine" },
  { code: "A02BC01", name: "omeprazole" },
  { code: "A02BC02", name: "pantoprazole" },
  { code: "A04AA01", name: "ondansetron" },
  { code: "A04AA02", name: "granisetron" },
  { code: "A04AD12", name: "aprepitant" },
  { code: "A03FA01", name: "metoclopramide" },
  { code: "R03AC02", name: "salbutamol", aliases: ["albuterol"] },
  { code: "B03AA07", name: "ferrous sulfate", aliases: ["ferrous sulphate"] },
  { code: "B03BB01", name: "folic acid" },
  { code: "A12BA01", name: "potassium chloride", aliases: ["kcl"] },
  { code: "A12AA03", name: "calcium gluconate" },
  { code: "A12CC02", name: "magnesium sulfate", aliases: ["magnesium sulphate"] },
  { code: "M04AA01", name: "allopurinol" },
  { code: "M05BA08", name: "zoledronic acid" },
  { code: "L03AA02", name: "filgrastim", aliases: ["g-csf"] },
  { code: "B03XA01", name: "erythropoietin", aliases: ["epoetin"] },
  { code: "V03AF01", name: "mesna" },
  { code: "V03AF03", name: "calcium folinate", aliases: ["leucovorin", "folinic acid"] },
  // Oncology
  { code: "L01DB01", name: "doxorubicin", aliases: ["adriamycin"] },
  { code: "L01AA01", name: "cyclophosphamide" },
  { code: "L01CD01", name: "paclitaxel" },
  { code: "L01CD02", name: "docetaxel" },
  { code: "L01XA02", name: "carboplatin" },
  { code: "L01XA01", name: "cisplatin" },
  { code: "L01XA03", name: "oxaliplatin" },
  { code: "L01BC02", name: "fluorouracil", aliases: ["5-fu", "5-fluorouracil", "5fu"] },
  { code: "L01BC06", name: "capecitabine" },
  { code: "L01BC05", name: "gemcitabine" },
  { code: "L01BA01", name: "methotrexate" },
  { code: "L01CA02", name: "vincristine" },
  { code: "L01CA01", name: "vinblastine" },
  { code: "L01CB01", name: "etoposide" },
  { code: "L01DC01", name: "bleomycin" },
  { code: "L01AX04", name: "dacarbazine" },
  { code: "L01FA01", name: "rituximab" },
  { code: "L01FD01", name: "trastuzumab" },
  { code: "L02BA01", name: "tamoxifen" },
  { code: "L02BG04", name: "letrozole" },
  { code: "L02BG03", name: "anastrozole" },
  { code: "L02AE03", name: "goserelin" },
  { code: "L02BB03", name: "bicalutamide" },
];

/** Every searchable term, longest first so "insulin isophane" wins over "insulin". */
const TERMS: { term: string; entry: AtcEntry }[] = ENTRIES.flatMap((entry) =>
  [entry.name, ...(entry.aliases ?? [])].map((term) => ({ term: term.toLowerCase(), entry })),
).sort((a, b) => b.term.length - a.term.length);

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MATCHERS = TERMS.map(({ term, entry }) => ({
  // Whole-word match: "insulin" must not match inside "insulinoma".
  re: new RegExp(`(^|[^a-z0-9])${escapeRegex(term)}($|[^a-z0-9])`),
  entry,
}));

export type AtcMatch = { code: string; display: string };

/** ATC code for a medication order name such as "Metformin 1 g PO BD", or null when unknown. */
export function atcFor(orderName: string | null | undefined): AtcMatch | null {
  const text = (orderName ?? "").toLowerCase();
  if (!text.trim()) return null;
  for (const m of MATCHERS) {
    if (m.re.test(text)) return { code: m.entry.code, display: m.entry.name };
  }
  return null;
}

export const ATC_ENTRY_COUNT = ENTRIES.length;
