<?php

namespace Drupal\weather_data\Service;

use Drupal\weather_data\Service\ParsingUtility;

/**
 * AFD Parser Class
 * ==========================
 * This class handles all the parsing of raw
 * AFD text products, as they are given to us via
 * the NWS API.
 *
 * You can find out _some_ of the structure of the
 * AFD product in the following document:
 *    https://www.weather.gov/media/directives/010_pdfs/pd01005003curr.pdf
 *
 * # Summary of structure
 * The AFD is divided into the following sections:
 * 1. Codes and description (we call this the "preamble").
 *   These lines appear before the first AFD header
 * 2. The main body (we call this the body).
 *   These lines are made up of a combination of headers,
 *   text paragraphs, and optionally sub-headers.
 *   Headers are lines that begin with a . and contain
 *   uppercase labels, with optional ellipses and post-header
 *   text.
 *   Subheaders are lines whose text is surrounded on both
 *   ends by ellipses
 *   NOTE: Header sections are generally separated at the end by
 *   a line with just "&&", but we do not use those in this parser.
 * 3. Everything else (we call this the "epilogue").
 *   The main part of the body ends with "$$". There is sometimes
 *   extra text after this point, usually authorship attribution.
 *
 * # Parsing strategy
 * The general idea is to split the text up into "paragraphs,"
 * defined as any contiguous chunks of text separated by _two_
 * newlines.
 *
 * We then attempt to parse out headers, subheaders, and guess at the
 * structure of the subsequent body text.
 *
 * The parser will set a kind of mode called currentContentType when
 * it encounters a type of paragraph based on an encountered header
 * type/name or other indicator token. Currently we have the following types:
 * - preamble (the initial setting / default)
 * - wwa (Watches/Warnings/Advisories header content)
 * - generic (All other header-type content)
 * - epilogue (the epilogue content)
 *
 * # Output
 * Like our other parsers, the expected output of the overall `parse()`
 * method is an array of "nodes" (associative arrays with a type property).
 * These nodes are then given to Teig to render based on their type and
 * other attributes.
 *
 * This parser contains an additional helper method that structures
 * the nodes into separate sections, to make rendering in Twig more
 * logical. */
class AFDParser
{
    /**
     * The input AFD source string
     *
     * @var source
     */
    private $source;

    /**
     * The compiled parse tree (array of nodes)
     *
     * @var parsedNodes
     */
    private $parsedNodes;

    /**
     * The type of content being parsed
     *
     * This will be swtiched based on the
     * most recently parsed heading
     * @var currentContentType
     */
    private $currentContentType = "preamble";

    /**
     * The number of preamble paragraphs parsed
     * so far.
     */
    private $preambleCount = 0;

    public function __construct(string $source)
    {
        $this->source = $source;
    }

    /**
     * Using the internal source string captured
     * at construction time, this main method
     * will return an array of "nodes" --
     * associative arrays with a type --
     * that can be used by Twig
     */
    public function parse()
    {
        $this->parsedNodes = [];

        // Strategy: split the string up into contiguous chunks
        // of text ("paragraphs") separated by double newlines.
        // Attempt to find matches in each chunk, and output
        // corresponding nodes.
        $paragraphs = explode("\n\n", $this->source);
        $paragraphs = $this->scrubParagraphs($paragraphs);

        // Parse out nodes for each of the paragraphs.
        // If we cannot parse a given paragraph, simply dump the
        // string into a generic text node.
        foreach ($paragraphs as $paragraph) {
            $parsedParagraph = $this->parseParagraph($paragraph);
            if ($parsedParagraph) {
                $this->appendNodes($parsedParagraph);
            }
        }

        return $this->parsedNodes;
    }

    /**
     * Main content parsing method.
     * Take a single paragraph as a string
     * and attempt to parse any nodes out of it.
     * Also change currentContentType when certain
     * headers and/or tokens are encountered.
     * Returns an array of nodes
     */
    public function parseParagraph(string $str)
    {
        $result = [];
        $currentString = $str;

        // See if this paragraph is or contains a secondary header
        $subheaderRegex = "/^\s*\.{3}(?<secondary>[^\.]+)\.{3}/U";
        if (preg_match($subheaderRegex, $str, $matches)) {
            $currentString = preg_replace($subheaderRegex, "", $currentString);
            array_push($result, [
                "type" => "subheader",
                "content" => $matches["secondary"],
            ]);
        }

        // See if this paragraph contains a top level header
        $headerRegex = "/^\.(?<header>[^\.]+)[\.]{3}?(?<after>.*)(\n|$)/mU";
        if (preg_match($headerRegex, $currentString, $matches)) {
            $header = $matches["header"];
            $this->updateCurrentContentType($header);
            $postHeader = $matches["after"] ?? null;
            array_push($result, [
                "type" => "header",
                "content" => $header,
                "postHeader" => $postHeader,
            ]);
            $currentString = preg_replace($headerRegex, "", $currentString);
        }

        // See if this paragraph contains the end of the body
        // characters, '$$'
        $endOfBodyRegex = "/^\s*(?<eob>[$]{2})\s*/m";
        if (preg_match($endOfBodyRegex, $currentString, $match)) {
            $symbol = $match["eob"];
            $this->updateCurrentContentType($symbol);
            $currentString = preg_replace($endOfBodyRegex, "", $currentString);
        }

        // Parse the rest of the paragraph content with
        // rules based on the parser's current set
        // contentType.
        // For example, if the content type is 'wwa',
        // then we treat newlines differently than if
        // it is 'generic'
        if ($this->currentContentType == "preamble") {
            $this->parsePreambleContent($currentString, $result);
        } elseif ($this->currentContentType == "wwa") {
            $this->parseWWAContent($currentString, $result);
        } elseif ($this->currentContentType == "temps-table"){
            $this->parseTempsTableContent($currentString, $result);
        } elseif ($this->currentContentType == "epilogue") {
            $this->parseEpilogueContent($currentString, $result);
        } else {
            $this->parseGenericContent($currentString, $result);
        }

        return $result;
    }

    /**
     * Parse the "preamble" (before the first header)
     * content into the appropriate node types.
     * Typically, the first paragraph will contain
     * document codes, and the second will contain
     * WFO info text
     */
    public function parsePreambleContent(string $str, array &$result)
    {
        $nodeType = $this->preambleCount > 0 ? "preambleText" : "preambleCode";
        $currentString = trim($str);
        if ($currentString != "") {
            array_push($result, [
                "type" => $nodeType,
                "content" => $currentString,
            ]);
        }
        $this->preambleCount += 1;
    }

    /**
     * Parse non-header paragraph text for the
     * 'generic' content type.
     */
    public function parseGenericContent(string $str, array &$result)
    {
        $str = preg_replace("/\n/", " ", $str);
        $str = ParsingUtility::normalizeSpaces($str);
        $str = trim($str);
        if ($str != "") {
            array_push($result, [
                "type" => "text",
                "content" => $str,
            ]);
        }
    }

    /**
     * Parse non-header paragraph text for
     * the Watches/Warnings/Advisories
     * ('wwa') contentType
     */
    public function parseWWAContent(string $str, array &$result)
    {
        // A newline followed by 4 spaces indentation
        // indicates line continuation. Replace with the empty
        // string, followed by a normal newline.
        $currentString = trim($str);
        if ($currentString != "") {
            array_push($result, [
                "type" => "text",
                "content" => $currentString,
            ]);
        }
    }

    public function parseTempsTableContent(string $str, array &$result)
    {
        if($str == ""){
            return;
        }

        
        $lines = explode("\n", $str);
        $rx = "/^[^\d]*(.+)/";
        $rows = [];
        foreach($lines as $line){
            $numbers = preg_split($rx, $line, 0, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY);
            $numbers = trim($numbers[0]);
            $numbers = preg_split("/\s+/", $numbers);
            $numbers = array_values(
                array_filter(
                    $numbers,
                    function($str){
                        return $str != "/";
                    }
                )
            );

            $placeRx = "/^(?<place>[^\d]+)/";
            $place = null;
            if(preg_match($placeRx, $line, $matches)){
                $place = trim($matches['place']);
            }

            array_push($rows, [
                "type" => "temps-table-row",
                "numbers" => $numbers,
                "name" => $place
            ]);
        }

        if(count($rows)){
            array_push($result, [
                "type" => "temps-table",
                "rows" => $rows
            ]);
        }
    }

    /**
     * Parse the incoming paragraph as Epilogue content.
     * The 'Epilogue' is all of the text that appears after
     * The $$ and before the EOF.
     * Usually, this section takes the form of authorship
     * attribution
     */
    public function parseEpilogueContent(string $str, array &$result)
    {
        $currentString = trim($str);
        // Remove all spacing from the ends
        // of each line
        $lines = explode("\n", $currentString);
        $lines = array_map(function ($line) {
            return trim($line);
        }, $lines);
        $currentString = implode("\n", $lines);
        if ($currentString != "") {
            array_push($result, [
                "type" => "epilogueText",
                "content" => $currentString,
            ]);
        }
    }

    public function getStructureForTwig()
    {
        $preambleNodes = $this->getPreambleNodes();
        $body = $this->getBodyNodes();
        $epilogueNodes = $this->getEpilogueNodes();
        $preambleCode = [];
        $preambleText = [];
        foreach ($preambleNodes as $node) {
            if ($node["type"] == "preambleCode") {
                array_push($preambleCode, $node);
            } else {
                array_push($preambleText, $node);
            }
        }

        return [
            "preamble" => [
                "code" => $preambleCode,
                "text" => $preambleText,
            ],
            "body" => $body,
            "epilogue" => $epilogueNodes,
        ];
    }

    /**
     * Given a valid HEADER string, update the private
     * currentContentType depending on what kind of
     * header it is.
     * The header types are specified in the formatting
     * document
     * NOTE: For now, we distinguish the following:
     * - preamble (the initial default)
     * - wwa (appearing under the watches/warnings/advisory)
     * - epilogue (everything after the final $$)
     * - generic (the catch-all for other paragraph types)
     */
    public function updateCurrentContentType(string $str)
    {
        $wwaRegex = "/^[A-Z]{3}\sWATCHES\/WARNINGS\/ADVISORIES\s*$/";
        $tempsTableRegex = "/TEMPS\/POPS$/";
        if (preg_match($wwaRegex, $str)) {
            $this->currentContentType = "wwa";
        } elseif (preg_match($tempsTableRegex, $str)){
            $this->currentContentType = "temps-table";
        } elseif ($str == '$$') {
            $this->currentContentType = "epilogue";
        } else {
            $this->currentContentType = "generic";
        }
    }

    public function scrubParagraphs(array $paragraphs)
    {
        // Remove any paragraphs that contain "&&" or "$$"
        return array_filter($paragraphs, function ($paragraph) {
            return trim($paragraph) != "&&";
        });
    }

    public function getPreambleNodes()
    {
        return array_filter($this->parsedNodes, function ($node) {
            return str_starts_with($node["type"], "preamble");
        });
    }

    public function getBodyNodes()
    {
        return array_filter($this->parsedNodes, function ($node) {
            $nodeType = $node["type"];
            $isPreamble = str_starts_with($nodeType, "preamble");
            $isEpilogue = str_starts_with($nodeType, "epilogue");
            return !$isPreamble && !$isEpilogue;
        });
    }

    public function getEpilogueNodes()
    {
        return array_filter($this->parsedNodes, function ($node) {
            return str_starts_with($node["type"], "epilogue");
        });
    }

    private function appendNode($node)
    {
        return array_push($this->parsedNodes, $node);
    }

    private function appendNodes($nodeArray)
    {
        foreach ($nodeArray as $node) {
            $this->appendNode($node);
        }
    }
}
