<?php

namespace Drupal\weather_login;

use Drupal\Core\Access\AccessResult;
use Drupal\Core\Session\AccountInterface;

/**
 * User Route Access.
 */
class UserRouteAccess
{
    /**
     * Callback for access check.
     */
    public function checkAccess(AccountInterface $account)
    {
        $config = \Drupal::config('weather_login.settings');
        $loginPath = $config->get('sso_login_path');

        $forceLocalForm = \Drupal::state()->get('weather_login_local_form', 0);

        if ($loginPath && !$forceLocalForm) {
            return AccessResult::forbidden();
        }

        return AccessResult::allowed();
    }
}
