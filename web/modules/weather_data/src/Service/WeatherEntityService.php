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

    private function getLatestNodeByTerm($termID, $termField, $nodeType)
    {
        // If we don't get any results, that means we don't have a WFO
        // taxonomy code for this WFO. By definition, we also can't have any
        // nodes for it, so we can bail out now. Otherwise, continue processing.
        if (count($termID) > 0) {
            // loadByProperties returns an associative array where the indices
            // are actually the term IDs, so we can't just take the 0th index
            // here. Sigh. Instead, pop the single element out of the array.
            $termID = array_pop($termID)->get("tid")->getString();

            // The entity manager interface doesn't have convenience methods for
            // the kind of filtering we want to do, but the entity query
            // interface lets us get really specific. The result of this query
            // is all node ID for the most recent node of the specified type tagged
            // with our target WFO.
            $nodeID = $this->entityTypeManager
                ->getStorage("node")
                ->getQuery()
                ->accessCheck(false)
                ->condition("status", 1)
                ->condition("type", $nodeType)
                ->condition($termField, $termID)
                ->sort("changed", "DESC")
                // Only get the first one.
                ->range(0, 1)
                ->execute();

            // It's still returned as an associated array, though, so pop.
            // Always be popping.
            $nodeID = array_pop($nodeID);

            $node = false;
            if ($nodeID) {
                // Then we can use the convenience method to actually load the node.
                $node = $this->entityTypeManager
                    ->getStorage("node")
                    ->load($nodeID);
            }

            if ($node) {
                return $node;
            }
        }

        return false;
    }

    public function getLatestNodeFromWeatherEvent($eventType, $nodeType)
    {
        // Get the ID for the WFO taxonomy term that matches our event type.
        $termID = $this->entityTypeManager
            ->getStorage("taxonomy_term")
            ->loadByProperties(["name" => $eventType]);

        return $this->getLatestNodeByTerm(
            $termID,
            "field_weather_event_type",
            $nodeType,
        );
    }

    public function getLatestNodeFromWFO($wfo, $nodeType)
    {
        // Get the ID for the WFO taxonomy term that matches our grid WFO.
        $wfoCode = $this->normalizeAnchorageWFO($wfo);
        $termID = $this->entityTypeManager
            ->getStorage("taxonomy_term")
            ->loadByProperties(["field_wfo_code" => $wfoCode]);

        return $this->getLatestNodeByTerm($termID, "field_wfo", $nodeType);
    }

    public function getLatestWeatherStoryImageFromWFO($wfo, $nodeType)
    {
        // get the latest weather story upload that matches the grid WFO.
        $nodeID = $this->entityTypeManager
            ->getStorage("node")
            ->getQuery()
            ->accessCheck(false)
            ->condition("status", 1)
            ->condition("type", $nodeType)
            ->condition("field_starttime", time(), '<=')
            ->condition("field_endtime", time(), '>=')
            ->condition("field_office", '%' . $wfo, 'LIKE')
            ->sort("field_order", "ASC")
            // Only get the first one.
            ->range(0, 1)
            ->execute();
        $nodeID = array_pop($nodeID);

        // if we have a node ID then we need to actually load it.
        $node = false;
        if ($nodeID) {
            $node = $this->entityTypeManager
                ->getStorage("node")
                ->load($nodeID);
        }
        return $node;
    }

    public function getWFOEntity($wfo)
    {
        $wfoCode = $this->normalizeAnchorageWFO($wfo);
        $term = $this->entityTypeManager
            ->getStorage("taxonomy_term")
            ->loadByProperties(["field_wfo_code" => $wfoCode]);
        if (count($term) > 0) {
            return array_pop($term);
        }
        return false;
    }

    public function getWFOEntities()
    {
        $ids = $this->entityTypeManager
            ->getStorage("taxonomy_term")
            ->getQuery()
            ->accessCheck(false)
            ->condition("vid", "weather_forecast_offices")
            ->execute();
        $result = $this->entityTypeManager
            ->getStorage("taxonomy_term")
            ->loadMultiple($ids);
        return $result;
    }

    /**
     * Normalize WFOs for Alaska/Anchorage
     */
    public function normalizeAnchorageWFO(string $wfo): string
    {
        $inAnchorageCodes = ["aer", "alu"];
        $matches = in_array(strtolower($wfo), $inAnchorageCodes);
        if ($matches) {
            return "AFC";
        }
        return $wfo;
    }
}
