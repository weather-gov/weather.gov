<?php

declare(strict_types=1);

namespace Drupal\weather_routes\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Url;
use Drupal\node\Entity\Node;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Responses for Weather Info node routes
 *
 */
final class WeatherInfoController extends ControllerBase
{
    public function getWFOTaxonomyTerm($wfoCode)
    {
        $wfo_results = \Drupal::entityTypeManager()
            ->getStorage("taxonomy_term")
            ->loadByProperties([
                "vid" => "weather_forecast_offices",
                "field_wfo_code" => strtoupper($wfoCode),
            ]);
        $wfo_results = array_values($wfo_results); // Indices can be totally random numbers!
        if (count($wfo_results) == 0) {
            throw new NotFoundHttpException();
        }
        return $wfo_results[0];
    }

    public function getWFOInfoFromTerm($wfoTerm)
    {
        $termId = $wfoTerm->id();
        $results = \Drupal::entityTypeManager()
            ->getStorage("node")
            ->loadByProperties([
                "type" => "wfo_info",
                "field_wfo" => $termId,
            ]);
        $results = array_values($results);

        if (count($results) == 0) {
            return false;
        }
        return $results[0];
    }

    public function content($wfo)
    {
        // First, get the actual taxonomy information
        // for the given code
        try {
            $wfoTerm = $this->getWFOTaxonomyTerm($wfo);
            $wfoInfo = $this->getWFOInfoFromTerm($wfoTerm);
            if (!$wfoInfo) {
                // If there's not already a node for this WFO, create a blank
                // one in memory so we can still render a page. It'll just have
                // less content in it.
                $wfoInfo = Node::create(["type" => "wfo_info"]);
                $wfoInfo->set("field_wfo", $wfoTerm);
            }
            $viewBuilder = \Drupal::entityTypeManager()->getViewBuilder("node");
            $build = $viewBuilder->view($wfoInfo);
            return $build;
        } catch (\Throwable $ex) {
            throw new NotFoundHttpException();
        }
    }
}
