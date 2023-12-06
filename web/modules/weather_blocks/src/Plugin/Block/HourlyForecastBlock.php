<?php

namespace Drupal\weather_blocks\Plugin\Block;

use Drupal\Core\Form\FormStateInterface;

/**
 * Provides a block of the hourly (short term) weather conditions.
 *
 * @Block(
 *   id = "weathergov_hourly_forecast",
 *   admin_label = @Translation("Hourly forecast block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class HourlyForecastBlock extends WeatherBlockBase {

  /**
   * {@inheritdoc}
   */
  public function blockForm($form, FormStateInterface $form_state) {
    $form = parent::blockForm($form, $form_state);
    $config = $this->getConfiguration();
    $max = $config["max_items"] ?? "12";

    $form["max_items"] = [
      "#type" => "textfield",
      "#title" => "Maximum items to display",
      "#default_value" => $max,
    ];

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function blockSubmit($form, FormStateInterface $form_state) {
    parent::blockSubmit($form, $form_state);

    $this->setConfigurationValue(
      "max_items",
      $form_state->getValue("max_items")
    );
  }

  /**
   * {@inheritdoc}
   */
  public function build() {
    $location = $this->getLocation();

    if ($location->grid) {
      $grid = $location->grid;

      $config = $this->getConfiguration();
      $max = $config["max_items"] ?? "12";
      $data = $this->weatherData->getHourlyForecastFromGrid(
        $grid->wfo,
        $grid->x,
        $grid->y
      );
      $data = array_slice($data, 0, $max);

      return ["hours" => $data];
    }
    return NULL;
  }

}
