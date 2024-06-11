<?php

namespace Drupal\Tests\unique_content_field_validation\Functional;

use Drupal\Core\Url;
use Drupal\Tests\BrowserTestBase;

/**
 * Simple test to ensure that main page loads with module enabled.
 *
 * @group unique_content_field_validation
 */
class LoadTest extends BrowserTestBase
{
    /**
     * {@inheritdoc}
     */
    protected $defaultTheme = 'classy';

    /**
     * Modules to enable.
     *
     * @var array
     */
    protected static $modules = ['unique_content_field_validation'];

    /**
     * A user with permission to administer site configuration.
     *
     * @var \Drupal\user\UserInterface
     */
    protected $user;

    /**
     * {@inheritdoc}
     */
    protected function setUp() : void {
        parent::setUp();
        $this->user = $this->drupalCreateUser(['administer site configuration']);
        $this->drupalLogin($this->user);
    }

    /**
     * Tests that the home page loads with a 200 response.
     */
    public function testLoad() {
        $this->drupalGet(Url::fromRoute('<front>'));
        $this->assertSession()->statusCodeEquals(200);
    }
}
