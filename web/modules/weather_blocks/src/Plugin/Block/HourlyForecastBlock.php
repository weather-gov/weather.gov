<?php

namespace Drupal\weather_blocks\Plugin\Block;

use Drupal\Core\Block\BlockBase;
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
class HourlyForecastBlock extends BlockBase {

  /**
   * {@inheritdoc}
   */
  public function blockForm($form, FormStateInterface $form_state) {
    $form = parent::blockForm($form, $form_state);
    $config = $this->getConfiguration();
    $max = $config["max_items"] ?? "4";

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
    $this->setConfigurationValue(
      "max_items",
      $form_state->getValue("max_items")
    );
  }

  /**
   * {@inheritdoc}
   */
  public function build() {
    $config = $this->getConfiguration();
    $max = $config["max_items"] ?? "4";

    return [
      '#theme' => "weather_blocks_hourly_forecast",
      '#data' => ['max_items' => $max],
    ];
  }

}
