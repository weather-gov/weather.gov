<?php

namespace Drupal\weather_routes\Controller;

use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\HttpFoundation\Response;

/**
 * Controller routines for securitytxt routes.
 */
class SecuritytxtController extends ControllerBase
{
    /**
     * Format the file content.
     *
     * @return \Symfony\Component\HttpFoundation\Response
     *   The security.txt file as a response object with a content type of
     *   'text/plain'.
     */
    public function securitytxtFile()
    {
        $content =
            "Contact: DOC@ResponsibleDisclosure.com\nExpires: 2028-03-27T17:00:00.000Z\n";
        $content .=
            "Policy: https://www.commerce.gov/vulnerability-disclosure-policy\n";
        $content .=
            "Form: https://doc.responsibledisclosure.com/hc/en-us/requests/new";
        $response = new Response($content, 200, [
            "Content-Type" => "text/plain",
        ]);

        return $response;
    }
}
