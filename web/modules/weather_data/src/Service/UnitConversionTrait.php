<?php

namespace Drupal\weather_data\Service;

/**
 * A service class for fetching weather data.
 */
trait UnitConversionTrait {

  /**
   * Get a temperature scalar from a wmoUnit temperature object.
   */
  public function getTemperatureScalar(\stdClass $temperature, bool $inFahrenheit = TRUE) {
    $rawValue = $temperature->value;

    if ($rawValue == NULL) {
      return NULL;
    }

    $isFahrenheit = $temperature->unitCode == "wmoUnit:degF";

    $out = NULL;
    if ($isFahrenheit) {
      if ($inFahrenheit) {
        $out = $rawValue;
      }
      else {
        $out = ($rawValue - 32) * 5 / 9;
      }
    }
    else {
      if ($inFahrenheit) {
        $out = ($rawValue * 9 / 5) + 32;
      }
      else {
        $out = $rawValue;
      }
    }

    return (int) round($out);
  }

}
