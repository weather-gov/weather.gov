<?php

namespace Drupal\weather_data\Service;

class WeatherAlertParser {
  /**
   * The input description string
   *
   * @var descriptionString
   */
  private $descriptionString;

  public function __construct(
    string $descriptionString
  ){
    $this->descriptionString = $descriptionString;
  }

  public function parse()
  {
    $paragraphs = preg_split("/\r\n|\n|\r/", $this->descriptionString);
    // Remove blank strings
    $paragraphs = array_filter(
      $paragraphs,
      function($paragraph){
        return $paragraph != "";
      }
    );
    
    $parsedNodes = [];

    foreach($paragraphs as $paragraph){
      $parsedOverview = $this->parseOverview($paragraph, $parsedNodes);
      $parsedWhatWhereWhen = $this->parseWhatWhereWhen($paragraph, $parsedNodes);

      // If nothing was able to be parsed from the
      // paragraph, simply append a paragraph node
      // with the source as the text content
      if(!$parsedOverview && !$parsedWhatWhereWhen){
        array_push(
          $parsedNodes,
          [
            "type" => "paragraph",
            "text" => $paragraph
          ]
        );
      }
    }

    return $parsedNodes;
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
  public function parseOverview($str, &$nodes)
  {
    $regex = "/\.\.\.([A-Za-z\s]+)\.\.\./";
    if(preg_match($regex, $str, $matches)){
      array_push(
        $nodes,
        [
          "type" => "heading",
          "text" => $matches[0]
        ]
      );

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
  public function parseWhatWhereWhen($str, &$nodes)
  {
    $regex = "/^\*\s+(?<heading>[A-Za-z\s]+)\.\.\.(?<text>.*)$/";
    if(preg_match($regex, $str, $matches)){
      array_push(
        $nodes,
        [
          "type" => "heading",
          "text" => strtolower($matches["heading"])
        ]
      );
      array_push(
        $nodes,
        [
          "type" => "paragraph",
          "text" => $matches["text"]
        ]
      );

      return true;
    }

    return false;
  }
}
