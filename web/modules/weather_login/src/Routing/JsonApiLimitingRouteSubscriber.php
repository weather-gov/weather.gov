<?php

namespace Drupal\weather_login\Routing;

use Drupal\Core\Routing\RouteSubscriberBase;
use Symfony\Component\Routing\RouteCollection;

class JsonApiLimitingRouteSubscriber extends RouteSubscriberBase {
    /**
     * {@inheritdoc}
     */
    protected function alterRoutes(RouteCollection $collection) {
        $mutable_types = $this->mutableResourceTypes();
        foreach ($collection as $name => $route) {
            $defaults = $route->getDefaults();
            if (!empty($defaults['_is_jsonapi'])) {
                $route->setRequirement('_role', 'uploader');
            }
        }
    }

    private function mutableResourceTypes(): array {
        return [
            'file--file' => TRUE,
            'node--wfo_pdf_upload' => TRUE,
        ];
    }
}
