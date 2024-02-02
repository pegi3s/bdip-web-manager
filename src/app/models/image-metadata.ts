export type ImageMetadata = {
  name: string;
  description: string;
  status: string;
  recommended: Recommended[];
  latest: string;
  bug_found: BugFound[];
  not_working: string[];
  recommended_last_tested: string;
  no_longer_tested: string[];
  manual_url: string;
  source_url: string;
  comments: string[];
  gui: boolean;
  gui_command: string | undefined;
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
  auto_tests: AutoTests[];
};

type Recommended = {
  version: string;
  date: string;
}

type BugFound = {
  version: string;
  description: string;
}

type AutoTests = {
  docker_image: string;
  input_files: string[];
  output_dir: string;
  output_file: string;
  add_config: string;
  commands: string;
}
