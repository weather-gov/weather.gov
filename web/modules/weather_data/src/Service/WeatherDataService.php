<?php

namespace Drupal\weather_data\Service;

use Drupal\weather_data\Service\HourlyTableTrait;
use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\StringTranslation\TranslationInterface;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * A service class for fetching weather data.
 */
class WeatherDataService
{
    /**
     * The data layer.
     *
     * @var dataLayer
     */
    private $dataLayer;

    /**
     * Cache of API calls for this request.
     *
     * @var cache
     */
    private $cache;

    /**
     * Translation provider.
     *
     * @var \Drupal\Core\StringTranslation\TranslationInterface t
     */
    private $t;

    /**
     * NewRelic API handler
     */
    private $newRelic;

    /**
     * Geometry of a WFO grid cell (stashed per request)
     *
     * @var stashedGridGeometry
     */
    public $stashedGridGeometry;

    /**
     * A lat/lon pair as an array (stashed per request)
     *
     * @var stashedPoint
     */
    protected static $stashedPoint = null;

    /**
     * Constructor.
     */
    public function __construct(
        TranslationInterface $t,
        CacheBackendInterface $cache,
        NewRelicMetrics $newRelic,
        DataLayer $dataLayer,
    ) {
        $this->cache = $cache;
        $this->dataLayer = $dataLayer;
        $this->t = $t;
        $this->newRelic = $newRelic;
    }

    public function getLatestAFD($wfo = null)
    {
        if ($wfo) {
            $afds = $this->dataLayer->getProductsByTypeAndOffice("AFD", $wfo);
        } else {
            $afds = $this->dataLayer->getProductsByType("AFD");
        }

        if (count($afds) > 0) {
            $afd = $this->dataLayer->getProduct($afds[0]->id);
            return json_decode(json_encode($afd), true);
        }
        return false;
    }

    public function getLatestAFDReferences($wfo = null)
    {
        if ($wfo) {
            $afds = $this->dataLayer->getProductsByTypeAndOffice("AFD", $wfo);
        } else {
            $afds = $this->dataLayer->getProductsByType("AFD");
        }

        if (count($afds) > 0) {
            return array_map(function ($afdReference) {
                return json_decode(json_encode($afdReference), true);
            }, $afds);
        }
        return false;
    }
}
