export class TermStanza {
  // Required tags
  id!: string;
  // Optional tags
  name?: string; // Required in 1.2 ; Optional in 1.4
  definition?: string;
  private parents: Set<TermStanza> = new Set(); // is_a
  private children: Set<TermStanza> = new Set(); // Not present in the spec. Added for traversal purposes

  constructor() {}

  public addParent(parent: TermStanza): void {
    this.parents.add(parent);
  }

  public addChild(child: TermStanza): void {
    this.children.add(child);
  }

  public removeParent(parent: TermStanza): boolean {
    return this.parents.delete(parent);
  }

  public removeChild(child: TermStanza): boolean {
    return this.children.delete(child);
  }

  // Return an array instead of a set for inmutability
  public getParents(): TermStanza[] {
    return Array.from(this.parents);
  }

  public getChildren(): TermStanza[] {
    return Array.from(this.children);
  }

  public hasParents(): boolean {
    return this.parents.size > 0;
  }

  public hasChildren(): boolean {
    return this.children.size > 0;
  }

  public isValid(): boolean {
    return this.id !== undefined;
  }
}
