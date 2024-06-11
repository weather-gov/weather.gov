<?php

namespace Drupal\Tests\unique_content_field_validation\Functional;

use Drupal\field\Entity\FieldConfig;
use Drupal\field\Entity\FieldStorageConfig;
use Drupal\Tests\BrowserTestBase;

/**
 * Test to unique field validation.
 *
 * @group unique_content_field_validation
 */
class EntityFieldUniqueValidationTest extends BrowserTestBase
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
    protected static $modules = [
        'node',
        'field_test',
        'field_ui',
        'unique_content_field_validation',
    ];

    /**
     * A user with permission to administer site configuration.
     *
     * @var \Drupal\user\UserInterface
     */
    protected $user;

    /**
     * {@inheritdoc}
     */
    public function setUp(): void
    {
        parent::setUp();

        // Create test user.
        $admin_user = $this->drupalCreateUser([
            'access content',
            'administer content types',
            'administer node fields',
            'administer node form display',
            'administer node display',
            'bypass node access',
        ]);
        $this->drupalLogin($admin_user);

        // Create Basic page node type.
        $this->drupalCreateContentType(['type' => 'page', 'name' => 'Basic page']);

        /** @var \Drupal\Core\Entity\Display\EntityViewDisplayInterface $display */
        $display = \Drupal::entityTypeManager()
            ->getStorage('entity_view_display')
            ->load('node.page.default');

        // Create a node.
        $node_values = ['type' => 'page'];

        // Create test field.
        $field_storage = FieldStorageConfig::create([
          'field_name' => 'field_test',
          'entity_type' => 'node',
          'type' => 'text',
          'settings' => [
            'unique' => true,
            'unique_text' => '',
            'unique_multivalue' => true,
            'unique_multivalue_text' => '',
          ],
        ]);
        $field_storage->save();

        $instance = FieldConfig::create([
          'field_storage' => $field_storage,
          'bundle' => 'page',
          'label' => $this->randomMachineName(),
        ]);
        $instance->save();

        $node_values['title'] = 'First page';
        // Assign a test value for the field.
        $node_values['field_test'][0]['value'] = 'test value';

        // Set the field visible on the display object.
        $display_options = [
          'type' => 'text_default',
          'label' => 'above',
        ];
        $display->setComponent('field_test', $display_options);

        // Save display + create node.
        $display->save();
        $this->node = $this->drupalCreateNode($node_values);
    }
    /**
     * Tests for unique field validation.
     */
    public function testUniqueFieldValidation()
    {
        $this->drupalGet('node/add');
        $this->assertSession()->statusCodeEquals(200);
        $this->assertSession()->addressEquals('node/add/page');

        // Check that the node exists in the database.
        $node = $this->drupalGetNodeByTitle('First page');
        $this->assertNotEmpty($node, 'Node found in database.');

        // Create a node.
        $edit = [];
        $edit['title[0][value]'] = 'Second page';
        $edit['field_test[0][value]'] = 'test value';
        $this->drupalGet('node/add/page');
        $this->submitForm($edit, t('Save'));

        // Check that the Basic page has been created.
        $this->assertSession()->pageTextContains(t('@value is already set and each value needs to be unique.', ['@value' => $edit['field_test[0][value]']])); //phpcs:ignore
    }
}
