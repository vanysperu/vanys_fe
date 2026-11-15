// Ubigeo (código de 6 dígitos de departamento + provincia + distrito del INEI):
// SUNAT lo pide en el punto de partida y de llegada de la guía de remisión.
// Acá viven la búsqueda por nombre y la detección del distrito a partir de una
// dirección escrita. Todo es local (tabla del INEI, sin servicios externos), así
// que las direcciones de los clientes nunca salen del sistema.

export interface UbigeoEntry {
  code: string;
  district: string;
  province: string;
  department: string;
  population: number;
}

interface IndexedEntry extends UbigeoEntry {
  // Nombres sin tildes ni mayúsculas, para comparar.
  nDistrict: string;
  nProvince: string;
  nDepartment: string;
  // Distrito capital de su provincia (Lima/Lima, Callao/Callao, Arequipa/Arequipa...):
  // su nombre se usa también como ciudad en cualquier dirección ("Miraflores, Lima"),
  // así que mencionarlo no prueba que el distrito sea ese.
  isProvinceCapital: boolean;
}

export interface UbigeoDetection {
  // Solo viene lleno cuando hay un único distrito con confianza suficiente.
  best: UbigeoEntry | null;
  // Opciones para que la persona elija cuando no hay una sola respuesta clara.
  candidates: UbigeoEntry[];
}

// Formas de escribir un distrito que no coinciden con su nombre oficial.
const ALIASES: Readonly<Record<string, string>> = {
  'cercado de lima': '150101',
  surco: '150140',
};

const MAX_SUGGESTIONS = 5;
// Un distrito se da por seguro, aun con nombre repetido, si tiene al menos esta
// población y es DOMINANT_RATIO veces más grande que los otros con el mismo nombre.
const DOMINANT_MIN_POPULATION = 50_000;
const DOMINANT_RATIO = 10;
// Un nombre corto ("Ate", "Ica", "Mala") se confunde fácil con otra palabra de la
// dirección: solo se acepta solo si va separado por coma o guion.
const MIN_UNDELIMITED_LENGTH = 5;

let cachedIndex: IndexedEntry[] | null = null;
let loading: Promise<IndexedEntry[]> | null = null;

// Sin tildes, en minúsculas y con una sola clase de separador. Los separadores
// que suelen dividir una dirección (, ; - / | paréntesis) quedan como "," para
// distinguir "Calle Mala 123" de "Av. Larco 345, Mala".
export function normalizeText(text: string, keepSeparators = false): string {
  const plain = text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const withSeparators = keepSeparators ? plain.replace(/[,;\-–—/|()]/g, ' , ') : plain;
  return withSeparators.replace(/[^a-z0-9,]+/g, ' ').replace(/ ?, ?/g, keepSeparators ? ' , ' : ' ').replace(/\s+/g, ' ').trim();
}

const toIndexed = (line: string): IndexedEntry | null => {
  const [code, district, province, department, population] = line.split('|');
  if (!code || !district || !province || !department) return null;
  const nDistrict = normalizeText(district);
  const nProvince = normalizeText(province);
  return {
    code,
    district,
    province,
    department,
    population: Number(population) || 0,
    nDistrict,
    nProvince,
    nDepartment: normalizeText(department),
    isProvinceCapital: nDistrict === nProvince,
  };
};

// La tabla (75 KB) se baja la primera vez que una pantalla la necesita, no con la app.
export async function loadUbigeoTable(): Promise<readonly UbigeoEntry[]> {
  if (cachedIndex) return cachedIndex;
  loading ??= import('./ubigeoData').then(({ UBIGEO_TABLE }) => {
    cachedIndex = UBIGEO_TABLE.split('\n').map(toIndexed).filter((entry): entry is IndexedEntry => entry !== null);
    return cachedIndex;
  });
  return loading;
}

export const formatUbigeo = (entry: UbigeoEntry): string => `${entry.district}, ${entry.province}, ${entry.department}`;

export function findUbigeo(table: readonly UbigeoEntry[], code: string | null | undefined): UbigeoEntry | undefined {
  return code ? table.find((entry) => entry.code === code) : undefined;
}

const byPopulation = (a: UbigeoEntry, b: UbigeoEntry): number => b.population - a.population;

// (Las funciones de abajo reciben la tabla que devuelve loadUbigeoTable().)

// Búsqueda mientras se escribe: por nombre de distrito, provincia o departamento
// (todas las palabras escritas tienen que aparecer) o por el código.
export function searchUbigeo(table: readonly UbigeoEntry[], text: string, limit = 30): UbigeoEntry[] {
  const query = normalizeText(text);
  if (!query) return [];
  const indexed = table as readonly IndexedEntry[];
  if (/^\d+$/.test(query)) return indexed.filter((entry) => entry.code.startsWith(query)).slice(0, limit);

  const words = query.split(' ');
  const ranked = indexed
    .filter((entry) => {
      const haystack = `${entry.nDistrict} ${entry.nProvince} ${entry.nDepartment}`;
      return words.every((word) => haystack.includes(word));
    })
    .map((entry) => {
      // Primero los que el distrito empieza o es exactamente lo escrito.
      const rank = entry.nDistrict === query ? 0 : entry.nDistrict.startsWith(query) ? 1 : entry.nDistrict.includes(query) ? 2 : 3;
      return { entry, rank };
    })
    .sort((a, b) => a.rank - b.rank || byPopulation(a.entry, b.entry));
  return ranked.slice(0, limit).map(({ entry }) => entry);
}

interface DistrictMention {
  entry: IndexedEntry;
  start: number;
  end: number;
  // Vino de ALIASES ("Cercado de Lima"): nombra el distrito de forma explícita, no la ciudad.
  viaAlias?: boolean;
}

// Posiciones (en palabras, sobre el texto con separadores) donde aparece `name`.
const findMentions = (tokens: readonly string[], name: string): { start: number; end: number }[] => {
  const nameTokens = name.split(' ');
  const found: { start: number; end: number }[] = [];
  for (let start = 0; start + nameTokens.length <= tokens.length; start += 1) {
    if (nameTokens.every((word, offset) => tokens[start + offset] === word)) found.push({ start, end: start + nameTokens.length });
  }
  return found;
};

const mentionsName = (haystack: string, name: string): boolean => ` ${haystack} `.includes(` ${name} `);

// Detecta el distrito escrito en una dirección ("Av. Larco 345, Miraflores").
// Solo devuelve `best` cuando hay una única respuesta confiable; en cualquier otro
// caso devuelve opciones para que la persona elija. Un ubigeo equivocado hace que
// SUNAT rechace la guía, así que ante la duda no se rellena solo.
export function detectUbigeo(table: readonly UbigeoEntry[], address: string): UbigeoDetection {
  const empty: UbigeoDetection = { best: null, candidates: [] };
  const withSeparators = normalizeText(address, true);
  if (withSeparators.length < 4) return empty;
  const tokens = withSeparators.split(' ');
  const plainText = withSeparators.replace(/ , /g, ' ').replace(/\s+/g, ' ');
  const indexed = table as readonly IndexedEntry[];

  // 1) Todos los distritos cuyo nombre aparece completo en la dirección.
  const mentions: DistrictMention[] = [];
  for (const entry of indexed) {
    for (const spot of findMentions(tokens, entry.nDistrict)) mentions.push({ entry, ...spot });
  }
  for (const [alias, code] of Object.entries(ALIASES)) {
    const entry = indexed.find((candidate) => candidate.code === code);
    if (!entry) continue;
    for (const spot of findMentions(tokens, alias)) mentions.push({ entry, viaAlias: true, ...spot });
  }

  // 2) Un nombre dentro de otro más largo no cuenta ("Santa" dentro de "Santa Rosa").
  const own = mentions.filter(
    (mention) => !mentions.some((other) => other !== mention && other.end - other.start > mention.end - mention.start && other.start <= mention.start && other.end >= mention.end),
  );
  if (own.length === 0) return empty;

  // 3) Se agrupa por la mención (mismo lugar del texto = mismo nombre, distintas provincias).
  const groups = new Map<string, DistrictMention[]>();
  for (const mention of own) {
    const key = `${mention.start}:${mention.end}`;
    groups.set(key, [...(groups.get(key) ?? []), mention]);
  }
  const groupEnd = (items: readonly DistrictMention[]): number => items[0]?.end ?? 0;
  const ordered = [...groups.values()].sort((a, b) => groupEnd(b) - groupEnd(a));

  // Un nombre que es la provincia o el departamento de otro distrito mencionado es
  // contexto de ese distrito ("Miraflores - Yauyos": Yauyos es la provincia), no un
  // distrito más.
  const isContextOf = (candidateGroup: readonly DistrictMention[]): boolean => {
    const name = candidateGroup[0]?.entry.nDistrict;
    return ordered.some(
      (other) => other !== candidateGroup && other.some((mention) => mention.entry.nProvince === name || mention.entry.nDepartment === name),
    );
  };
  // El distrito suele ir al final de la dirección, y el que parece ciudad
  // (capital de provincia) pierde frente a uno más específico.
  const isSpecificGroup = (candidateGroup: readonly DistrictMention[]): boolean =>
    candidateGroup.some((mention) => !mention.entry.isProvinceCapital || mention.viaAlias === true);
  const specific = ordered.find((candidate) => isSpecificGroup(candidate) && !isContextOf(candidate)) ?? ordered.find(isSpecificGroup);
  const group = specific ?? ordered[0];
  if (!group) return empty;

  // 4) Desempate con la provincia y el departamento si también están escritos.
  const scored = group
    .map((mention) => ({
      entry: mention.entry,
      score: (mentionsName(plainText, mention.entry.nProvince) && !mention.entry.isProvinceCapital ? 2 : 0) + (mentionsName(plainText, mention.entry.nDepartment) ? 1 : 0),
      start: mention.start,
    }))
    .sort((a, b) => b.score - a.score || byPopulation(a.entry, b.entry));
  const top = scored[0];
  if (!top) return empty;
  const candidates = scored.slice(0, MAX_SUGGESTIONS).map(({ entry }) => entry);

  const tiedAtTop = scored.filter((item) => item.score === top.score).length > 1;
  const isWeak = specific === undefined; // solo se nombró una ciudad (Lima, Callao...)
  const nameLength = top.entry.nDistrict.length;
  const delimited = top.start === 0 || tokens[top.start - 1] === ',';
  const confidentName = nameLength >= MIN_UNDELIMITED_LENGTH || delimited;
  // Sin provincia/departamento escritos solo se rellena si el nombre es único en el país
  // o si un distrito es muchísimo más grande que los demás que se llaman igual
  // (San Isidro: Lima 71 000 hab. frente a 1 100 del otro).
  const sizes = scored.map(({ entry }) => entry.population).sort((a, b) => b - a);
  const dominant = (sizes[0] ?? 0) >= DOMINANT_MIN_POPULATION && (sizes[1] ?? 0) * DOMINANT_RATIO <= (sizes[0] ?? 0);
  const needsContext = group.length > 1 && top.score === 0 && !dominant;

  if (tiedAtTop && !(top.score === 0 && dominant)) return { best: null, candidates };
  if (isWeak || !confidentName || needsContext) return { best: null, candidates };
  return { best: top.entry, candidates };
}
