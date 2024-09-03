<?php

namespace Drupal\weather_cms\Routing;

use Drupal\Core\Routing\RouteSubscriberBase;
use Symfony\Component\Routing\RouteCollection;

class JsonApiLimitingRouteSubscriber extends RouteSubscriberBase
{
    /**
     * {@inheritdoc}
     */
    protected function alterRoutes(RouteCollection $collection)
    {
        foreach ($collection as $name => $route) {
            $defaults = $route->getDefaults();
            if (!empty($defaults['_is_jsonapi'])) {
                $route->setRequirement('_role', 'uploader');
            }
        }
    }
}
