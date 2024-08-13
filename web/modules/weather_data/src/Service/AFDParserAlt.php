<?php

namespace Drupal\weather_data\Service;

use Drupal\weather_data\Service\ParsingUtility;
use Drupal\weather_data\Service\LineStream;

class AFDParserAlt {
    /**
     * The source input string
     */
    private $source;

    /**
     * The current parsed nodes
     */
    private $parsedNodes = null;

    /**
     * The current parser mode.
     * Distinguishes which type of content
     * is currently being parsed.
     */
    private $currentMode;

    /**
     * An instance of LineStream
     */
    public $stream;

    /**
     * Various regexes we will use
     */
    private $SECTION_END_RX = "/^\s*(\&\&)|(\$\$)\s*/$";
    private $HEADER_RX = "/^\.(?<header>[^\.]+)[\.]{3}?(?<after>.*)$/";
    private $SUBHEADER_RX = "/^\s*\.{3}(?<secondary>[^\.]+)\.{3}$/";
    private $BLANK_LINE_RX = "/^\s*\n+$/";
    
    public function __construct(string $source)
    {
        $this->source = $source;
        $this->stream = new LineStream($this->source);
    }

    public function parse()
    {
        // Parse up to the first header.
        // This gives us any potential preamble section
        $preambleLines = $this->stream->upToMatch(
            $this->HEADER_RX
        );
        $this->parsePreambleLines($preambleLines);

        // Now get the lines for each "section",
        // which will be delineated by the presence
        // of a valid header
        while(!$this->stream->atEnd()){
            $this->parseSectionLines(
                $this->stream->upToMatch($this->HEADER_RX)
            );
        }

        return $this->parsedNodes;
    }

    public function parsePreambleLines($lines)
    {
        $raw = implode("\n", $lines);
        $raw = trim($raw);

        // Split into the different paragraphs.
        // A "paragraph" here denotes sections of
        // text separated by two consecutive newlines
        $paragraphs = explode("\n\n", $raw);

        // If we have some other number of paragraphs
        // than 2, these are unspecified blocks of text
        // and we should return plain text nodes for them
        if(count($parargraphs) != 2){
            foreach($paragraphs as $paragraph){
                $this->appendNode([
                    "type" => "text",
                    "content" => $paragraph
                ]);
            }
            return;
        }

        // Otherwise, we assume the first paragraph to
        // be the codes and the second to be the WFO
        // and product description
        $codeLines = explode("\n", $paragraphs[0]);
        $lastIdx = count($codeLines) - 1;
        $middle = array_slice($codeLines, 1, $lastIdx - 1);
        $first = $codeLines[0];
        $last = $codeLines[$lastIdx];
        $this->appendNodes([
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
        ]);

        $textLines = explode("\n", $paragraphs[1]);
        foreach($textLines as $textLine){
            $this->appendNode([
                "type" => "preambleText",
                "content" => $textLine
            ]);
        }
    }

    public function parseSectionLines(array $lines)
    {
        if(!count($lines)){
            return;
        }

        $stream = new LineStream(implode("\n", $lines));

        // The first line should be the header
        $this->parseHeader(
            $stream->nextLine()
        );

        // Stream through the lines extracting any
        // subheaders along the way.
        // If a line matches the BLANK_LINE_RX,
        // it indicates a separate paragraph.
        $currentLines = [];
        while(!$stream->atEnd()){
            $line = $stream->nextLine();
            $isBlankLine = preg_match($this->BLANK_LINE_RX, $line);
            $isSectionEnd = preg_match($this->SECTION_END_RX, $line);
            $isSubHeader = preg_match($this->SUBHEADER_RX, $line);
            if($stream->atEnd() || $isBlankLine || $isSectionEnd){
                $this->parseCurrentParagraphLines($currentLines);
                $currentLines = [];
            } else if($isSubHeader){
                $this->parseCurrentParagraphLines($currentLines);
                $currentLines = [];
                $this->parseSubheader($line);
            } else {
                array_push($currentLines, $line);
            }
        }

        if(count($currentLines)){
            $this->parseCurrentParagraphLines($currentLines);
        }   
    }

    public function parseHeader(string $str)
    {
        $match = preg_match($this->HEADER_RX, $str);
        if($match){
            $this->appendNode([
                "type" => "header",
                "content" => $match['header'],
                "postHeader" => $match['after'] || null
            ]);
        }
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

    private function appendNodes(array $list)
    {
        foreach($list as $node){
            $this->appendNode($node);
        }
    }

    private function parseCurrentParagraphLines(array $lines){
        $text = implode("\n", $lines);
        $text = ParsingUtility::RemoveSingleLineBreaks($text);
        $this->appendNode([
            "type" => "text",
            "content" => $text
        ]);
    }
}
