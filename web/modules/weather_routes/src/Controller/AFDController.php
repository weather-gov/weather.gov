<?php

declare(strict_types=1);

namespace Drupal\weather_routes\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Url;
use Drupal\weather_data\Service\WeatherDataService;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\RedirectResponse;

/**
 * Responses for AFD retrieval routes
 *
 */
final class AFDController extends ControllerBase
{
    /**
     * A service for fetching weather data.
     *
     * @var WeatherDataService weatherData
     */
    private $weatherData;
    private $request;

    /**
     * Constructor for dependency injection.
     */
    public function __construct($weatherData, $request)
    {
        $this->weatherData = $weatherData;
        $this->request = $request;
    }

    /**
     * {@inheritdoc}
     */
    public static function create(ContainerInterface $container)
    {
        return new static(
            $container->get("weather_data"),
            $container->get("request_stack"),
        );
    }

    public function afdDefault()
    {
        $id = $this->request->getCurrentRequest()->query->get("id");
        $wfo_code = $this->request->getCurrentRequest()->query->get("wfo");
        $current = $this->request
            ->getCurrentRequest()
            ->query->get("current-id");

        // If the AFD id of the referer page is the same as the requested
        // id, this means we really just want to update the WFO
        if ($current == $id) {
            $id = null;
        }

        if ($id && $wfo_code) {
            return new RedirectResponse("/afd/" . $wfo_code . "/" . $id);
        } elseif ($wfo_code) {
            return new RedirectResponse("/afd/" . $wfo_code);
        } elseif ($id) {
            // In this case, we just have the id and not the WFO.
            // We can attempt to pre-fetch the AFD and parse
            // the WFO from its body
            $afd = $this->weatherData->getAFDById($id);
            $extracted_code = $this->weatherData->getWFOFromAFD($afd);
            if ($afd && $extracted_code) {
                return new RedirectResponse(
                    "/afd/" . $extracted_code . "/" . $afd["id"],
                );
            }
        }

        // In the catch-all case, we grab the most recent AFDs from
        // everywhere, and return a link to the viewer set up for the
        // first encountered AFD (using its WFO and WFO versions)
        $refs = $this->weatherData->getLatestAFDReferences();
        $id = $refs[0]["id"];
        $afd = $this->weatherData->getAFDById($id);
        $wfo = $this->weatherData->getWFOFromAFD($afd);
        return new RedirectResponse("/afd/" . $wfo . "/" . $id);
    }

    public function byOfficeAndId($wfo_code, $afd_id)
    {
        $versions = $this->weatherData->getLatestAFDReferences($wfo_code);
        $afd = $this->weatherData->getAFDById($afd_id);
        if (!$afd) {
            // This is where you 404
            return;
        }
        $allWfos = $this->weatherData->getAllWFOs();
        $versions = $this->weatherData->getLatestAFDReferences($wfo_code);

        return [
            "#theme" => "weather_routes_afd",
            "#wfo" => $wfo_code,
            "#afd" => $afd,
            "#wfo_list" => $allWfos,
            "#version_list" => $versions,
        ];
    }

    /**
     * Display the AFD viewer page with all of
     * the most recent versions for the given
     * forecasting office.
     * Show the most recent one by default
     */
    public function byOffice($wfo_code)
    {
        // If a querystring parameter of an AFD id was passed in,
        // we are requesting that specific ID.
        // Simple redirect in that case
        $id = $this->request->getCurrentRequest()->query->get("id");
        if ($id) {
            return new RedirectResponse("/afd/" . $wfo_code . "/" . $id);
        }

        // Otherwise, grab all of the current versions for the WFO
        // and use the most recent one as the id
        $versions = $this->weatherData->getLatestAFDReferences($wfo_code);
        if ($versions && count($versions)) {
            return new RedirectResponse(
                "/afd/" . $wfo_code . "/" . $versions[0]["id"],
            );
        }
    }

    /**
     * Get the AFD viewer page with the given
     * AFD and its WFO already populated
     */
    public function byId($afd_id)
    {
        $afd = $this->weatherData->getAFDById($afd_id);
        if (!$afd) {
            // This is where you 404
            return;
        }
        $wfo = $this->weatherData->getWFOFromAFD($afd);
        $versions = [];
        if ($wfo) {
            $versions = $this->weatherData->getLatestAFDReferences($wfo);
        }
        $allWfos = $this->weatherData->getAllWFOs();

        return [
            "#theme" => "weather_routes_afd",
            "#wfo" => $wfo,
            "#afd" => $afd,
            "#wfo_list" => $allWfos,
            "#version_list" => $versions,
        ];
    }

    /**
     * Fetch the markup for a parsed AFD by
     * the ID of the AFD.
     */
    public function markupOnlyById($afd_id)
    {
        $afd = $this->weatherData->getAFDById($afd_id);
        $build = [
            "#theme" => "weather_routes_afd_partial",
            "#wfo" => "UNK",
            "#afd" => $afd,
            "#wfo_list" => [],
            "#version_list" => [],
        ];
        $renderedMarkup = \Drupal::service("renderer")->render($build);
        return new Response($renderedMarkup->__toString());
    }

    /**
     * Fetch the markup for versions for the given WFO.
     * This means providing a collection of <options> elements
     */
    public function markupOnlyForVersions($wfo_code)
    {
        $versions = $this->weatherData->getLatestAFDReferences($wfo_code);
        $build = [
            "#theme" => "weather_routes_wx_afd_versions",
            "#wfo" => $wfo_code,
            "#version_list" => $versions,
        ];
        $renderedMarkup = \Drupal::service("renderer")->render($build);
        return new Response($renderedMarkup->__toString());
    }
}
