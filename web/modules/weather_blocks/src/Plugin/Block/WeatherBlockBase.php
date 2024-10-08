<?php

namespace Drupal\weather_blocks\Plugin\Block;

use Drupal\Core\Block\BlockBase;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Logger\LoggerChannelTrait;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\node\NodeInterface;
use Drupal\weather_data\Service\WeatherEntityService;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Base class for weather.gov custom blocks.
 *
 * This class handles the dependency injection to get access to a
 * RouteMatchInterface object and a WeatherEntityService object.
 */
abstract class WeatherBlockBase extends BlockBase implements
    ContainerFactoryPluginInterface
{
    use LoggerChannelTrait;

    /**
     * An entity type manager.
     *
     * @var \Drupal\Core\Entity\EntityTypeManagerInterface entityTypeManager
     */
    protected $entityTypeService;

    /**
     * Constructor for dependency injection.
     */
    public function __construct(
        array $configuration,
        $plugin_id,
        $plugin_definition,
        WeatherEntityService $entityTypeService,
    ) {
        parent::__construct($configuration, $plugin_id, $plugin_definition);
        $this->entityTypeService = $entityTypeService;
    }

    /**
     * {@inheritdoc}
     */
    public static function create(
        ContainerInterface $container,
        array $configuration,
        $plugin_id,
        $plugin_definition,
    ) {
        return new static(
            $configuration,
            $plugin_id,
            $plugin_definition,
            $container->get("weather_entity"),
        );
    }

    /**
     * Disable cacheing on this block.
     *
     * Because this is displayed to anonymous users and it is location-based.
     */
    public function getCacheMaxAge()
    {
        return 0;
    }
}
