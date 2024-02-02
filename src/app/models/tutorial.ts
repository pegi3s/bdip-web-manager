export type Tutorial = {
  name: string;
  description?: string;
  image?: string;
  /** The filename of the tutorial markdown file without the `.md` extension */
  filename: string;
  url: string;
};
