export type DockerHubImage = {
  user: string;
  name: string;
  namespace: string;
  repository_type: string;
  status: number;
  status_description: string;
  description: string;
  is_private: boolean;
  is_automated: boolean;
  star_count: number;
  pull_count: number;
  last_updated: string;
  date_registered: string;
  collaborator_count: number;
  affiliation: null | string;
  hub_user: string;
  has_starred: boolean;
  full_description: string;
  permissions: {
    read: boolean;
    write: boolean;
    admin: boolean;
  };
  media_types: string[];
  content_types: string[];
  categories: {
    name: string;
    slug: string;
  }[];
};
