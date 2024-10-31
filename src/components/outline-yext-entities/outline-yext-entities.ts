import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AdoptedStyleSheets } from '../../controllers/adopted-stylesheets.ts';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

// import { repeat } from 'lit/directives/repeat.js';

// import { classMap } from 'lit/directives/class-map.js';
import componentStyles from './outline-yext-entities.css?inline';
import { Task } from '@lit/task';

interface YextEntity {
  name: string;
  c_url?: string;
  [key: string]: string | number | boolean | object | undefined;
}

interface YextResponse {
  response: {
    entities: YextEntity[];
    count: number;
  };
}

interface Hours {
  [day: string]: {
    isClosed: boolean;
    openIntervals?: Array<{ start: string; end: string }>;
  };
}

/**
 * The Yext Entities component.
 * @element outline-yext-entities
 */

@customElement('outline-yext-entities')
export class OutlineYextEntities extends LitElement {
  adoptedStyleSheets = new AdoptedStyleSheets(this, {
    // globalCSS: globalStyles,
    encapsulatedCSS: componentStyles,
  });

  // Define a property to hold the fetched data
  @property({ type: Object })
  yextEntityData?: YextResponse;

  @property({ type: Boolean })
  debug = false;

  @property({ type: Array })
  displayFields: string[] = [];

  entityTypes = [
    {
      id: 'healthcareProfessional',
      name: 'Healthcare Professional',
      fields: [
        'name',
        'mainPhone',
        'address',
        'c_specialties',
        'headshot',
        'hours',
        'googleAttributes',
      ],
    },
    {
      id: 'location',
      name: 'Location',
      fields: ['name', 'address', 'mainPhone', 'hours', 'photoGallery'],
    },
    {
      id: 'healthcareFacility',
      name: 'Healthcare Facility',
      fields: ['name', 'address', 'mainPhone', 'hours'],
    },
  ];

  @property({ type: Number })
  currentPage = 1;

  currentEntityType = 0;

  offset = 0;
  entitiesPerPage = 10;
  totalCount = 0;

  private static readonly API_KEY = 'fdd0e55c14479c68b74c132b9bcb9899';
  private static readonly API_VERSION = '20230406';

  mainWebsiteUrl = 'https://www.ecommunity.com';
  // Create a Task instance to manage the async fetch operation
  private _fetchYextEntitiesTask = new Task(
    this,
    async (
      [entityType, limit, offset]: [string, number, number],
      { signal }
    ) => {
      const savedFilterIds = 1396051824; // This is a saved filter "Not Closed + No DNM label" (ID: 1396051824) that was created in Yext UI.
      const sortBy = [{ name: 'ASCENDING' }];
      const encodedSortBy = encodeURIComponent(JSON.stringify(sortBy));
      const response = await fetch(
        `https://cdn.yextapis.com/v2/accounts/me/entities?v=${OutlineYextEntities.API_VERSION}&api_key=${OutlineYextEntities.API_KEY}&entityTypes=${entityType}&limit=${limit}&offset=${offset}&savedFilterIds=${savedFilterIds}&sortBy=${encodedSortBy}`,
        { signal }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    () =>
      [
        this.entityTypes[this.currentEntityType].id,
        this.entitiesPerPage,
        this.offset,
      ] as [string, number, number]
  );

  // Update constructor to read URL params
  constructor() {
    super();
    this.readUrlParams();
    // Set initial displayFields based on the default entity type
    this.displayFields = this.entityTypes[this.currentEntityType].fields;
    this._fetchYextEntitiesTask.run();
  }

  public setDisplayFields(fields: string[]) {
    this.displayFields = fields;
    this._fetchYextEntitiesTask.run();
  }

  private readUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    const entityType = urlParams.get('entityType');

    if (page) {
      const parsedPage = parseInt(page, 10);
      if (!Number.isNaN(parsedPage) && parsedPage > 0) {
        this.currentPage = parsedPage;
        this.offset = (this.currentPage - 1) * this.entitiesPerPage;
      } else {
        console.warn('Invalid page parameter');
      }
    }

    if (entityType) {
      const index = this.entityTypes.findIndex(type => type.id === entityType);
      if (index !== -1) {
        this.currentEntityType = index;
      } else {
        console.warn('Invalid entityType parameter');
      }
    }
    this.displayFields = this.entityTypes[this.currentEntityType].fields;
  }

  private generateUrl(page: number, entityTypeIndex: number): string {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('entityType', this.entityTypes[entityTypeIndex].id);
    return `${window.location.pathname}?${params.toString()}`;
  }

  private renderEntityRecursively(
    entity: YextEntity,
    depth: number = 0
  ): TemplateResult {
    return html`
      <ul style="margin-left: ${depth * 20}px;">
        ${Object.entries(entity).map(([key, value]) => {
          // Skip rendering the "meta" field
          if (key === 'meta' || key === 'c_url') return '';
          return html`
            <li>
              <strong>${key}:</strong>
              ${this.renderValue(value, depth)}
            </li>
          `;
        })}
      </ul>
    `;
  }

  private renderValue(value: unknown, depth: number): TemplateResult | string {
    if (value === null || value === undefined) {
      return '';
    }
    if (Array.isArray(value)) {
      return html`
        <ul>
          ${value.map(
            item => html`<li>${this.renderValue(item, depth + 1)}</li>`
          )}
        </ul>
      `;
    }

    if (typeof value === 'object' && value !== null) {
      return this.renderEntityRecursively(value as YextEntity, depth + 1);
    }

    const stringValue = String(value);
    // Check if the value is a URL or a relative link
    if (
      stringValue.startsWith('http://') ||
      stringValue.startsWith('https://')
    ) {
      if (this.isImageUrl(stringValue)) {
        return html`<img src="${stringValue}" alt="Entity image" />`;
      }
      return html`<a
        href="${stringValue}"
        target="_blank"
        rel="noopener noreferrer"
        >${stringValue}</a
      >`;
    } else if (stringValue.startsWith('/')) {
      const absoluteUrl = `${this.mainWebsiteUrl}${stringValue}`;
      if (this.isImageUrl(absoluteUrl)) {
        return html`<img src="${absoluteUrl}" alt="Entity image" />`;
      }
      return html`<a
        href="${absoluteUrl}"
        target="_blank"
        rel="noopener noreferrer"
        >${absoluteUrl}</a
      >`;
    }

    // Check if the value contains HTML tags
    if (/<[a-z][\s\S]*>/i.test(stringValue)) {
      return html`${unsafeHTML(stringValue)}`;
    }

    return stringValue;
  }

  // Helper function to check if a URL is an image
  private isImageUrl(url: string): boolean {
    const imageExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.bmp',
      '.webp',
      '.svg',
    ];
    return imageExtensions.some(ext => url.toLowerCase().endsWith(ext));
  }

  private handleEntityTypeClick(e: Event, index: number) {
    e.preventDefault();
    this.currentEntityType = index;
    this.currentPage = 1;
    this.offset = 0;
    this.displayFields = this.entityTypes[index].fields;
    this.updateUrl();
    this._fetchYextEntitiesTask.run();
  }

  private updateUrl() {
    const url = this.generateUrl(this.currentPage, this.currentEntityType);
    window.history.pushState({}, '', url);
  }

  render(): TemplateResult {
    return html`
      <div class="entity-type-selector">
        ${this.entityTypes.map(
          (type, index) => html`
            <a
              href="${this.generateUrl(1, index)}"
              class=${this.currentEntityType === index ? 'active' : ''}
              @click=${(e: Event) => this.handleEntityTypeClick(e, index)}
            >
              ${type.name}
            </a>
          `
        )}
      </div>
      ${this.displayEntities()}
    `;
  }

  displayEntities() {
    return this._fetchYextEntitiesTask.render({
      initial: () => html`<p>Initializing...</p>`,
      pending: () => html`<p>Loading Yext entities...</p>`,
      complete: data => {
        this.yextEntityData = data;
        this.totalCount = data.response.count;
        const start = this.offset + 1;
        const end = Math.min(
          this.offset + this.entitiesPerPage,
          this.totalCount
        );

        return html`
          <p>Displaying ${start}-${end} out of ${this.totalCount} results</p>
          ${this.debug
            ? this.renderDebugView(data)
            : this.renderNormalView(data)}
          ${this.renderPager()}
        `;
      },
      error: (error: unknown) =>
        html`<p>
          Error loading Yext entities:
          ${error instanceof Error ? error.message : String(error)}
        </p>`,
    });
  }

  renderDebugView(data: YextResponse) {
    return html`
      ${data.response.entities.map(
        (entity: YextEntity, index: number) => html`
          <details>
            <summary>
              Entity ${index + 1}: ${entity.name || 'Unnamed Entity'}
            </summary>
            ${this.renderEntityRecursively(entity)}
          </details>
        `
      )}
    `;
  }

  renderNormalView(data: YextResponse) {
    return html`
      ${data.response.entities.map(
        (entity: YextEntity) => html`
          <outline-teaser
            image="${this.getEntityImage(entity)}"
            title="${entity.name ?? 'Unnamed Entity'}"
            subtitle="${this.getSubtitle(entity)}"
            url="${this.getEntityUrl(entity)}"
            phone="${entity.mainPhone || ''}"
            fax="${entity.fax || ''}"
            directions-url="${entity.googleMapUrl || ''}"
            hours="${this.formatHours(entity.hours as Hours)}"
            .noImageFallback=${true}
          >
            <div slot="address">
              ${entity.address?.line1 || ''}<br />
              ${entity.address?.city || ''}, ${entity.address?.region || ''}
              ${entity.address?.postalCode || ''}
            </div>
          </outline-teaser>
        `
      )}
    `;
  }
  private getSubtitle(entity: YextEntity): string {
    const entityType = this.entityTypes[this.currentEntityType].id;
    if (entityType === 'healthcareProfessional') {
      return (Array.isArray(entity.c_specialties)
        ? entity.c_specialties.join(', ')
        : entity.c_specialties || '').toString();
    }
    return '';
  }

  private getEntityImage(entity: YextEntity): string {
    const entityType = this.entityTypes[this.currentEntityType].id;
    switch (entityType) {
      case 'healthcareProfessional':
        return entity.headshot?.url || '';
      case 'healthcareFacility':
      case 'location':
        return entity.photoGallery?.[0]?.image?.url || '';
      case 'ce_person':
        return entity.c_person_Photos || '';
      default:
        return '';
    }
  }

  private formatHours(hours: Hours | null | undefined): string {
    if (!hours) return ``;
    const daysOfWeek = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];
    const formattedHours = daysOfWeek
      .map(day => {
        if (
          hours[day] &&
          !hours[day].isClosed &&
          hours[day].openIntervals &&
          hours[day].openIntervals.length > 0
        ) {
          const { start, end } = hours[day].openIntervals[0];
          return `<li>${day.charAt(0).toUpperCase() + day.slice(1)}: ${start} to ${end}</li>`;
        }
        return `<li>${day.charAt(0).toUpperCase() + day.slice(1)}: Closed</li>`;
      })
      .join('');

    const htmlString = `<ul>${formattedHours}</ul>`;

    return htmlString;
  }

  private getEntityUrl(entity: YextEntity): string {
    const entityType = this.entityTypes[this.currentEntityType].id;
    let url: string | undefined;
    switch (entityType) {
      case 'healthcareFacility':
      case 'healthcareProfessional':
      case 'location':
        if (typeof entity.websiteUrl === 'string') {
          url = entity.websiteUrl;
        } else if (
          typeof entity.websiteUrl === 'object' &&
          entity.websiteUrl !== null &&
          'url' in entity.websiteUrl
        ) {
          url = (entity.websiteUrl as { url: string }).url;
        }
        break;
      default:
        url = entity.c_url as string | undefined;
    }
    return url || this.mainWebsiteUrl;
  }

  private handlePageChange(newPage: number) {
    const totalPages = Math.ceil(this.totalCount / this.entitiesPerPage);

    // Ensure the new page is within valid range
    newPage = Math.max(1, Math.min(newPage, totalPages));

    // Calculate the new offset
    this.offset = (newPage - 1) * this.entitiesPerPage;

    this.currentPage = newPage;
    this.updateUrl();
    this._fetchYextEntitiesTask.run();
  }

  renderPagerLink(pageNum: number, text: string, isActive: boolean) {
    const url = this.generateUrl(pageNum, this.currentEntityType);
    return html`
      <a
        href="${url}"
        class="pager-link ${isActive ? 'active' : ''}"
        @click=${(e: Event) => {
          e.preventDefault();
          this.handlePageChange(pageNum);
        }}
        >${text}</a
      >
    `;
  }

  renderPager() {
    if (this.totalCount === 0) return html``;

    const totalPages = Math.ceil(this.totalCount / this.entitiesPerPage);
    const currentPage = this.currentPage;

    let startPage = Math.max(1, currentPage - 4);
    const endPage = Math.min(totalPages, startPage + 9);
    startPage = Math.max(1, endPage - 9);

    const pageNumbers = Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );

    return html`
      <div class="pager">
        ${startPage > 1
          ? html`
              ${this.renderPagerLink(1, 'First', false)}
              ${this.renderPagerLink(currentPage - 1, 'Previous', false)}
            `
          : ''}
        ${pageNumbers.map(pageNum =>
          this.renderPagerLink(
            pageNum,
            pageNum.toString(),
            pageNum === currentPage
          )
        )}
        ${endPage < totalPages
          ? html`
              ${this.renderPagerLink(currentPage + 1, 'Next', false)}
              ${this.renderPagerLink(totalPages, 'Last', false)}
            `
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'outline-yext-entities': OutlineYextEntities;
  }
}
