<?php

namespace Drupal\content_api\controllers;

use Drupal\Core\Controller\ControllerBase;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;

class ContentAPI extends ControllerBase {
  public function get() {
    $terms = \Drupal::entityTypeManager()->getStorage("taxonomy_term")->loadTree("test");
    return new JsonResponse(
      (object)[ 'hello' => 'world', 'now' => (int)(microtime(true) * 1000), 'terms' => $terms ]
    );
  }
}
