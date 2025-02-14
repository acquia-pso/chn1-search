import { LitElement, html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import componentStyles from './outline-yext-pager.css?inline';

export class OutlineYextPager extends LitElement {
  @property({ type: Number, attribute: 'current-page' }) currentPage = 1;
  @property({ type: Number, attribute: 'total-pages' }) totalPages = 1;

  static styles = unsafeCSS(componentStyles);

  private generatePages(): number[] {
    const pages = [];
    pages.push(1);

    for (
      let i = Math.max(2, this.currentPage - 1);
      i <= Math.min(this.totalPages - 1, this.currentPage + 1);
      i++
    ) {
      if (pages[pages.length - 1] !== i - 1) {
        pages.push(-1); // Represents ellipsis
      }
      pages.push(i);
    }

    if (this.totalPages > 1) {
      if (pages[pages.length - 1] !== this.totalPages - 1) {
        pages.push(-1);
      }
      pages.push(this.totalPages);
    }

    return pages;
  }

  private dispatchPageChange(page: number) {
    const event = new CustomEvent('page-change', {
      detail: { page },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  render() {
    const pages = this.generatePages();
    const showPrevious = this.currentPage > 1;
    const showNext = this.currentPage < this.totalPages;

    return html`
      <div class="pager" role="navigation" aria-label="Search results pages">
        ${showPrevious
          ? html`<button
              class="pager-button"
              @click=${() => this.dispatchPageChange(this.currentPage - 1)}
              aria-label="Previous page"
            >
              &lt;
            </button>`
          : ''}
        ${pages.map(page =>
          page === -1
            ? html`<span class="pager-ellipsis">...</span>`
            : html`
                <button
                  class="pager-button ${page === this.currentPage
                    ? 'active'
                    : ''}"
                  ?disabled=${page === this.currentPage}
                  @click=${() => this.dispatchPageChange(page)}
                  aria-current=${page === this.currentPage ? 'page' : 'false'}
                >
                  ${page}
                </button>
              `
        )}
        ${showNext
          ? html`<button
              class="pager-button"
              @click=${() => this.dispatchPageChange(this.currentPage + 1)}
              aria-label="Next page"
            >
              &gt;
            </button>`
          : ''}
      </div>
    `;
  }
}

customElements.define('outline-yext-pager', OutlineYextPager);
