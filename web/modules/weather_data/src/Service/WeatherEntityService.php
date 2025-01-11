<?php

namespace Drupal\weather_data\Service;

use Drupal\Core\Entity\EntityTypeManagerInterface;

/**
 * A service class for fetching weather data.
 */
class WeatherEntityService
{
    protected $entityTypeManager;

    /**
     * Constructor.
     */
    public function __construct(EntityTypeManagerInterface $entityTypeManager)
    {
        $this->entityTypeManager = $entityTypeManager;
    }

    /**
     * Helper function to get the latest node based on a term ID and field.
     */
    private function getLatestNodeByTerm($termID, $termField, $nodeType)
    {
        // If term ID is not provided, bail out.
        if (empty($termID)) {
            return false;
        }

        // Get the term ID from the array of terms.
        $termID = array_pop($termID)->get("tid")->getString();

        // Query to get the latest node of the specified type tagged with the term.
        $nodeID = $this->entityTypeManager
            ->getStorage("node")
            ->getQuery()
            ->accessCheck(false)
            ->condition("status", 1)
            ->condition("type", $nodeType)
            ->condition($termField, $termID)
            ->sort("changed", "DESC")
            ->range(0, 1)
            ->execute();

        // Load and return the node if found.
        return $nodeID ? $this->entityTypeManager->getStorage("node")->load(array_pop($nodeID)) : false;
    }

    /**
     * Fetches the latest node for a given weather event type and node type.
     */
    public function getLatestNodeFromWeatherEvent($eventType, $nodeType)
    {
        // Get the term ID for the weather event type.
        $termID = $this->entityTypeManager
            ->getStorage("taxonomy_term")
            ->loadByProperties(["name" => $eventType]);

        return $this->getLatestNodeByTerm($termID, "field_weather_event_type", $nodeType);
    }

    /**
     * Fetches the latest node for a given WFO code and node type.
     */
    public function getLatestNodeFromWFO($wfo, $nodeType)
    {
        // Get the normalized WFO code.
        $wfoCode = $this->normalizeAnchorageWFO($wfo);
        $termID = $this->entityTypeManager
            ->getStorage("taxonomy_term")
            ->loadByProperties(["field_wfo_code" => $wfoCode]);

        return $this->getLatestNodeByTerm($termID, "field_wfo", $nodeType);
    }

    /**
     * Fetches the latest weather story image from a given WFO code.
     */
    public function getLatestWeatherStoryImageFromWFO($wfo, $nodeType)
    {
        // Get the latest weather story node for the WFO code.
        $nodeID = $this->entityTypeManager
            ->getStorage("node")
            ->getQuery()
            ->accessCheck(false)
            ->condition("status", 1)
            ->condition("type", $nodeType)
            ->condition("field_office", '%' . $wfo, 'LIKE')
            ->sort("changed", "DESC")
            ->range(0, 1)
            ->execute();

        return $nodeID ? $this->entityTypeManager->getStorage("node")->load(array_pop($nodeID)) : false;
    }

    /**
     * Fetches a WFO entity by its WFO code.
     */
    public function getWFOEntity($wfo)
    {
        $wfoCode = $this->normalizeAnchorageWFO($wfo);
        $term = $this->entityTypeManager
            ->getStorage("taxonomy_term")
            ->loadByProperties(["field_wfo_code" => $wfoCode]);

        return !empty($term) ? array_pop($term) : false;
    }

    /**
     * Fetches all WFO entities.
     */
    public function getWFOEntities()
    {
        // Get WFO entity IDs and load them.
        $ids = $this->entityTypeManager
            ->getStorage("taxonomy_term")
            ->getQuery()
            ->accessCheck(false)
            ->condition("vid", "weather_forecast_offices")
            ->execute();

        return $this->entityTypeManager
            ->getStorage("taxonomy_term")
            ->loadMultiple($ids);
    }

    /**
     * Normalize WFO codes for Alaska/Anchorage.
     */
    public function normalizeAnchorageWFO(string $wfo): string
    {
        $inAnchorageCodes = ["aer", "alu"];
        return in_array(strtolower($wfo), $inAnchorageCodes) ? "AFC" : $wfo;
    }
}
