Feature: Search Functionality
  As a user
  I want to be able to search for content
  So that I can find relevant information

  Scenario: Basic search returns results
    Given I am on the search page
    When I enter "restaurant" into the search box
    And I click the search button
    Then I should see search results displayed 

  Scenario: Search with Enter key returns results
    Given I am on the search page
    When I enter "restaurant" into the search box
    And I press Enter
    Then I should see search results displayed 

  Scenario: Navigate between verticals and use browser history
    Given I am on the search page
    When I enter "restaurant" into the search box
    And I press Enter
    And I click on the first available vertical
    Then I should see results for the selected vertical
    When I click on the next available vertical
    Then I should see results for the selected vertical
    When I click the browser back button
    Then I should see results for the previously selected vertical 