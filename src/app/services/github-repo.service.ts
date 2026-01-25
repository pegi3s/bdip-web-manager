import { Injectable, signal } from '@angular/core';

type RepoPaths = {
  metadataPath: string;
  oboPath: string;
  diafPath: string;
};

type RepoInfo = {
  owner: string;
  repo: string;
  branch: string;
  paths: RepoPaths;
};

type TreeEntry = {
  path: string;
  type: 'blob' | 'tree';
};

@Injectable({
  providedIn: 'root',
})
export class GithubRepoService {
  private readonly token = signal<string | null>(null);
  private readonly repoInfo = signal<RepoInfo | null>(null);
  private readonly authorName = signal<string>('');
  private readonly authorEmail = signal<string>('');

  readonly isConnected = signal(false);
  readonly statusMessage = signal<string | null>(null);

  setToken(token: string): void {
    this.token.set(token.trim());
  }

  setAuthor(name: string, email: string): void {
    this.authorName.set(name.trim());
    this.authorEmail.set(email.trim());
  }

  clearToken(): void {
    this.token.set(null);
    this.repoInfo.set(null);
    this.isConnected.set(false);
    this.authorName.set('');
    this.authorEmail.set('');
  }

  getRepoInfo(): RepoInfo | null {
    return this.repoInfo();
  }

  async connectAndLoad(
    ownerRepo: string,
    branch: string
  ): Promise<{ metadata: string; obo: string; diaf: string }> {
    const authToken = this.token();
    if (!authToken) {
      throw new Error('GitHub token is required');
    }

    const parsed = this.parseRepo(ownerRepo);
    if (!parsed) {
      throw new Error('Repository must be in the form owner/repo');
    }

    const { owner, repo } = parsed;
    const tree = await this.fetchTree(owner, repo, branch, authToken);
    const paths = this.detectPaths(tree);

    const metadata = await this.readFile(owner, repo, paths.metadataPath, branch, authToken);
    const obo = await this.readFile(owner, repo, paths.oboPath, branch, authToken);
    const diaf = await this.readFile(owner, repo, paths.diafPath, branch, authToken);

    this.repoInfo.set({ owner, repo, branch, paths });
    this.isConnected.set(true);
    this.statusMessage.set(`Loaded ${paths.metadataPath}, ${paths.oboPath}, ${paths.diafPath}`);

    return { metadata, obo, diaf };
  }

  async commitChanges(
    message: string,
    metadataContent: string,
    oboContent: string,
    diafContent: string
  ): Promise<void> {
    const repoInfo = this.repoInfo();
    const authToken = this.token();

    if (!repoInfo || !authToken) {
      throw new Error('GitHub repository is not connected');
    }

    const { owner, repo, branch, paths } = repoInfo;

    const ref = await this.apiGet<{ object: { sha: string } }>(
      `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      authToken
    );

    const baseCommit = await this.apiGet<{ tree: { sha: string } }>(
      `/repos/${owner}/${repo}/git/commits/${ref.object.sha}`,
      authToken
    );

    const metadataBlob = await this.createBlob(owner, repo, metadataContent, authToken);
    const oboBlob = await this.createBlob(owner, repo, oboContent, authToken);
    const diafBlob = await this.createBlob(owner, repo, diafContent, authToken);

    const newTree = await this.apiPost<{ sha: string }>(
      `/repos/${owner}/${repo}/git/trees`,
      {
        base_tree: baseCommit.tree.sha,
        tree: [
          { path: paths.metadataPath, mode: '100644', type: 'blob', sha: metadataBlob.sha },
          { path: paths.oboPath, mode: '100644', type: 'blob', sha: oboBlob.sha },
          { path: paths.diafPath, mode: '100644', type: 'blob', sha: diafBlob.sha },
        ],
      },
      authToken
    );

    const authorName = this.authorName();
    const authorEmail = this.authorEmail();
    const author = authorName && authorEmail
      ? { name: authorName, email: authorEmail }
      : undefined;

    const newCommit = await this.apiPost<{ sha: string }>(
      `/repos/${owner}/${repo}/git/commits`,
      {
        message,
        tree: newTree.sha,
        parents: [ref.object.sha],
        author,
        committer: author,
      },
      authToken
    );

    await this.apiPatch(
      `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      { sha: newCommit.sha, force: false },
      authToken
    );

    this.statusMessage.set(`Committed changes to ${owner}/${repo}@${branch}`);
  }

  private parseRepo(input: string): { owner: string; repo: string } | null {
    const trimmed = input.trim();
    const match = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  }

  private async fetchTree(
    owner: string,
    repo: string,
    branch: string,
    token: string
  ): Promise<TreeEntry[]> {
    const ref = await this.apiGet<{ object: { sha: string } }>(
      `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      token
    );

    const commit = await this.apiGet<{ tree: { sha: string } }>(
      `/repos/${owner}/${repo}/git/commits/${ref.object.sha}`,
      token
    );

    const tree = await this.apiGet<{ tree: TreeEntry[] }>(
      `/repos/${owner}/${repo}/git/trees/${commit.tree.sha}?recursive=1`,
      token
    );

    return tree.tree ?? [];
  }

  private detectPaths(entries: TreeEntry[]): RepoPaths {
    const files = entries.filter((entry) => entry.type === 'blob');
    const metadataFiles = files.filter((f) => f.path.endsWith('metadata.json'));
    const oboFiles = files.filter((f) => f.path.endsWith('.obo'));
    const diafFiles = files.filter((f) => f.path.endsWith('.diaf'));

    if (metadataFiles.length === 0 || oboFiles.length === 0 || diafFiles.length === 0) {
      throw new Error('Repository must contain metadata.json, dio.obo, and dio.diaf');
    }

    const dirCandidates = new Map<string, { score: number }>();
    const normalizeDir = (path: string) =>
      path.split('/').slice(0, -1).join('/');

    const scoreDir = (dir: string): number => {
      const normalized = `/${dir.toLowerCase()}/`;
      return normalized.includes('/metadata/') ? 2 : 0;
    };

    const addDir = (dir: string) => {
      const current = dirCandidates.get(dir) ?? { score: 0 };
      dirCandidates.set(dir, { score: current.score + scoreDir(dir) + 1 });
    };

    for (const file of metadataFiles) addDir(normalizeDir(file.path));
    for (const file of oboFiles) addDir(normalizeDir(file.path));
    for (const file of diafFiles) addDir(normalizeDir(file.path));

    let bestDir: string | null = null;
    let bestScore = -1;

    for (const [dir, meta] of dirCandidates.entries()) {
      const hasMeta = metadataFiles.some((f) => normalizeDir(f.path) === dir);
      const hasObo = oboFiles.some((f) => normalizeDir(f.path) === dir);
      const hasDiaf = diafFiles.some((f) => normalizeDir(f.path) === dir);
      if (!hasMeta || !hasObo || !hasDiaf) continue;
      if (meta.score > bestScore) {
        bestScore = meta.score;
        bestDir = dir;
      }
    }

    const pickBest = (candidates: TreeEntry[]): string => {
      return candidates
        .map((c) => ({ path: c.path, score: scoreDir(normalizeDir(c.path)) }))
        .sort((a, b) => b.score - a.score)[0].path;
    };

    if (!bestDir) {
      return {
        metadataPath: pickBest(metadataFiles),
        oboPath: pickBest(oboFiles),
        diafPath: pickBest(diafFiles),
      };
    }

    const join = (dir: string, filename: string) =>
      dir ? `${dir}/${filename}` : filename;

    return {
      metadataPath: join(bestDir, 'metadata.json'),
      oboPath: join(bestDir, 'dio.obo'),
      diafPath: join(bestDir, 'dio.diaf'),
    };
  }

  private async readFile(
    owner: string,
    repo: string,
    path: string,
    branch: string,
    token: string
  ): Promise<string> {
    const encodedPath = path
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.raw',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to read ${path} from GitHub`);
    }

    return await response.text();
  }

  private async createBlob(
    owner: string,
    repo: string,
    content: string,
    token: string
  ): Promise<{ sha: string }> {
    return await this.apiPost<{ sha: string }>(
      `/repos/${owner}/${repo}/git/blobs`,
      { content, encoding: 'utf-8' },
      token
    );
  }

  private async apiGet<T>(path: string, token: string): Promise<T> {
    const response = await fetch(`https://api.github.com${path}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private async apiPost<T>(path: string, body: unknown, token: string): Promise<T> {
    const response = await fetch(`https://api.github.com${path}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private async apiPatch(path: string, body: unknown, token: string): Promise<void> {
    const response = await fetch(`https://api.github.com${path}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status}`);
    }
  }
}
