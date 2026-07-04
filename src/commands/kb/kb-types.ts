export interface KbFrontmatter {
  name: string;
  description: string;
  queries: string[];
  tables: string[];
  tags: string[];
}

export interface KbFile extends KbFrontmatter {
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface KbIndexEntry {
  id: string;
  filePath: string;
  name: string;
  description: string;
  tags: string[];
  tables: string[];
  queries: string[];
  updatedAt: string;
}

export interface KbSearchIndex {
  generatedAt: string;
  count: number;
  entries: KbIndexEntry[];
}

export const KB_REQUIRED_FIELDS: (keyof KbFrontmatter)[] = [
  "name",
  "description",
  "queries",
  "tables",
  "tags",
];
