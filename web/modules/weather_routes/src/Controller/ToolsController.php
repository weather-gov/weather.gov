<?php

namespace Drupal\weather_routes\Controller;

use Drupal\node\Entity\Node;
use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Controller routines for securitytxt routes.
 */
class ToolsController extends ControllerBase
{
    /**
     * Format the file content.
     *
     * @return \Symfony\Component\HttpFoundation\Response
     *   The security.txt file as a response object with a content type of
     *   'text/plain'.
     */
    public function toolIndex($name)
    {
        $path = realpath(getcwd() . "/../tools/" . $name);
        if ($path === false) {
            throw new NotFoundHttpException();
        }

        $html = file_get_contents($path . "/index.html");
        $tags = \Drupal\Component\Utility\Xss::getAdminTagList();
        $balls = \Drupal\Component\Utility\Xss::filterAdmin($html);

        return [
            "content" => [
                "#type" => "markup",
                "#markup" => \Drupal\Core\Render\Markup::create($html),
            ],
        ];
    }

    public function toolFile($name, $file)
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

    public function toolSubFile($name, $dir, $file)
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
