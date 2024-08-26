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
    use AlertTrait;
    use DailyForecastTrait;
    use HourlyForecastTrait;
    use ObservationsTrait;
    use HourlyTableTrait;

    protected const NUMBER_OF_OBS_STATIONS_TO_TRY = 3;

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
     * Mapping of legacy API icon paths to new icons and conditions text.
     *
     * @var legacyMapping
     */
    private $legacyMapping;

    /**
     * A catch-all default icon to show.
     *
     * @var string
     */
    private $defaultIcon;

    /**
     * A catch-all conditions label to display.
     *
     * @var defaultConditions
     */
    private $defaultConditions;

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

        $this->defaultIcon = "nodata.svg";
        $this->defaultConditions = "No data";

        $this->stashedGridGeometry = null;

        $this->legacyMapping = json_decode(
            file_get_contents(__DIR__ . "/legacyMapping.json"),
        );
    }

    public static function setPoint($point)
    {
        self::$stashedPoint = $point;
    }

    /**
     * Gets weather.gov icon information from api.weather.gov icon.
     */
    public function getIcon($observation)
    {
        /* The icon path from the API is of the form:
           https://api.weather.gov/icons/land/day/skc
           - OR -
           https://api.weather.gov/icons/land/day/skc/hurricane

           The last two or three path segments are the ones we need
           to identify the current conditions. This is because there can be
           two simultaneous conditions in the legacy icon system.

           For now, we use the _first_ condition given in the path as the canonical
           condition for the key.
         */
        $icon = (object) ["icon" => null, "base" => null];

        if ($observation->icon != null && strlen($observation->icon) > 0) {
            $url = parse_url($observation->icon);
            $path = $url["path"];
            $path = explode("/", $path);

            // An icon url, when split to path parts,
            // with have either 5 or 6 parts.
            // Thus we need to trim from the end by
            // either 2 or 3 each time.
            if (count($path) == 6) {
                $path = array_slice($path, -3, 2);
            } else {
                $path = array_slice($path, -2);
            }

            $path = array_map(function ($piece) {
                return preg_replace("/,.*$/", "", $piece);
            }, $path);

            $key = implode("/", $path);
            $icon->icon = $this->legacyMapping->$key->icon;

            $icon->base = basename($icon->icon, ".svg");
        }
        return $icon;
    }

    /**
     * Get a WFO grid from a latitude and longitude.
     */
    public function getGridFromLatLon($lat, $lon)
    {
        $locationMetadata = $this->dataLayer->getPoint($lat, $lon);

        $wfo = strtoupper($locationMetadata->properties->gridId);
        $gridX = $locationMetadata->properties->gridX;
        $gridY = $locationMetadata->properties->gridY;

        return (object) [
            "wfo" => $wfo,
            "x" => $gridX,
            "y" => $gridY,
        ];
    }

    /**
     * Get a place from a WFO grid.
     */
    public function getPlaceFromGrid($wfo, $x, $y, $self = false)
    {
        if (!$self) {
            $self = $this;
        }

        $geometry = $this->getGeometryFromGrid($wfo, $x, $y);

        return $this->dataLayer->getPlaceNearPolygon($geometry);
    }

    /**
     * Get a geometry from a WFO grid.
     *
     * @return stdClass
     *   An array of points representing the vertices of the WFO grid polygon.
     */
    public function getGeometryFromGrid($wfo, $x, $y)
    {
        if (!$this->stashedGridGeometry) {
            $gridpoint = $this->dataLayer->getGridpoint($wfo, $x, $y);
            $this->stashedGridGeometry = SpatialUtility::geometryArrayToObject(
                $gridpoint->geometry->coordinates[0],
            );
        }

        return $this->stashedGridGeometry;
    }

    public function getPlaceNearPoint($lat, $lon)
    {
        return $this->dataLayer->getPlaceNearPoint($lat, $lon);
    }

    public function getSatelliteMetadata($wfo)
    {
        return $this->dataLayer->getSatelliteMetadata($wfo);
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
