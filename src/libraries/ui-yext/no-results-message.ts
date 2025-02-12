import { html } from 'lit-html';

export const NoResultsMessage = () => {
  return html`
    <div class="no-results-message">
      <h2>Sorry, we couldn't find anything</h2>
      <p>
        We couldn't find any matches for your search. Try checking your
        spelling, refining your search terms, using synonyms, or expanding your
        search criteria.
      </p>
      <br />
      <p>If you need assistance, please call 800-777-7775.</p>
    </div>
  `;
};
