<?php

namespace Drupal\weather_data\Service;

use Drupal\weather_data\Service\HourlyTableTrait;
use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\StringTranslation\TranslationInterface;
use Symfony\Component\HttpFoundation\RequestStack;
use Drupal\weather_data\Service\AFDParser;

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

    /**
     * Fetch the full AFD product data for the most
     * recent AFD. If no WFO is provided, get the
     * most recent AFD anywhere in the country.
     * Otherwise, get the most recent that was
     * issued by the given office.
     */
    public function getLatestAFD($wfo = null)
    {
        if ($wfo) {
            $afds = $this->dataLayer->getProductsByTypeAndOffice("AFD", $wfo);
        } else {
            $afds = $this->dataLayer->getProductsByType("AFD");
        }

        if (count($afds) > 0) {
            $afd = $this->getAFDById($afds[0]->id);

            return $afd;
        }
        return false;
    }

    /**
     * Get a list of AFD references, sorted by the most recent.
     * If no WFO code is provided, get references from all WFOs
     * collectively. Otherwise, simply get the latest references
     * for the given WFO
     */
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

    /**
     * Attempt to fetch an AFD by its ID.
     * If found, respond with an associative
     * array that can be used by Twig for
     * display
     */
    public function getAFDById($id)
    {
        $afd = $this->dataLayer->getProduct($id);
        if ($afd) {
            $afd = json_decode(json_encode($afd), true);
            $parser = new AFDParser($afd["productText"]);
            $parser->parse();
            $afd["parsedProductText"] = $parser->getStructureForTwig();
            return $afd;
        }
        return false;
    }

    /**
     * Attempts to retrieve the three-letter WFO code
     * from the product text body of an AFD.
     */
    public function getWFOFromAFD(array $afd)
    {
        if (!$afd || !array_key_exists("issuingOffice", $afd)) {
            return null;
        }

        // AFD issuing offices uses the FAA 4-letter international code. For
        // CONUS WFOs, the FAA code is the WFO code with a preceding K, so if
        // the code starts with K, we can just strip it off.
        $rawOffice = strtoupper($afd["issuingOffice"]);
        if (str_starts_with($rawOffice, "K")) {
            return substr($rawOffice, 1);
        }

        // For OCONUS, the codes do not always map so cleanly. There are only
        // nine OCONUS FAA codes used by AFDs, so we can just special case them.
        switch ($rawOffice) {
            case "PHFO": // Honolulu, HI
                return "HFO";
            case "TJSJ": // San Juan, PR
                return "SJU";
            case "NSTU": // Pago Pago, AS
                return "PPG";
            case "PGUM": // Tiyan, GU
                return "GUM";
            case "PAFC": // Anchorage, AK
                return "AFC";
            case "PAFG": // Fairbanks, AK
                return "AFG";
            case "PAJK": // Juneau, AK
                return "AJK";

            // And if we don't recognize the FAA international code, then we
            // bail out because we just don't know. But this shouldn't happen.
            // PPQE and PPQW map to WSOs, not WFOs, and AFDs should *NOT* be
            // issued under these codes, so we can explicitly map them to null
            // as well.
            case "PPQE": // Micronesia Domain East
            case "PPQW": // Micronesia Domain West
            default:
                return null;
        }
    }

    /**
     * Returns an array of associative arrays of
     * information about the available WFOs
     * based on the current taxonomy
     */
    public function getAllWFOs()
    {
        $all = \Drupal::service("weather_entity")->getWFOEntities();
        $all = array_map(function ($entity) {
            return [
                "id" => $entity->id(),
                "name" => $entity->get("name")->value,
                "code" => $entity->get("field_wfo_code")->value,
            ];
        }, $all);
        return array_values(
            array_filter($all, function ($entry) {
                return $entry["code"] != null;
            }),
        );
    }
}
