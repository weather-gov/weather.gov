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

    public function getLatestNodeFromWFO($wfo, $nodeType)
    {
        // Get the ID for the WFO taxonomy term that matches our grid WFO.
        $termID = $this->entityTypeManager
            ->getStorage("taxonomy_term")
            ->loadByProperties(["field_wfo_code" => $wfo]);

        // If we don't get any results, that means we don't have a WFO
        // taxonomy code for this WFO. By definition, we also can't have any
        // nodes for it, so we can bail out now. Otherwise, continue processing.
        if (count($termID) > 0) {
            // loadByProperties returns an associative array where the indices
            // are actually the term IDs, so we can't just take the 0th index
            // here. Sigh. Instead, pop the single element out of the array.
            $termID = array_pop($termID)
                ->get("tid")
                ->getString();

            // The entity manager interface doesn't have convenience methods for
            // the kind of filtering we want to do, but the entity query
            // interface lets us get really specific. The result of this query
            // is all node ID for the most recent node of the specified type tagged
            // with our target WFO.
            $nodeID = $this->entityTypeManager
                ->getStorage("node")
                ->getQuery()
                ->accessCheck(false)
                ->condition("type", $nodeType)
                ->condition("field_wfo", $termID)
                ->sort("changed", "DESC")
                // Only get the first one.
                ->range(0, 1)
                ->execute();

            // It's still returned as an associated array, though, so pop.
            // Always be popping.
            $nodeID = array_pop($nodeID);

            // Then we can use the convenience method to actually load the node.
            $node = $this->entityTypeManager->getStorage("node")->load($nodeID);

            if ($node) {
                return $node;
            }
        }

        return false;
    }
}
