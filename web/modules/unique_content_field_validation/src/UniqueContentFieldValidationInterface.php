<?php

namespace Drupal\unique_content_field_validation;

/**
 * Provides an interface for unique_content_field_validation constants.
 */
interface UniqueContentFieldValidationInterface
{
  /**
   * Key values supported.
   */
    public const UNIQUE_CONTENT_FIELD_VALIDATION_VALID_KEY_VALUES = [
      'value',
      'target_id',
      'uri',
    ];
}
