<?php

namespace Drupal\weather_data\Service;

class ParsingUtility
{
    /**
     * Remove individual newline characters. Leave pairs. Pairs of
     * newlines are equivalent to paragraph breaks and we want to keep
     * those, but within a paragraph, we want to let the text break on
     * its own.
     */
    public static function removeSingleLineBreaks(string $str)
    {
        if ($str) {
            return preg_replace("/([^\n])\n([^\n])/m", "$1 $2", $str);
        }
        return $str;
    }

    /**
     * Split the incoming string by "paragraph" line breaks.
     * Optionally filter out elements that are empty strings.
     */
    public static function splitByParagraphs(
        string $str,
        bool $filterEmpty = true,
    ) {
        $paragraphs = preg_split("/\r\n|\n|\r/", $str);

        // Optionally remove any blank strings
        if ($filterEmpty) {
            $paragraphs = array_filter($paragraphs, function ($paragraph) {
                return $paragraph != "";
            });
        }

        return $paragraphs;
    }

    /**
     * Change all instances of multiple contiguous spaces into
     * a single space.
     */
    public static function normalizeSpaces(string $str)
    {
        return preg_replace("/(  +)|( $)/m", " ", $str);
    }
}
