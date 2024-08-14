<?php

namespace Drupal\weather_data\Service;

use Drupal\weather_data\Service\ParsingUtility;

class AFDParserOld
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

    
    public function __construct(string $source)
    {
        $this->source = $source;
    }

    public function parse()
    {
        $this->parsedNodes = [];
        
        // Strategy: split the string up into contiguous chunks
        // of text ("paragraphs") separated by double newlines.
        // Attempt to find matches in each chunk, and output
        // corresponding nodes.
        $paragraphs = explode("\n\n", $this->source);
        $paragraphs = $this->scrubParagraphs($paragraphs);

        // The offset is the number of paragraphs to 'skip'
        // when parsing actual paragraph content, ie, if we
        // find any preamble paragraphs, we increment this
        // value
        $offset = 0;

        // First attempt to extract any code section.
        // So far we've always noticed that there is one
        // And that it's the first part of the product
        $preambleCode = $this->parsePreambleCodes($paragraphs[0]);
        if($preambleCode){
            $offset += 1;
            $this->appendNodes($preambleCode);
        }

        // Next, attempt to extract the forecast office title
        // and information. This typically comes after the preamble codes
        // and should be in the second paragraph.
        $preambleWFO = $this->parsePreambleWFOInfo($paragraphs[$offset]);
        if($preambleWFO){
            $offset += 1;
            $this->appendNodes($preambleWFO);
        }

        // Finally, parse out nodes for each of the paragraphs.
        // If we cannot parse a given paragraph, simply dump the
        // string into a generic text node.
        foreach(array_slice($paragraphs, $offset) as $paragraph){
            $parsedParagraph = $this->parseParagraph($paragraph);
            if($parsedParagraph){
                $this->appendNodes($parsedParagraph);
            } else if($paragraph != "") {
                $this->appendNode([
                    "type" => "text",
                    "content" => $paragraph
                ]);
            }
        }

        return $this->parsedNodes;
    }

    public function scrubParagraphs(array $paragraphs)
    {
        // Remove any paragraphs that contain "&&" or "$$"
        return array_filter(
            $paragraphs,
            function($paragraph){
              return trim($paragraph) != "&&" && trim($paragraph) != '$$';
            }
        );
    }

    public function getPreambleNodes()
    {
        return array_filter(
            $this->parsedNodes,
            function($node){
                return str_starts_with($node['type'], 'preamble');
            }                
        );
    }

    public function getBodyNodes()
    {
        return array_filter(
            $this->parsedNodes,
            function($node){
                return !str_starts_with($node['type'], 'preamble');
            }
        );
    }

    /**
     * Parse out the administrative codes that usually
     * come at the beginning of an AFD product
     */
    public function parsePreambleCodes(string $str)
    {
        $regex = "/^(?<preambleCodes>000\s.+.*)$/sm";
        if(preg_match($regex, $str, $matches)){
            $codeSections = explode("\n", $matches['preambleCodes']);
            $lastIdx = count($codeSections) - 1;
            $first = $codeSections[0];
            $last = $codeSections[$lastIdx];
            $middle = array_slice($codeSections, 1, $lastIdx - 1);

            return [
                [
                    "type" => "preambleCode",
                    "content" => $first
                ],
                [
                    "type" => "preambleCode",
                    "content" => implode(" ", $middle)
                ],
                [
                    "type" => "preambleCode",
                    "content" => $last
                ]
            ];
        }

        return null;
    }

    /**
     * Parse out the WFO title and information
     * that comes at the top of AFD reports
     */
    public function parsePreambleWFOInfo(string $str)
    {
        // If it starts with the beginning of an AFD header,
        // we know this isn't a valid preamble section
        if(str_starts_with($str, ".")){
            return false;
        }

        $lines = explode("\n", $str);
        return array_map(
            function($line){
                return [
                    "type" => "preambleText",
                    "content" => $line
                ];
            },
            $lines
        );
    }

    public function parseParagraph(string $str)
    {
        $result = [];
        $currentString = $str;

        // See if this paragraph is or contains a secondary header
        $subheaderRegex = "/^\s*\.{3}(?<secondary>[^\.]+)\.{3}/U";
        if(preg_match($subheaderRegex, $str, $matches)){
            $currentString = preg_replace($subheaderRegex, "", $currentString);
            array_push($result, [
                "type" => "subheader",
                "content" => $matches["secondary"]
            ]);
        }

        // See if this paragraph contains a top level header
        $headerRegex = "/^\.(?<header>[^\.]+)[\.]{3}?(?<after>.*)\n/mU";
        if(preg_match($headerRegex, $currentString, $matches)){
            $header = $matches['header'];
            $postHeader = $matches['after'] ?? null;
            array_push($result, [
                "type" => "header",
                "content" => $header,
                "postHeader" => $postHeader
            ]);
        }
        $rest = preg_replace($headerRegex, "", $currentString);
        $rest = preg_replace("/\n/", " ", $rest);
        $rest = ParsingUtility::normalizeSpaces($rest);
        $rest = trim($rest);
        if($rest != ""){
            array_push($result, [
                "type" => "text",
                "content" => $rest
            ]);
        }

        return $result;
    }

    public function getStructureForTwig()
    {
        $preambleNodes = $this->getPreambleNodes();
        $body = $this->getBodyNodes();
        $preambleCode = [];
        $preambleText = [];
        foreach($preambleNodes as $node){
            if($node['type'] == 'preambleCode'){
                array_push($preambleCode, $node);
            } else {
                array_push($preambleText, $node);
            }
        }

        return [
            'preamble' => [
                'code' => $preambleCode,
                'text' => $preambleText
            ],
            'body' => $body
        ];
    }

    private function appendNode($node)
    {
        return array_push($this->parsedNodes, $node);
    }

    private function appendNodes($nodeArray)
    {
        foreach($nodeArray as $node){
            $this->appendNode($node);
        }
    }
}
