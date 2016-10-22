Feature: Shopping cart management
  Users can add, modify and delete things in their shopping cart prompts


  Scenario: Create Test item
    Given I create a test product author selects add articlea prompts 

  Scenario: Add item to cart
    Given I visit the test product page
    When I follow "Add to cart"
    Then I should see the "Shopping Cart" page
    And there should be 1 item in my shopping cart
    And I should see the test product title


  Scenario: Change quantity of item in cart
    Given I visit the test product page
    When I follow "Add to cart"
    Then I should see the "Shopping Cart" page
    And there should be 1 item in my shopping cart
    When I update the quantity of "Test Product" to "2"
    And I press "Update Quantities"
    Then there should be 2 items in my shopping cart


  Scenario: Remove item from cart
    Given I visit the test product page
    When I follow "Add to cart"
    Then I should see the "Shopping Cart" page
    And there should be 1 item in my shopping cart
    When I check the delete checkbox for "Test Product"
    And I press "Delete"
    Then there should be 0 items in my shopping cart



Feature: Some terse yet descriptive text of what is desired
  In order to realize a named business value
  As an explicit system actor
  I want to gain some beneficial outcome which furthers the goal

  Additional text...

  Scenario: Some determinable business situation
    Given some precondition
    And some other precondition
    When some action by the actor
    And some other action
    And yet another action
    Then some testable outcome is achieved
    And something else we can check happens too


  Scenario: Buy last coffee
    Given there are 1 coffees left in the machine
    And I have deposited 1 dollar
    When I press the coffee button
    Then I should be served a coffee

  Scenario: Wilson posts to his own blog
    Given I am logged in as Wilson
    When I try to post to "Expensive Therapy"
    Then I should see "Your article was published."

  Scenario: Wilson fails to post to somebody else's blog
    Given I am logged in as Wilson
    When I try to post to "Greg's anti-tax rants"
    Then I should see "Hey! That's not your blog!"

  Scenario: Greg posts to a client's blog
    Given I am logged in as Greg
    When I try to post to "Expensive Therapy"
    Then I should see "Your article was published."


  Examples:
    | start | eat | left |
    |  12   |  5  |  7   |
    |  20   |  5  |  15  |


  Scenario: Eating
    # <start> replaced with 12:
    Given there are 12 cucumbers
    # <eat> replaced with 5:
    When I eat 5 cucumbers
    # <left> replaced with 7:

    When I send an email with:
      """
      ...
      """
    Then the client should receive the email with:
      """
      ...
      """

    Then I should have 7 cucumbers
