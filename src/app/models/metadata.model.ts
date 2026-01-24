/**
 * Metadata model interfaces for Docker image metadata.
 * These interfaces represent the structure of metadata.json
 */

export type MetadataStatus = 'Usable' | 'Unusable' | 'Not_recommended';

export interface RecommendedVersion {
  version: string;
  date: string;
}

export interface BugFoundItem {
  version: string;
  description: string;
}

export interface AutoTest {
  docker_image: string;
  input_files: string[];
  output_dir: string;
  output_file: string;
  add_config: string;
  commands: string;
}

export interface CustomSearches {
  pubmed: string;
  scholar: string;
  bioprotocol: string;
  bioprotocol_exchange: string;
}

export interface Alternatives {
  dockerfiles?: Record<string, string>;
}

export interface MetadataItem {
  name: string;
  description: string;
  status: MetadataStatus;
  recommended: RecommendedVersion[];
  latest: string;
  bug_found: BugFoundItem[];
  not_working: string[];
  no_longer_tested: string[];
  manual_url: string;
  source_url: string;
  comments: string[];
  gui: boolean;
  gui_command: string;
  podman: string;
  singularity: string;
  invocation_general: string;
  usual_invocation_specific: string;
  usual_invocation_specific_comments: string[];
  test_invocation_specific: string;
  test_data_url: string;
  test_results_url: string;
  icon: string;
  input_data_type: string[];
  auto_tests: AutoTest[];
  custom_searches: CustomSearches;
  alternatives?: Alternatives;
}

/**
 * Creates a new empty metadata item with default values
 */
export function createEmptyMetadataItem(): MetadataItem {
  return {
    name: '',
    description: '',
    status: 'Usable',
    recommended: [],
    latest: '',
    bug_found: [],
    not_working: [],
    no_longer_tested: [],
    manual_url: '',
    source_url: '',
    comments: [],
    gui: false,
    gui_command: '',
    podman: 'untested',
    singularity: 'untested',
    invocation_general: '',
    usual_invocation_specific: '',
    usual_invocation_specific_comments: [],
    test_invocation_specific: '',
    test_data_url: '',
    test_results_url: '',
    icon: '',
    input_data_type: [],
    auto_tests: [],
    custom_searches: {
      pubmed: '',
      scholar: '',
      bioprotocol: '',
      bioprotocol_exchange: '',
    },
    alternatives: undefined,
  };
}

/**
 * Creates an empty AutoTest with default values
 */
export function createEmptyAutoTest(): AutoTest {
  return {
    docker_image: '',
    input_files: [],
    output_dir: '',
    output_file: '',
    add_config: '',
    commands: '',
  };
}

/**
 * Creates an empty RecommendedVersion
 */
export function createEmptyRecommendedVersion(): RecommendedVersion {
  return {
    version: '',
    date: '',
  };
}

/**
 * Creates an empty BugFoundItem
 */
export function createEmptyBugFoundItem(): BugFoundItem {
  return {
    version: '',
    description: '',
  };
}
