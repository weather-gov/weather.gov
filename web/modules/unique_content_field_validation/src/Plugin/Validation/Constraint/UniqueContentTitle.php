<?php

namespace Drupal\unique_content_field_validation\Plugin\Validation\Constraint;

use Symfony\Component\Validator\Constraint;

/**
 * Checks that the submitted value is unique.
 *
 * @Constraint(
 *   id = "UniqueContentTitle",
 *   label = @Translation("Unique Content Title", context = "Validation"),
 *   type = "string"
 * )
 */
class UniqueContentTitle extends Constraint
{
    /**
     * The message that will be shown if the value is not unique.
     *
     * @var string
     */
    public $message = '%label must be unique but "%value" already exists!';
}
