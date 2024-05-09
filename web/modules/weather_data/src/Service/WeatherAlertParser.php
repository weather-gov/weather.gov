<?php

namespace Drupal\weather_data\Service;

class WeatherAlertParser
{
    /**
     * The input description string
     *
     * @var descriptionString
     */
    private $descriptionString;

    /**
     * The compiled parse tree (array of nodes)
     *
     * @var parsedNodes
     */
    private $parsedNodes;

    public static function fixupNewlines($str)
    {
        if ($str) {
            // Remove individual newline characters. Leave pairs. Pairs of
            // newlines are equivalent to paragraph breaks and we want to keep
            // those, but within a paragraph, we want to let the text break on
            // its own.
            return preg_replace("/([^\n])\n([^\n])/m", "$1 $2", $str);
        }
        return $str;
    }

    public function __construct(string $descriptionString)
    {
        $this->descriptionString = $descriptionString;
    }

    public function parse()
    {
        $cleanedDescriptionString = self::fixupNewlines(
            $this->descriptionString,
        );
        $paragraphs = preg_split("/\r\n|\n|\r/", $cleanedDescriptionString);
        // Remove blank strings
        $paragraphs = array_filter($paragraphs, function ($paragraph) {
            return $paragraph != "";
        });

        $this->parsedNodes = [];

        foreach ($paragraphs as $paragraph) {
            $parsedOverview = $this->parseOverview($paragraph);
            $parsedWhatWhereWhen = $this->parseWhatWhereWhen($paragraph);

            // If nothing was able to be parsed from the
            // paragraph, simply append a paragraph node
            // with the source as the text content
            if (!$parsedOverview && !$parsedWhatWhereWhen) {
                array_push($this->parsedNodes, [
                    "type" => "paragraph",
                    "nodes" => $this->getParagraphNodesForString($paragraph),
                ]);
            }
        }

        return $this->parsedNodes;
    }

    /**
     * Attempt to parse any "overview" header from
     * the incoming paragraph.
     *
     * An "overview" is described as an all-caps
     * line both beginning with and ending with ellipses
     *
     * If a match is found, push a node to the end
     * of the parsed nodes array, and return true.
     * Return false otherwise.
     *
     */
    public function parseOverview($str)
    {
        $regex = "/^\.\.\.([^\.]+)\.\.\.$/";
        if (preg_match($regex, $str, $matches)) {
            array_push($this->parsedNodes, [
                "type" => "paragraph",
                "nodes" => $this->getParagraphNodesForString($matches[1]),
            ]);

            return true;
        }

        return false;
    }

    /**
     * Attempt to parse the header and paragraph text
     * for a "What/Where/When" pattern. This pattern
     * is used by a subset of alert descriptions to
     * provide additional context and details. Each
     * "header" in the pattern is preceded by an
     * asterisk, then an all-caps label, followed by
     * ellipses, and then the rest of the text.
     *
     * Append appropriate parsed nodes to the end of
     * the nodes array if matched and return true.
     * Otherwise, return false.
     */
    public function parseWhatWhereWhen($str)
    {
        $regex = "/^\*\s+(?<heading>[A-Z\s]+)\.\.\.(?<text>.*)$/";
        if (preg_match($regex, $str, $matches)) {
            array_push($this->parsedNodes, [
                "type" => "heading",
                "text" => strtolower($matches["heading"]),
            ]);
            array_push($this->parsedNodes, [
                "type" => "paragraph",
                "nodes" => $this->getParagraphNodesForString($matches["text"]),
            ]);

            return true;
        }

        return false;
    }

    /**
     * Given a string that will be parsed into a paragraph
     * node, determine if there are any valid links within it and,
     * if so, responds with ordered text and link subnodes
     */
    public function getParagraphNodesForString($str)
    {
        $links = $this->extractURLs($str);
        if (!$links) {
            return [
                [
                    "type" => "text",
                    "content" => $str,
                ],
            ];
        }

        $nodes = [];
        $current = $str;
        foreach ($links as $link) {
            $pos = strpos($current, $link["url"]);
            $paraText = substr($current, 0, $pos);
            array_push(
                $nodes,
                [
                    "type" => "text",
                    "content" => $paraText,
                ],
                $link,
            );
            $current = substr($current, $pos + strlen($link["url"]));
        }

        if ($current && $current != "") {
            array_push($nodes, [
                "type" => "text",
                "content" => $current,
            ]);
        }

        return array_values($nodes);
    }

    /**
     * Attemps to parse out any valid URLs in the provided
     * text body.
     * Responds with a list of parsed objects if any are found,
     * or false if none are found.
     */
    public function extractURLs($str)
    {
        $regex = "/https\:\/\/[A-Za-z0-9\-._~:\/\?#\[\]@!$]+\b/";
        if (preg_match_all($regex, $str, $matches, PREG_OFFSET_CAPTURE)) {
            $valid = array_filter($matches[0], function ($urlString) {
                $url = parse_url($urlString[0]);
                if (array_key_exists("user", $url)) {
                    return false;
                } elseif (array_key_exists("pass", $url)) {
                    return false;
                } elseif (!str_ends_with($url["host"], ".gov")) {
                    return false;
                }
                return true;
            });

            if (count($valid) == 0) {
                return false;
            }

            // Each link should be an assoc array
            // with the URL along with data about
            // whether it's internal or external
            return array_map(function ($url) {
                $parsedUrl = parse_url($url[0]);
                $isInternal = str_contains($parsedUrl["host"], "weather.gov");
                return [
                    "type" => "link",
                    "url" => $url[0],
                    "external" => !$isInternal,
                ];
            }, array_values($valid));
        }
        return false;
    }
}
