<?php

namespace Drupal\weather_login\RouteSubscriber;

use Drupal\Core\Routing\RouteSubscriberBase;
use Symfony\Component\Routing\RouteCollection;

/**
 * User login route subscriber.
 */
class UserLoginRouteSubscriber extends RouteSubscriberBase {

  /**
   * {@inheritDoc}
   */
  protected function alterRoutes(RouteCollection $collection) {
    if ($route = $collection->get('user.pass')) {
      $route->setRequirement('_custom_access', 'Drupal\weather_login\UserRouteAccess::checkAccess');
    }
  }

}