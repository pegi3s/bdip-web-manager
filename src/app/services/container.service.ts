import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { concatMap, Observable, of, ReplaySubject } from "rxjs";
import { catchError, map, shareReplay, tap } from 'rxjs/operators';

import { Ontology } from '../obo/Ontology';
import { DockerHubImage } from '../models/docker-hub-image';
import { DockerHubTag } from '../models/docker-hub-tag';
import { githubInfo } from '../core/constants/github-info';
import { ImageMetadata } from '../models/image-metadata';

@Injectable({
  providedIn: 'root',
})
export class ContainerService {
  private readonly baseMetadataURL = `https://raw.githubusercontent.com/${githubInfo.owner}/${githubInfo.repository}/${githubInfo.branch}/metadata/`;
  private readonly urlObo = `${this.baseMetadataURL}/dio.obo`;
  private readonly urlDiaf = `${this.baseMetadataURL}/dio.diaf`;
  private readonly urlJson = `${this.baseMetadataURL}/metadata.json`;
  //private baseURLDockerHub = 'https://hub.docker.com/v2/namespaces/pegi3s/repositories';
  private readonly proxyServerURL = `http://${window.location.hostname}:8080/`;
  private readonly baseDockerHubEndpoint = '/v2/namespaces/pegi3s/repositories';

  private ontologyCache?: Observable<Ontology>;
  private containersCache?: Observable<Map<string, Set<string>>>;
  private containersMetadataSubject: ReplaySubject<Map<string, ImageMetadata>> = new ReplaySubject(1);
  private containersMetadata$: Observable<Map<string, ImageMetadata>> = this.containersMetadataSubject.asObservable();
  private containersInfoSubject: ReplaySubject<Map<string, DockerHubImage>> | null = null;

  constructor(private http: HttpClient) {
    this.getContainersMetadata();
  }

  /**
   * Fetch the OBO file that contains the ontology.
   *
   * @returns {Observable<string>} The raw data from the OBO file.
   */
  private getRawOntology(): Observable<string> {
    return this.http.get(this.urlObo, { responseType: 'text' });
  }

  /**
   * Retrieves the ontology. If the ontology is cached and the `cached` parameter is `true`,
   * it returns the cached version. Otherwise, it fetches the raw ontology, transforms it
   * into an Ontology instance, caches it (if `cached` is `true`), and then returns it.
   *
   * The returned Observable is shared among multiple subscribers to avoid redundant
   * network requests. The last emitted value is replayed to new subscribers.
   *
   * Note: The cached Ontology instance that the subscribers receive always points to the same instance.
   *
   * @param {boolean} cached - If `true`, use the cached ontology if available. If `false`, fetch a new ontology.
   * @returns {Observable<Ontology>} An Observable that emits the ontology.
   */
  getOntology(cached: boolean = true): Observable<Ontology> {
    if (!cached) {
      return this.getRawOntology().pipe(map((data) => new Ontology(data)));
    }

    if (this.ontologyCache) {
      return this.ontologyCache;
    }

    this.ontologyCache = this.getRawOntology().pipe(
      map((data) => new Ontology(data)),
      shareReplay(1),
    );

    return this.ontologyCache;
  }

  /**
   * Fetch the DIAF file that contains the categories and their corresponding containers.
   * The data is expected to be in a text format where each line represents a key-value pair,
   * separated by a tab character.
   *
   * @returns {Observable<string>} The raw data from the DIAF file.
   */
  private getRawContainers(): Observable<string> {
    return this.http.get(this.urlDiaf, { responseType: 'text' });
  }

  /**
   * Parse the raw data from the DIAF file into a Map object where the key is the category
   * and the value is a Set of containers.
   *
   * @param {string} data The raw data from the DIAF file.
   * @returns {Map<string, Set<string>>} A Map object where the key is the category and the value is a Set of containers.
   */
  private parseContainers(data: string): Map<string, Set<string>> {
    const containers = new Map<string, Set<string>>();

    data.split('\n').forEach((element) => {
      if (!element) return;

      const [key, value] = element.split('\t');
      if (!containers.has(key)) {
        containers.set(key, new Set([value]));
      } else {
        containers.get(key)?.add(value);
      }
    });
    return containers;
  }

  /**
   * Retrieve a Map where:
   * - The key is the category of the ontology
   * - The value is a Set of the names of the containers that belong to that category
   *
   * If the request has already been made, the cached version is returned.
   *
   * The returned Observable is shared among multiple subscribers to avoid redundant
   * network requests. The last emitted value is replayed to new subscribers.
   *
   * @returns {Observable<Map<string, Set<string>>>} A Map object where the key is the category and the value is a Set of containers.
   */
  getContainersMap(): Observable<Map<string, Set<string>>> {
    if (this.containersCache) {
      return this.containersCache;
    }

    this.containersCache = this.getRawContainers().pipe(
      map(this.parseContainers),
      shareReplay(1),
    );

    return this.containersCache;
  }

  /**
   * Retrieve an array with the name of all the containers.
   *
   * @returns {Observable<string[]>} An Observable of an array of distinct container names.
   */
  getAllContainers(): Observable<string[]> {
    return this.getContainersMap().pipe(
      map((containers) => {
        let containersDistinct = new Set<string>();
        containers.forEach((value) => {
          value.forEach((container) => {
            containersDistinct.add(container);
          });
        });
        return Array.from(containersDistinct);
      }),
    );
  }

  /**
   * Fetches and processes container metadata from a specified URL.
   *
   * This method retrieves an array of `ImageMetadata` objects from the specified `urlJson`.
   * It then processes this array to create a `Map` where each key is the container's name and the value is its metadata.
   * The resulting `Map` is then emitted through `containersMetadataSubject`.
   * In case of an error during the fetching process, it logs the error and returns an empty array.
   */
  private getContainersMetadata(): void {
    this.http.get<ImageMetadata[]>(this.urlJson).pipe(
      map(data => {
        const map = new Map<string, ImageMetadata>();
        data.forEach((item) => {
          if (map.has(item.name)) {
            console.error(`Duplicate container name found: ${item.name}`);
          } else {
            map.set(item.name, item);
          }
        });
        return map;
      }),
      tap(data => this.containersMetadataSubject.next(data)),
      catchError(error => {
        console.error('Error loading metadata:', error);
        return [];
      })
    ).subscribe();
  }

  /**
   * Retrieves the metadata for all containers.
   *
   * @returns {Observable<Map<string, ImageMetadata>>} An Observable that emits a Map where the key is the container's name and the value is its metadata.
   */
  getAllContainersMetadata(): Observable<Map<string, ImageMetadata>> {
    return this.containersMetadata$;
  }

  /**
   * Retrieves the metadata for the specified container.
   *
   * @param {string} name The name of the container to retrieve metadata for.
   * @returns {Observable<ImageMetadata | undefined>} An Observable that emits the metadata of the specified container if found, otherwise undefined.
   */
  getContainerMetadata(name: string): Observable<ImageMetadata | undefined> {
    return this.containersMetadata$.pipe(
      map(containers => containers.get(name)),
    );
  }

  /**
   * Retrieves the information stored in Docker Hub for all containers.
   *
   * @returns {Observable<Map<string, DockerHubImage>>} An Observable that emits a Map where the key is the container's name and the value is its Docker Hub information.
   */
  getAllContainersInfo(): Observable<Map<string, DockerHubImage>> {
    // If cached data exists, return it as an observable (replay last cached value)
    if (this.containersInfoSubject) {
      return this.containersInfoSubject.asObservable();
    }

    const url = new URL(`${this.baseDockerHubEndpoint}?page=1&page_size=100`, this.proxyServerURL).toString();

    // Create a new ReplaySubject for caching
    this.containersInfoSubject = new ReplaySubject<Map<string, DockerHubImage>>(1);

    // Fetch and cache the data
    this.fetchAllPagesContainersInfo(url, []).subscribe({
      next: (allResults) => {
        // Convert the array of DockerHubImage[] into a Map<string, DockerHubImage>
        const imageMap = new Map<string, DockerHubImage>();
        allResults.forEach(image => {
          if (image.name) {
            imageMap.set(image.name, image);
          }
        });

        // Emit the map to the ReplaySubject
        this.containersInfoSubject?.next(imageMap);
      },
      error: (err) => {
        console.error('Error fetching DockerHub images:', err);
        // Reset the cache (so it can be retried) and emit an empty array
        this.containersInfoSubject = null;  // Reset cache to trigger retry on next call
      }
    });

    // Return the ReplaySubject as observable for subscribers
    return this.containersInfoSubject.asObservable();
  }

  /**
   * Recursively fetches all pages of containers from Docker Hub.
   *
   * @param url The URL of the current page to fetch.
   * @param allResults The array to store all the results from all pages.
   */
  private fetchAllPagesContainersInfo(url: string, allResults: DockerHubImage[]): Observable<DockerHubImage[]> {
    return this.http.get<{ next: string, results: DockerHubImage[] }>(url).pipe(
      catchError(err => {
        console.error('Error fetching DockerHub images:', err);
        return of({ next: null, results: [] }); // Return an empty page if error
      }),
      map(response => {
        // Push the current page's results to the allResults array
        allResults.push(...response.results);

        // If there is a next page, continue to fetch the next page
        if (response.next) {
          const indexEndpoint = response.next.indexOf('/v2');
          const nextURL = new URL(response.next.substring(indexEndpoint), this.proxyServerURL).toString();
          return this.fetchAllPagesContainersInfo(nextURL, allResults);
        } else {
          // Return the final results once all pages have been fetched
          return of(allResults);
        }
      }),
      concatMap((finalResults) => finalResults),
    );
  }

  /**
   * Fetches information about a specific container from Docker Hub.
   *
   * @param {string} name - The name of the Docker container.
   * @returns {Observable<DockerHubImage>} An Observable that will emit the Docker container information.
   */
  getContainerInfo(name: string): Observable<DockerHubImage> {
    return this.http.get<DockerHubImage>(
      new URL(`${this.baseDockerHubEndpoint}/${name}`, this.proxyServerURL).toString(),
    );
  }

  /**
   * Fetches information about the tags of a specific container from Docker Hub.
   *
   * @param {string} name - The name of the Docker container.
   * @returns {Observable<DockerHubImage>} An Observable that will emit the information about the tags of the Docker container.
   */
  getContainerTags(name: string, page: number = 1): Observable<DockerHubTag[]> {
    return this.http.get<{ results: DockerHubTag[]; }>(
      new URL(`${this.baseDockerHubEndpoint}/${name}/tags?page=${page}`, this.proxyServerURL).toString(),
    )
    .pipe(map((response) => response.results));
  }
}
