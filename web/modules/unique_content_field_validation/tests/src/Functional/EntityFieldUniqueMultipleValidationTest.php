<?php

namespace Drupal\Tests\unique_content_field_validation\Functional;

use Drupal\Core\Field\FieldStorageDefinitionInterface;
use Drupal\field\Entity\FieldConfig;
use Drupal\field\Entity\FieldStorageConfig;
use Drupal\Tests\BrowserTestBase;

/**
 * Test when a multi-value field has to be unique value in each item.
 *
 * @group unique_content_field_validation
 */
class EntityFieldUniqueMultipleValidationTest extends BrowserTestBase {
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
  public function setUp(): void {
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

    // Create test field.
    $field_storage = FieldStorageConfig::create([
      'field_name' => 'field_test',
      'entity_type' => 'node',
      'type' => 'text',
      'cardinality' => FieldStorageDefinitionInterface::CARDINALITY_UNLIMITED,
      'settings' => [
        'unique' => FALSE,
        'unique_text' => '',
        'unique_multivalue' => TRUE,
        'unique_multivalue_text' => 'Value is already set and each value needs to be unique',
      ],
    ]);
    $field_storage->save();

    $instance = FieldConfig::create([
      'field_storage' => $field_storage,
      'bundle' => 'page',
      'label' => $this->randomMachineName(),
    ]);
    $instance->save();

    // Set the field visible on the display object.
    $display_options = [
      'type' => 'text_default',
      'label' => 'above',
    ];
    $display->setComponent('field_test', $display_options);

    // Save display.
    $display->save();
  }

  /**
   * Tests for unique field validation.
   */
  public function testUniqueFieldValidation() {
    $this->drupalGet('node/add');
    $this->assertSession()->statusCodeEquals(200);
    $this->assertSession()->addressEquals('node/add/page');

    // Create a node.
    $edit = [];
    $edit['title[0][value]'] = 'Multiple validation same field page';
    $edit['field_test[0][value]'] = 'test value';
    $edit['field_test[1][value]'] = 'test value';
    $this->drupalGet('node/add/page');
    $this->submitForm($edit, t('Save'));

    // Check that the Basic page has been created.
    $this->assertSession()->pageTextContains(t('Value is already set and each value needs to be unique'));
  }

}
