import { LitElement, html, noChange, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { classMap } from 'lit/directives/class-map.js';
import componentStyles from './outline-yext-universal.css?inline';
import { Task } from '@lit/task';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { ResizeController } from '../../controllers/resize-controller';
import { AdoptedStyleSheets } from '../../controllers/adopted-stylesheets.ts';
import { displayTeaser } from '../outline-yext-vertical/teaser';

import type {
  SearchSettings,
  Result,
  UniversalSearchResponse,
  Module,
} from '../../libraries/data-access-yext/yext-types';

import '../outline-yext-vertical/outline-yext-vertical';
import {
  defaultSearchSettings,
  getStoredSearchSettings,
  setStoredSearchSettings,
  syncSearchSettingsInStore,
} from '../../libraries/data-access-yext/yext-store';
import {
  getYextSearchData,
  isVerticalSearchResponse,
  getYextSuggestions,
} from '../../libraries/data-access-yext/yext-api';
import Pending from '../../libraries/ui-yext/pending';
import { debounce } from '../../utilities/debounce';

@customElement('outline-yext-universal')
export class OutlineYextUniversal extends LitElement {
  adoptedStyleSheets = new AdoptedStyleSheets(this, {
    encapsulatedCSS: componentStyles,
  });

  @property({ type: Boolean, reflect: true, attribute: 'debug' })
  debug: boolean | undefined;

  @state()
  private searchSettings: SearchSettings | undefined;

  @state()
  private totalCount: number | null = null;

  @state()
  private activeVertical: string = 'all';

  @state()
  private suggestionsIsOpen = false;

  @state()
  private isUserTyping = false;

  @state()
  private isSearching = false;

  @state()
  private hasSearched = false;

  @state()
  private searchSuggestions: Result[] = [];

  @state()
  private displayResults = false;

  private modalFiltersOpenClose = false;
  private dropdownVerticalsOpen = false;

  private taskValue: unknown;

  private resizeController = new ResizeController(this, {});

  private fetchEndpoint = new Task(
    this,
    async () => {
      if(!this.searchSettings?.input){
        return undefined
      }
      return getYextSearchData()
    },
    () => []
  );

  // Add default sortBys
  private defaultSortBys = [{type: 'RELEVANCE'}];

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('popstate', this.handlePopState);
    // This overrides replace state and is necessary for back button browser navigation
    window.history.replaceState = function (...args: any[]) {
    };
    this.initializeFromUrl();
    this.initializeSearchSettings();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this.handlePopState);
  }

  private initializeFromUrl() {
    const params = new URLSearchParams(window.location.search);

    // Parse and set active vertical
    const activeVertical = params.get('yext_activeVertical');
    if (activeVertical) {
      this.activeVertical = activeVertical;
    }
    else{
      this.activeVertical = 'all'
    }

    // Initialize searchSettings with defaults first
    this.searchSettings = {
      ...defaultSearchSettings,
      sortBys: this.defaultSortBys,
      activeVertical: this.activeVertical
    };

    // Parse other URL parameters
    const input = params.get('yext_input');
    if (input && this.searchSettings) {
      this.searchSettings.input = input;
    }
    // Since we are not running a search we need to cause a re render
    else{
      this.searchSettings.input = ''    
      this.requestUpdate()
    }

    const retrieveFacets = params.get('yext_retrieveFacets');
    if (retrieveFacets && this.searchSettings) {
      this.searchSettings.retrieveFacets = retrieveFacets === 'true';
    }

    const sortBys = params.get('yext_sortBys');
    if (sortBys && this.searchSettings) {
      try {
        // Parse the sortBys parameter directly without decoding
        this.searchSettings.sortBys = JSON.parse(sortBys);
      } catch (e) {
        console.warn('Failed to parse sortBys from URL, using defaults:', e);
        this.searchSettings.sortBys = this.defaultSortBys;
      }
    }

  }

  private initializeSearchSettings() {
    syncSearchSettingsInStore();
    this.searchSettings = {
      ...getStoredSearchSettings(),
    };
    setStoredSearchSettings(this.searchSettings);
    this.displayResults = this.searchSettings.input !== '';
    this.debouncedFetchSuggestion();
  }

  private debouncedFetchSuggestion = debounce(
    this.fetchSuggestion.bind(this),
    150
  );

  private async fetchSuggestion() {
    if (this.hasSearched || !this.isUserTyping || !this.searchSettings?.input) {
      return;
    }

    try {
      const suggestions = await getYextSuggestions(this.searchSettings.input);
      this.searchSuggestions = suggestions.response.results.slice(0, 10);
      this.suggestionsIsOpen =
        this.searchSuggestions.length > 0 && this.isUserTyping;
      this.requestUpdate();
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  }

  private handleInput(e: InputEvent) {
    if (!this.searchSettings) return;

    const input = (e.target as HTMLInputElement).value;
    this.searchSettings = { ...this.searchSettings, input };
    this.hasSearched = false;
    this.isUserTyping = true;

    if (input.length > 0 && !this.isSearching) {
      this.debouncedFetchSuggestion();
    } else {
      this.cleanSearchSuggestions();
    }
  }

  private cleanSearchSuggestions() {
    this.searchSuggestions = [];
    this.suggestionsIsOpen = false;
    this.requestUpdate();
  }

    private updateUrlWithSearchParams() {
    const params = new URLSearchParams();

    if (this.searchSettings?.input) {
      params.set('yext_input', this.searchSettings.input);
    }

    if (this.activeVertical !== 'all') {
      params.set('yext_activeVertical', this.activeVertical);
    }

    if (this.searchSettings?.retrieveFacets) {
      params.set('yext_retrieveFacets', String(this.searchSettings.retrieveFacets));
    }

    if (this.searchSettings?.sortBys) {
      // Store sortBys as a plain JSON string without additional encoding
      const sortBysString = JSON.stringify(this.searchSettings.sortBys);
      params.set('yext_sortBys', sortBysString);
    }

    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  }

  private search(e: Event) {
    e.preventDefault();
    this.suggestionsIsOpen = false;
    this.isSearching = true;
    this.hasSearched = true;
    this.isUserTyping = false;

    if (!this.searchSettings) return;

    const inputSearch = this.searchSettings.input;
    this.searchSettings = {
      ...defaultSearchSettings,
      input: inputSearch,
      activeVertical: 'all',
    };
    setStoredSearchSettings(this.searchSettings);

    this.activeVertical = 'all';
    this.displayResults = this.searchSettings.input !== '';
    
    // Update URL before fetching results
    this.updateUrlWithSearchParams();

    this.fetchEndpoint.run().then(() => {
      this.isSearching = false;
    });
  }

  private handleSuggestion(suggestion: Result) {
    if (!this.searchSettings) return;
    
    this.activeVertical = 'all'
    this.searchSettings = {
      ...this.searchSettings,
      input: suggestion.value,
    };
    setStoredSearchSettings(this.searchSettings);

    this.displayResults = true;

    // Update URL before fetching results
    this.updateUrlWithSearchParams();

    this.fetchEndpoint.run();
    this.suggestionsIsOpen = false;
  }

  private _focusIn() {
    this.suggestionsIsOpen = this.searchSuggestions.length > 0;
  }

  private _focusOut(e: FocusEvent) {
    const currentTarget = e.currentTarget as Node;
    const relatedTarget = e.relatedTarget as Node;

    setTimeout(() => {
      if (!currentTarget.contains(relatedTarget)) {
        this.cleanSearchSuggestions();
      }
    }, 0);
  }

  private setActiveVertical(vertical: string) {
    if (!this.searchSettings) return;

    this.activeVertical = vertical;
    this.searchSettings = {
      ...this.searchSettings,
      offset: 0,
      activeVertical: vertical,
      sortBys: this.defaultSortBys
    };
    setStoredSearchSettings(this.searchSettings);

    this.dropdownVerticalsOpen = false;

    // Update URL before fetching results
    this.updateUrlWithSearchParams();

    if (vertical !== 'all') {
      this.shadowRoot
        ?.querySelector('outline-yext-vertical')
        ?.setAttribute('vertical-key', this.activeVertical);
      this.shadowRoot
        ?.querySelector('outline-yext-vertical')
        ?.fetchEndpoint.run();
    } else {
      this.fetchEndpoint.run();
    }
  }

  private setVerticalTitle(title: string): string {
    const titleMap: { [key: string]: string } = {
      'blog': 'Blog',
      'careers_area': 'Career Area',
      'classes-and-events': 'Classes and Events',
      'education_research': 'Education and Research',
      'healthcare_professionals': 'Healthcare Professional',
      'locationsearch': 'Location',
      'news': 'News',
      'page': 'Other',
      'person': 'Person',
      'procedure': 'Procedure',
      'service': 'Health Service',
      'testimonial': 'Testimonial',
    };

    return (
      titleMap[title] ||
      title.replace(/_/g, ' ').replace(/\b\w/g, match => match.toUpperCase())
    );
  }

  private highlightWord(string: string, words: string): string {
    const regex = new RegExp(words, 'gi');
    return string.replace(
      regex,
      str => `<span class="suggestion-highlight">${str}</span>`
    );
  }

  private searchFormTemplate(): TemplateResult {
    if (!this.searchSettings) return html``;

    const breakpointClass =
      this.resizeController.currentBreakpointRange === 0
        ? 'is-mobile'
        : 'is-desktop';

    return html`
      <div class="search-form ${breakpointClass}">
        <div
          class="search-form__inner"
          @focusout="${(e: FocusEvent) => this._focusOut(e)}"
        >
          <form
            action="/search"
            method="get"
            id="views-exposed-form-search-search-page"
            accept-charset="UTF-8"
            class="${breakpointClass}"
            @submit="${(e: Event) => this.search(e)}"
          >
            <div
              class="js-form-item form-item js-form-type-textfield form-item-text js-form-item-text"
            >
              <label
                for="edit-search-api-fulltext"
                class="sr-only form-item__label"
                >Keyword</label
              >
              <input
                placeholder=""
                type="text"
                id="edit-search-api-fulltext"
                name="field_keyword"
                .value=${this.searchSettings.input}
                @input=${this.handleInput}
                @focus="${this._focusIn}"
                maxlength="128"
                class="form-text form-element form-element--type-text form-element--api-textfield"
              />
            </div>
            <div
              data-drupal-selector="edit-actions"
              class="form-actions js-form-wrapper form-wrapper"
            >
              <button
                class="btn btn--search form-submit"
                data-drupal-selector="edit-submit"
                type="submit"
                id="edit-submit"
                value="Search"
              >
                <span>Search</span>
              </button>
            </div>
          </form>
          ${this.renderSuggestions()}
        </div>
      </div>
    `;
  }

  private renderSuggestions(): TemplateResult {
    if (!this.suggestionsIsOpen || this.isSearching || this.hasSearched) {
      return html``;
    }

    return html`
      <ul aria-live="polite" class="suggested-list">
        ${this.searchSuggestions.map(
          suggestion => html`
            <li>
              <button
                type="button"
                @click="${() => this.handleSuggestion(suggestion)}"
              >
                ${unsafeHTML(
                  this.highlightWord(
                    suggestion.value,
                    this.searchSettings?.input ?? ''
                  )
                )}
              </button>
            </li>
          `
        )}
      </ul>
    `;
  }

  private displayAll(response: UniversalSearchResponse): TemplateResult {
    if (response.modules?.length === 0) {
      return this.renderNoResultsFound();
    }

    return html`
      <div class="results-list">
        ${repeat(
          response.modules,
          (module: Module) => module,
          module => this.renderResultsSection(module)
        )}
      </div>
    `;
  }

  private renderNoResultsFound(): TemplateResult {
    return html`
      <div class="no-results-message">
        <h2 class="no-results-heading">Sorry, we couldn't find anything</h2>
        <div class="no-results-copy">
          <p>
            We couldn't find any matches for your search. Try checking your
            spelling, refining your search terms, using synonyms, or expanding
            your search criteria.
          </p>
          <p>If you need assistance, please call 800-777-7775.</p>
        </div>
      </div>
    `;
  }

  private renderResultsSection(module: Module): TemplateResult {
    return html`
      <div class="results-section">
        <div class="results-section-heading">
          <h2 class="results-section-type">
            ${this.setVerticalTitle(module.verticalConfigId)}
          </h2>
          <button
            class=""
            @click="${() => this.setActiveVertical(module.verticalConfigId)}"
          >
            View All
          </button>
        </div>
        <ul class="results">
          ${repeat(
            module.results.slice(0, 3),
            result => result,
            (result, _index) => html`
              <li class="result">
                ${displayTeaser(module.verticalConfigId, result)}
              </li>
            `
          )}
        </ul>
      </div>
    `;
  }

  private mobileVerticalNavTemplate(
    response: UniversalSearchResponse
  ): TemplateResult {
    return html`
      ${response.modules.length !== 0
        ? html`
            <div class="vertical-nav is-mobile">
              <h2 class="vertical-nav__heading is-mobile">
                Refine Your Search
              </h2>
              <div class="vertical-nav__dropdown">
                <button
                  class="vertical-nav__dropdown-button ${this
                    .dropdownVerticalsOpen
                    ? 'is-open'
                    : ''}"
                  aria-expanded="${this.dropdownVerticalsOpen}"
                  aria-label="Select content type"
                  aria-controls="vertical-dropdown-content"
                  @click=${() =>
                    (this.dropdownVerticalsOpen = !this.dropdownVerticalsOpen)}
                >
                  ${this.setVerticalTitle(this.activeVertical)}
                </button>
                <div
                  id="vertical-dropdown-content"
                  class="vertical-nav__dropdown-wrapper ${this
                    .dropdownVerticalsOpen
                    ? 'is-open'
                    : ''}"
                >
                  <ul class="vertical-nav__list mobile">
                    <li class="${this.activeVertical == 'all' ? 'active' : ''}">
                      <button
                        @click="${() => this.setActiveVertical('all')}"
                        class="vertical-nav__item"
                      >
                        All
                      </button>
                    </li>
                    ${repeat(
                      response.modules,
                      (result: Module) => result,
                      (result, index) => html`
                        <li
                          data-index=${index}
                          class="${this.activeVertical ===
                          result.verticalConfigId
                            ? 'active'
                            : ''}"
                        >
                          <button
                            class="vertical-nav__item"
                            @click="${() =>
                              this.setActiveVertical(result.verticalConfigId)}"
                          >
                            ${this.setVerticalTitle(result.verticalConfigId)}
                          </button>
                        </li>
                      `
                    )}
                  </ul>
                </div>
              </div>
            </div>
          `
        : ``}
    `;
  }

  private desktopVerticalNavTemplate(
    response: UniversalSearchResponse
  ): TemplateResult {
    return html`
      ${response.modules?.length !== 0
        ? html`
            <div class="vertical-nav is-desktop">
              <h2 class="vertical-nav__heading is-desktop">
                Refine Your Search
              </h2>
              <ul class="vertical-nav__list is-desktop">
                <li class="${this.activeVertical == 'all' ? 'active' : ''}">
                  <button @click="${() => this.setActiveVertical('all')}">
                    All
                  </button>
                </li>
                ${repeat(
                  response.modules,
                  (result: Module) => result,
                  (result, index) => html`
                    <li
                      data-index=${index}
                      class="${this.activeVertical === result.verticalConfigId
                        ? 'active'
                        : ''}"
                    >
                      <button
                        @click="${() =>
                          this.setActiveVertical(result.verticalConfigId)}"
                      >
                        ${this.setVerticalTitle(result.verticalConfigId)}
                      </button>
                    </li>
                  `
                )}
              </ul>
            </div>
          `
        : ``}
    `;
  }

  private handlePopState = () => {
    try {
      this.initializeFromUrl();      
      this.fetchEndpoint.run();
    } catch (error) {
      console.warn('Error handling browser navigation:', error);
      this.searchSettings = {
        ...defaultSearchSettings,
        sortBys: this.defaultSortBys
      };
      this.activeVertical = 'all';
    }
  };

  render(): TemplateResult {
    if (this.fetchEndpoint.value !== undefined) {
      this.taskValue = this.fetchEndpoint.value;
    }

    const classes = {
      'wrapper': true,
      'is-mobile': this.resizeController.currentBreakpointRange === 0,
      'is-visible': this.displayResults,
    };

    return html`
      ${this.searchFormTemplate()}
      <div class="${classMap(classes)}">
        <div class="yext-results-wrapper">
          ${this.fetchEndpoint.render({
            pending: () => (this.taskValue ? Pending() : noChange),
            complete: data => {
              if (!data) {
                return;
              }

              if (isVerticalSearchResponse(data.response)) {
                return;
              }

              this.totalCount = data.response.modules.reduce(
                (previousValue, { resultsCount }) =>
                  previousValue + resultsCount,
                0
              );

              return this.resizeController.currentBreakpointRange === 0
                ? this.mobileVerticalNavTemplate(data.response)
                : this.desktopVerticalNavTemplate(data.response);
            },
          })}
          ${this.activeVertical !== 'all'
            ? html`
                <outline-yext-vertical
                  vertical-key="${this.activeVertical}"
                ></outline-yext-vertical>
              `
            : html`
                <main>
                  ${this.fetchEndpoint.render({
                    pending: () => (this.taskValue ? Pending() : noChange),
                    complete: data => {
                      if (!data) {
                        return;
                      }

                      if (isVerticalSearchResponse(data.response)) {
                        return;
                      }

                      return this.displayAll(data.response);
                    },
                  })}
                </main>
              `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'outline-yext-universal': OutlineYextUniversal;
  }
}
