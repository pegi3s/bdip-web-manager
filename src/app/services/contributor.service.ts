import { inject, Injectable } from "@angular/core";
import { Contributor } from "../features/landing/models/contributor.model";
import * as Organization from "../models/organization";
import { Observable, ReplaySubject } from "rxjs";
import { catchError, map, tap } from "rxjs/operators";
import { HttpClient } from "@angular/common/http";
import { githubInfo } from "../core/constants/github-info";

@Injectable({
  providedIn: "root"
})
export class ContributorService {
  private readonly baseMetadataURL = `https://raw.githubusercontent.com/${githubInfo.owner}/${githubInfo.repository}/${githubInfo.branch}/metadata/`;
  private readonly urlContributors = `${this.baseMetadataURL}/contributors.json`;

  private http: HttpClient = inject(HttpClient);

  private collaboratorsSubject: ReplaySubject<{ authors: Contributor[], contributors: Contributor[] }> = new ReplaySubject(1);
  private collaborators$: Observable<{ authors: Contributor[], contributors: Contributor[] }> = this.collaboratorsSubject.asObservable();

  private getContributorsJson(): void {
    this.http.get<{ authors: Contributor[], contributors: Contributor[] }>(this.urlContributors).pipe(
      map(data => {
        // Function to map organization acronyms to their corresponding Organization objects
        const mapOrganizations = (person: { organizations: (string | Organization.Organization)[] }) => {
          person.organizations = person.organizations.map(orgAcronym =>
            Organization[orgAcronym as keyof typeof Organization] // Cast the string to the key of Organization
          );
        };

        data.authors.forEach(mapOrganizations);
        data.contributors.forEach(mapOrganizations);

        return data;
      }),
      tap(data => this.collaboratorsSubject.next(data)),
      catchError(error => {
        console.error("Error fetching contributors:", error);
        return [];
      })
    ).subscribe();
  }

  constructor() {
    this.getContributorsJson();
  }

  getAuthors(): Observable<Contributor[]> {
    return this.collaborators$.pipe(
      map(data => data.authors)
    );
  }

  getContributors(): Observable<Contributor[]> {
    return this.collaborators$.pipe(
      map(data => data.contributors)
    );
  }
}
