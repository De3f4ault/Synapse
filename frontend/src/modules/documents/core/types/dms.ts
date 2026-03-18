/**
 * DMS Types — Aligned with Paperless-ngx data model
 *
 * These types mirror the backend DMS schemas and provide
 * the type foundation for all DMS UI components.
 */

// ============================================================================
// Taxonomy Models
// ============================================================================

export interface Correspondent {
  id: number;
  name: string;
  slug: string;
  match: string;
  matching_algorithm: MatchingAlgorithm;
  is_insensitive: boolean;
  document_count: number;
  last_correspondence?: string; // ISO date
}

export interface DocumentType {
  id: number;
  name: string;
  slug: string;
  match: string;
  matching_algorithm: MatchingAlgorithm;
  is_insensitive: boolean;
  document_count: number;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  color: string; // hex e.g. "#ff5733"
  text_color: string; // auto-computed for contrast
  match: string;
  matching_algorithm: MatchingAlgorithm;
  is_insensitive: boolean;
  is_inbox_tag: boolean;
  document_count: number;
}

export interface StoragePath {
  id: number;
  name: string;
  slug: string;
  path: string;
  match: string;
  matching_algorithm: MatchingAlgorithm;
  is_insensitive: boolean;
  document_count: number;
}

export enum MatchingAlgorithm {
  NONE = 0,
  ANY = 1,
  ALL = 2,
  LITERAL = 3,
  REGEX = 4,
  FUZZY = 5,
  AUTO = 6,
}

export const MATCHING_ALGORITHM_LABELS: Record<MatchingAlgorithm, string> = {
  [MatchingAlgorithm.NONE]: "None",
  [MatchingAlgorithm.ANY]: "Any word",
  [MatchingAlgorithm.ALL]: "All words",
  [MatchingAlgorithm.LITERAL]: "Exact match",
  [MatchingAlgorithm.REGEX]: "Regular expression",
  [MatchingAlgorithm.FUZZY]: "Fuzzy match",
  [MatchingAlgorithm.AUTO]: "Auto (learned)",
};

// ============================================================================
// Filter Rule System (47 rule types from Paperless)
// ============================================================================

export enum FilterRuleType {
  // Title / Content
  TITLE_CONTAINS = 0,
  CONTENT_CONTAINS = 1,
  // ASN
  ASN_IS = 2,
  ASN_GREATER_THAN = 3,
  ASN_LESS_THAN = 4,
  ASN_IS_NULL = 5,
  // Correspondent
  CORRESPONDENT_IS = 6,
  HAS_CORRESPONDENT_ANY = 7,
  DOES_NOT_HAVE_CORRESPONDENT = 8,
  // Has any (boolean)
  HAS_ANY_TAG = 9,
  // Tags
  HAS_TAGS_ALL = 10,
  HAS_TAGS_ANY = 11,
  DOES_NOT_HAVE_TAG = 12,
  // Document type
  DOCUMENT_TYPE_IS = 13,
  HAS_DOCUMENT_TYPE_ANY = 14,
  DOES_NOT_HAVE_DOCUMENT_TYPE = 15,
  // Dates
  CREATED_BEFORE = 16,
  CREATED_AFTER = 17,
  CREATED_YEAR_IS = 18,
  CREATED_MONTH_IS = 19,
  CREATED_DAY_IS = 20,
  ADDED_BEFORE = 21,
  ADDED_AFTER = 22,
  // Modified
  MODIFIED_BEFORE = 23,
  MODIFIED_AFTER = 24,
  // Storage path
  STORAGE_PATH_IS = 25,
  HAS_STORAGE_PATH_ANY = 26,
  DOES_NOT_HAVE_STORAGE_PATH = 27,
  // Title / ASN
  TITLE_OR_CONTENT_CONTAINS = 28,
  FULLTEXT_QUERY = 29,
  FULLTEXT_MORELIKE = 30,
  // Owner / permissions
  OWNER_IS = 31,
  OWNER_ANY = 32,
  OWNER_DOES_NOT_INCLUDE = 33,
  OWNER_IS_NULL = 34,
  // Correspondent (additional)
  CORRESPONDENT_IS_NULL = 35,
  // Document type (additional)
  DOCUMENT_TYPE_IS_NULL = 36,
  // Storage path (additional)
  STORAGE_PATH_IS_NULL = 37,
  // Custom fields
  HAS_CUSTOM_FIELDS_ALL = 38,
  HAS_CUSTOM_FIELDS_ANY = 39,
  DOES_NOT_HAVE_CUSTOM_FIELD = 40,
  CUSTOM_FIELD_QUERY = 41,
  // Share
  IS_SHARED_BY_USER = 42,
  // Tags extended
  HAS_TAGS_EXACT = 43,
  // Correspondent query
  CORRESPONDENT_NAME_CONTAINS = 44,
  // Document type query
  DOCUMENT_TYPE_NAME_CONTAINS = 45,
  // Storage path query
  STORAGE_PATH_NAME_CONTAINS = 46,
}

export interface FilterRule {
  rule_type: FilterRuleType;
  value: string | null;
}

/**
 * Map filter rule types to human-readable labels and their value type.
 */
export interface FilterRuleTypeInfo {
  id: FilterRuleType;
  name: string;
  // 'text' | 'number' | 'date' | 'boolean' | 'correspondent' | 'document_type' | 'tag' | 'storage_path' | 'owner'
  datatype: string;
  multi: boolean; // whether rule accepts multiple values (comma-separated IDs)
  nullable: boolean; // whether rule is a "has/has_not" boolean check
}

export const FILTER_RULE_TYPES: FilterRuleTypeInfo[] = [
  { id: FilterRuleType.TITLE_CONTAINS, name: "Title contains", datatype: "text", multi: false, nullable: false },
  { id: FilterRuleType.CONTENT_CONTAINS, name: "Content contains", datatype: "text", multi: false, nullable: false },
  { id: FilterRuleType.CORRESPONDENT_IS, name: "Correspondent is", datatype: "correspondent", multi: false, nullable: false },
  { id: FilterRuleType.HAS_CORRESPONDENT_ANY, name: "Has correspondent", datatype: "boolean", multi: false, nullable: true },
  { id: FilterRuleType.DOES_NOT_HAVE_CORRESPONDENT, name: "No correspondent", datatype: "boolean", multi: false, nullable: true },
  { id: FilterRuleType.DOCUMENT_TYPE_IS, name: "Document type is", datatype: "document_type", multi: false, nullable: false },
  { id: FilterRuleType.HAS_DOCUMENT_TYPE_ANY, name: "Has document type", datatype: "boolean", multi: false, nullable: true },
  { id: FilterRuleType.DOES_NOT_HAVE_DOCUMENT_TYPE, name: "No document type", datatype: "boolean", multi: false, nullable: true },
  { id: FilterRuleType.HAS_TAGS_ALL, name: "Has all tags", datatype: "tag", multi: true, nullable: false },
  { id: FilterRuleType.HAS_TAGS_ANY, name: "Has any tag", datatype: "tag", multi: true, nullable: false },
  { id: FilterRuleType.DOES_NOT_HAVE_TAG, name: "Does not have tag", datatype: "tag", multi: true, nullable: false },
  { id: FilterRuleType.HAS_ANY_TAG, name: "Has any tag assigned", datatype: "boolean", multi: false, nullable: true },
  { id: FilterRuleType.STORAGE_PATH_IS, name: "Storage path is", datatype: "storage_path", multi: false, nullable: false },
  { id: FilterRuleType.CREATED_BEFORE, name: "Created before", datatype: "date", multi: false, nullable: false },
  { id: FilterRuleType.CREATED_AFTER, name: "Created after", datatype: "date", multi: false, nullable: false },
  { id: FilterRuleType.CREATED_YEAR_IS, name: "Year is", datatype: "number", multi: false, nullable: false },
  { id: FilterRuleType.CREATED_MONTH_IS, name: "Month is", datatype: "number", multi: false, nullable: false },
  { id: FilterRuleType.ADDED_BEFORE, name: "Added before", datatype: "date", multi: false, nullable: false },
  { id: FilterRuleType.ADDED_AFTER, name: "Added after", datatype: "date", multi: false, nullable: false },
  { id: FilterRuleType.MODIFIED_BEFORE, name: "Modified before", datatype: "date", multi: false, nullable: false },
  { id: FilterRuleType.MODIFIED_AFTER, name: "Modified after", datatype: "date", multi: false, nullable: false },
  { id: FilterRuleType.ASN_IS, name: "ASN is", datatype: "number", multi: false, nullable: false },
  { id: FilterRuleType.ASN_GREATER_THAN, name: "ASN greater than", datatype: "number", multi: false, nullable: false },
  { id: FilterRuleType.ASN_LESS_THAN, name: "ASN less than", datatype: "number", multi: false, nullable: false },
  { id: FilterRuleType.ASN_IS_NULL, name: "ASN not assigned", datatype: "boolean", multi: false, nullable: true },
  { id: FilterRuleType.TITLE_OR_CONTENT_CONTAINS, name: "Title or content contains", datatype: "text", multi: false, nullable: false },
  { id: FilterRuleType.FULLTEXT_QUERY, name: "Full text search", datatype: "text", multi: false, nullable: false },
  { id: FilterRuleType.OWNER_IS, name: "Owner is", datatype: "owner", multi: false, nullable: false },
  { id: FilterRuleType.OWNER_IS_NULL, name: "No owner", datatype: "boolean", multi: false, nullable: true },
  { id: FilterRuleType.CORRESPONDENT_IS_NULL, name: "No correspondent assigned", datatype: "boolean", multi: false, nullable: true },
  { id: FilterRuleType.DOCUMENT_TYPE_IS_NULL, name: "No document type assigned", datatype: "boolean", multi: false, nullable: true },
  { id: FilterRuleType.STORAGE_PATH_IS_NULL, name: "No storage path assigned", datatype: "boolean", multi: false, nullable: true },
];

// ============================================================================
// Display & View Types
// ============================================================================

export enum DisplayMode {
  TABLE = "table",
  SMALL_CARDS = "smallCards",
  LARGE_CARDS = "largeCards",
}

export enum DisplayField {
  TITLE = "title",
  CREATED = "created",
  ADDED = "added",
  TAGS = "tag",
  CORRESPONDENT = "correspondent",
  DOCUMENT_TYPE = "documenttype",
  STORAGE_PATH = "storagepath",
  CUSTOM_FIELD = "custom_field_",
  NOTES = "note",
  OWNER = "owner",
  SHARED = "shared",
  ASN = "asn",
  PAGE_COUNT = "pagecount",
}

export const DEFAULT_DISPLAY_FIELDS: DisplayField[] = [
  DisplayField.TITLE,
  DisplayField.CREATED,
  DisplayField.TAGS,
  DisplayField.CORRESPONDENT,
];

export const DOCUMENT_SORT_FIELDS = [
  { field: "archive_serial_number", name: "ASN" },
  { field: "correspondent__name", name: "Correspondent" },
  { field: "title", name: "Title" },
  { field: "document_type__name", name: "Document type" },
  { field: "created", name: "Created" },
  { field: "added", name: "Added" },
  { field: "modified", name: "Modified" },
  { field: "num_notes", name: "Notes" },
  { field: "owner", name: "Owner" },
  { field: "page_count", name: "Pages" },
] as const;

// ============================================================================
// Saved View
// ============================================================================

export interface SavedView {
  id: number;
  name: string;
  show_on_dashboard: boolean;
  show_in_sidebar: boolean;
  sort_field: string;
  sort_reverse: boolean;
  filter_rules: FilterRule[];
  page_size: number | null;
  display_mode: DisplayMode | null;
  display_fields: DisplayField[] | null;
  owner: number;
}

// ============================================================================
// List View State (for URL sync)
// ============================================================================

export interface ListViewState {
  title?: string;
  currentPage: number;
  sortField: string;
  sortReverse: boolean;
  filterRules: FilterRule[];
  pageSize?: number;
  displayMode?: DisplayMode;
  displayFields?: DisplayField[];
}

// ============================================================================
// Custom Fields
// ============================================================================

export enum CustomFieldDataType {
  STRING = "string",
  URL = "url",
  DATE = "date",
  BOOLEAN = "boolean",
  INTEGER = "integer",
  FLOAT = "float",
  MONETARY = "monetary",
  DOCUMENT_LINK = "documentlink",
  SELECT = "select",
  LONG_TEXT = "longtext",
}

export interface CustomField {
  id: number;
  data_type: CustomFieldDataType;
  name: string;
  created?: string;
  extra_data?: {
    select_options?: Array<{ label: string; id: string }>;
    default_currency?: string;
  };
  document_count?: number;
}

export interface CustomFieldInstance {
  field: number;
  value: unknown;
  created?: string;
  document?: number;
}

// ============================================================================
// Document Note
// ============================================================================

export interface DocumentNote {
  id: number;
  note: string;
  created: string;
  document: number;
  user: number;
}

// ============================================================================
// Share Link
// ============================================================================

export interface ShareLink {
  id: number;
  slug: string;
  document: number;
  file_version: "archive" | "original";
  expiration: string | null; // ISO date
  created: string;
}

// ============================================================================
// Search Hit (for full-text results)
// ============================================================================

export interface SearchHit {
  score?: number;
  rank?: number;
  highlights?: string;
  note_highlights?: string;
}

// ============================================================================
// Taxonomy CRUD Payloads
// ============================================================================

export interface TaxonomyCreate {
  name: string;
  match?: string;
  matching_algorithm?: MatchingAlgorithm;
  is_insensitive?: boolean;
}

export interface CorrespondentCreate extends TaxonomyCreate {}

export interface DocumentTypeCreate extends TaxonomyCreate {}

export interface TagCreate extends TaxonomyCreate {
  color?: string;
  is_inbox_tag?: boolean;
}

export interface StoragePathCreate extends TaxonomyCreate {
  path: string;
}

export interface SavedViewCreate {
  name: string;
  show_on_dashboard?: boolean;
  show_in_sidebar?: boolean;
  sort_field: string;
  sort_reverse: boolean;
  filter_rules: FilterRule[];
  page_size?: number;
  display_mode?: DisplayMode;
  display_fields?: DisplayField[];
}
