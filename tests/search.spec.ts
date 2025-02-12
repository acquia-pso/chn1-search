import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  test('should perform a search and display results', async ({ page }) => {
    // Navigate to the page
    await page.goto('/');

    // Get the search input and button within the shadow DOM
    const searchComponent = page.locator('outline-yext-universal');
    const searchInput = searchComponent.locator('input[type="search"]');
    const searchButton = searchComponent.locator('button.search-button');

    // Type a search query
    await searchInput.fill('test');

    // Click search button
    await searchButton.click();

    // Wait for results to load
    const resultsContainer = searchComponent.locator('.results-container');
    await expect(resultsContainer).toBeVisible();

    // Verify search suggestions appear while typing
    await searchInput.clear();
    await searchInput.type('heal');

    // Wait for suggestions to appear
    const suggestionsContainer = searchComponent.locator(
      '.suggestions-container'
    );
    await expect(suggestionsContainer).toBeVisible();

    // Verify at least one suggestion is present
    const suggestions = suggestionsContainer.locator('button.suggestion-item');
    const count = await suggestions.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should handle empty search results', async ({ page }) => {
    await page.goto('/');

    const searchComponent = page.locator('outline-yext-universal');
    const searchInput = searchComponent.locator('input[type="search"]');
    const searchButton = searchComponent.locator('button.search-button');

    // Search for a term unlikely to have results
    await searchInput.fill('xyznonexistentterm123');
    await searchButton.click();

    // Wait for results container and verify "no results" message
    const resultsContainer = searchComponent.locator('.results-container');
    await expect(resultsContainer).toBeVisible();

    // Check for the correct no results message
    const noResultsHeading = resultsContainer.locator('h2');
    await expect(noResultsHeading).toHaveText(
      "Sorry, we couldn't find anything"
    );
  });

  test('should navigate using search suggestions', async ({ page }) => {
    await page.goto('/');

    const searchComponent = page.locator('outline-yext-universal');
    const searchInput = searchComponent.locator('input[type="search"]');

    // Type to trigger suggestions
    await searchInput.type('health', { delay: 100 });

    // Wait for suggestions container to be visible
    const suggestionsContainer = searchComponent.locator(
      '.suggestions-container'
    );
    await expect(suggestionsContainer).toBeVisible({ timeout: 5000 });

    // Wait for suggestions to be populated and verify we have at least one
    const suggestions = suggestionsContainer.locator('button.suggestion-item');
    await expect(suggestions.first()).toBeVisible({ timeout: 5000 });

    // Store the suggestion text for verification
    const suggestionText = await suggestions.first().textContent();

    // Click the first suggestion directly instead of using keyboard navigation
    await suggestions.first().click();

    // Wait for any loading state to complete
    const loadingSpinner = page.locator('.loading-container');
    await expect(loadingSpinner).toBeVisible({ timeout: 5000 });
    await expect(loadingSpinner).not.toBeVisible({ timeout: 10000 });

    // Find either the universal results or vertical results container
    const verticalComponent = page.locator('outline-yext-vertical');
    const resultsContainer = verticalComponent.locator('.results-container');

    // Wait for results container to be visible
    await expect(resultsContainer).toBeVisible({ timeout: 10000 });

    // Verify we have a results grid with items
    const resultsGrid = resultsContainer.locator('.results-grid');
    await expect(resultsGrid).toBeVisible({ timeout: 5000 });

    // Verify we have at least one result
    const resultItems = resultsGrid.locator('.result-item');
    const resultCount = await resultItems.count();
    expect(resultCount).toBeGreaterThan(0);

    // Verify the results header shows some count of results
    const resultsHeader = resultsContainer.locator('.results-header');
    const headerText = await resultsHeader.textContent();
    expect(headerText).toMatch(/\d+/); // Should contain at least one number
  });

  test('should navigate between verticals and handle browser navigation', async ({
    page,
  }) => {
    await page.goto('/');

    const searchComponent = page.locator('outline-yext-universal');
    const searchInput = searchComponent.locator('input[type="search"]');
    const searchButton = searchComponent.locator('button.search-button');

    // Perform initial search
    await searchInput.fill('health');
    await searchButton.click();

    // Wait for results to load
    const resultsContainer = searchComponent.locator('.results-container');
    await expect(resultsContainer).toBeVisible();

    // Get all vertical tabs (excluding 'All')
    const verticalTabs = page.locator('.vertical-tab:not(:first-child)');

    // Wait for at least one vertical tab to be present and visible
    const firstVerticalTab = verticalTabs.first();

    // Get the text content before clicking
    await expect(firstVerticalTab).toBeVisible();
    await firstVerticalTab.click();

    // Wait for the first vertical results to load
    const firstVerticalResults = page.locator('.results-grid');
    await expect(firstVerticalResults).toBeVisible();

    // Store the first result text for later comparison
    const firstResultText = await firstVerticalResults.textContent();

    // Click the second vertical tab
    const secondVerticalTab = verticalTabs.nth(1);
    await secondVerticalTab.click();

    // Wait for the second vertical results to load
    const secondVerticalResults = page.locator('.results-grid');
    await expect(secondVerticalResults).toBeVisible();

    // Store the second result text for later comparison
    const secondResultText = await secondVerticalResults.textContent();

    // Verify we got different results
    expect(firstResultText).not.toEqual(secondResultText);

    // Go back in browser history
    await page.goBack();

    // Wait for the first vertical results to reload
    await expect(firstVerticalResults).toBeVisible();
    const backNavigationText = await firstVerticalResults.textContent();

    // Verify we see the same results as before
    expect(backNavigationText).toEqual(firstResultText);

    // Refresh the page
    await page.reload();

    // Wait for the results to reload
    await expect(firstVerticalResults).toBeVisible();
    const refreshedText = await firstVerticalResults.textContent();

    // Verify we see the same results after refresh
    expect(refreshedText).toEqual(firstResultText);
  });

  test('should hide suggestions when focus moves away from search', async ({
    page,
  }) => {
    await page.goto('/');

    const searchComponent = page.locator('outline-yext-universal');
    const searchInput = searchComponent.locator('input[type="search"]');

    // Type to trigger suggestions
    await searchInput.type('health');

    // Wait for suggestions container to appear
    const suggestionsContainer = searchComponent.locator(
      '.suggestions-container'
    );
    await expect(suggestionsContainer).toBeVisible();

    // Click somewhere else on the page (outside search input and suggestions)
    await page.click('body', { position: { x: 0, y: 0 } });

    // Verify suggestions container is hidden
    await expect(suggestionsContainer).not.toBeVisible();

    // Focus back on search input
    await searchInput.click();

    // Verify suggestions reappear
    await expect(suggestionsContainer).toBeVisible();

    // Move focus to suggestion item
    const suggestions = suggestionsContainer.locator('button.suggestion-item');
    await suggestions.first().hover();

    // Verify suggestions stay visible while hovering over them
    await expect(suggestionsContainer).toBeVisible();

    // Move focus completely away again
    await page.click('body', { position: { x: 0, y: 0 } });

    // Verify suggestions disappear
    await expect(suggestionsContainer).not.toBeVisible();
  });
});
