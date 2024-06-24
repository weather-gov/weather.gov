<?php

namespace Drupal\unique_content_field_validation\Plugin\Validation\Constraint;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\DependencyInjection\ContainerInjectionInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;

/**
 * Validates the UniqueEntityTitle constraint.
 */
class UniqueContentTitleValidator extends ConstraintValidator implements ContainerInjectionInterface
{
    /**
     * The configuration factory.
     *
     * @var \Drupal\Core\Config\ConfigFactoryInterface
     */
    protected $configFactory;

    /**
     * The entity type manager.
     *
     * @var \Drupal\Core\Entity\EntityTypeManagerInterface
     */
    protected $entityTypeManager;

    /**
     * Constructs a new UniqueContentTitleValidator instance.
     *
     * @param \Drupal\Core\Config\ConfigFactoryInterface $config_factory
     *   A configuration factory instance.
     * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
     *   The entity type manager service.
     */
    public function __construct(ConfigFactoryInterface $config_factory, EntityTypeManagerInterface $entity_type_manager)
    {
        $this->configFactory = $config_factory;
        $this->entityTypeManager = $entity_type_manager;
    }

    /**
     * {@inheritdoc}
     */
    public static function create(ContainerInterface $container)
    {
        return new static(
            $container->get('config.factory'),
            $container->get('entity_type.manager')
        );
    }

    /**
     * {@inheritdoc}
     */
    public function validate($item, Constraint $constraint)
    {
        $unique_validation_enabled = false;
        $custom_message = null;
        $value = !empty($item->getValue()) ? $item->getValue()[0]['value'] : '';
        $entity = $item->getEntity();
        $entity_type = $entity->getEntityTypeId();
        switch ($entity_type) {
            case 'node':
                $entity_bundle = $entity->getType();
                /** @var \Drupal\node\Entity\NodeType $node_type */
                $node_type = $entity->type->entity;
                $unique_validation_enabled = $node_type->getThirdPartySetting('unique_content_field_validation', 'unique', false); //phpcs:ignore
                $custom_message = $node_type->getThirdPartySetting('unique_content_field_validation', 'unique_text', null); //phpcs:ignore
                $unique_entity_title_label = $this->configFactory->get('core.base_field_override.node.' . $entity_bundle . '.title')->get('label') ?: 'Title'; //phpcs:ignore
                $unique_field_name = 'title';
                $bundle_field = 'type';
                $id_field = 'nid';
                break;
        }
        if ($unique_validation_enabled && $this->uniqueValidation($unique_field_name, $value, $entity_type, $bundle_field, $entity_bundle, $id_field)) { //phpcs:ignore
            $message = $custom_message ?: $constraint->message;
            $this->context->addViolation($message, [
                '%label' => $unique_entity_title_label,
                '%value' => $value,
            ]);
        }
    }

    /**
     * Unique validation.
     *
     * @param string $field_name
     *   The name of the field.
     * @param string $value
     *   Value of the field to check for uniqueness.
     * @param string $entity_type
     *   Id of the Entity Type.
     * @param string $bundle_field
     *   Field of the Entity type.
     * @param string $entity_bundle
     *   Bundle of the entity.
     * @param string $id_field
     *   Id field of the entity.
     *
     * @return bool
     *   Whether the entity is unique or not
     */
    private function uniqueValidation($field_name, $value, $entity_type, $bundle_field, $entity_bundle, $id_field)
    {
        if ($entity_type && $value && $field_name && $bundle_field && $entity_bundle) {
            $query = $this->entityTypeManager->getStorage($entity_type)->getQuery()
                ->condition($field_name, $value)
                ->condition($bundle_field, $entity_bundle)
                ->range(0, 1);
            // Exclude the current entity.
            if (!empty($id = $this->context->getRoot()->getEntity()->id())) {
                $query->condition($id_field, $id, '!=');
            }
            $entities = $query->accessCheck(false)->execute();
            if (!empty($entities)) {
                return true;
            }
        }
        return false;
    }
}
