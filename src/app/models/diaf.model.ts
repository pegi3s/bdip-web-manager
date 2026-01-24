/**
 * DIAF (Docker Image Association File) model and parser.
 * Format: Tab-separated values with DIO ID and software name.
 * Example: DIO:0000033	abyss
 */

export interface DiafMapping {
  dioId: string;
  name: string;
}

/**
 * Parse DIAF file content into an array of mappings.
 * @param content Raw DIAF file content
 * @returns Array of DiafMapping objects
 */
export function parseDiaf(content: string): DiafMapping[] {
  const mappings: DiafMapping[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Split by tab
    const parts = trimmedLine.split('\t');
    if (parts.length >= 2) {
      const dioId = parts[0].trim();
      const name = parts[1].trim();

      // Validate DIO ID format
      if (dioId.match(/^DIO:\d{7}$/)) {
        mappings.push({ dioId, name });
      }
    }
  }

  return mappings;
}

/**
 * Serialize DIAF mappings back to file content.
 * @param mappings Array of DiafMapping objects
 * @returns DIAF file content as string
 */
export function serializeDiaf(mappings: DiafMapping[]): string {
  // Sort by DIO ID for consistent output
  const sorted = [...mappings].sort((a, b) => a.dioId.localeCompare(b.dioId));
  return sorted.map((m) => `${m.dioId}\t${m.name}`).join('\n');
}

/**
 * Get all mappings for a specific DIO ID
 */
export function getMappingsForDioId(mappings: DiafMapping[], dioId: string): DiafMapping[] {
  return mappings.filter((m) => m.dioId === dioId);
}

/**
 * Get all mappings for a specific software name
 */
export function getMappingsForName(mappings: DiafMapping[], name: string): DiafMapping[] {
  return mappings.filter((m) => m.name === name);
}

/**
 * Add a new mapping
 */
export function addMapping(mappings: DiafMapping[], dioId: string, name: string): DiafMapping[] {
  return [...mappings, { dioId, name }];
}

/**
 * Remove a mapping
 */
export function removeMapping(mappings: DiafMapping[], dioId: string, name: string): DiafMapping[] {
  return mappings.filter((m) => !(m.dioId === dioId && m.name === name));
}

/**
 * Create a DIAF file from mappings
 */
export function toDiafFile(mappings: DiafMapping[]): File {
  return new File([serializeDiaf(mappings)], 'dio.diaf', { type: 'text/plain' });
}
