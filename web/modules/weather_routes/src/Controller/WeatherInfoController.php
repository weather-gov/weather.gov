<?php

declare(strict_types=1);

namespace Drupal\weather_routes\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Url;
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
    /**
     * No-operation.
     *
     * This is used to handle routes where we don't actually need to do anything.
     * Not setting a controller seems to cause Drupal to just stop processing the
     * page, so return an empty array and be done.
     */
    public function noop()
    {
        return [];
    }

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
            throw new NotFoundHttpException();
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
            $viewBuilder = \Drupal::entityTypeManager()->getViewBuilder("node");
            $build = $viewBuilder->view($wfoInfo);
            return $build;
        } catch (\Throwable $ex) {
            throw new NotFoundHttpException();
        }
    }
}
