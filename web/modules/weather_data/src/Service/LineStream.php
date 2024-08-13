<?php

namespace Drupal\weather_data\Service;

use Drupal\weather_data\Service\ParsingUtility;

class LineStream {
    /**
     * An array of lines of text
     */
    public $lines = [];

    /**
     * The current position/index of the
     * stream.
     * This is an index into the lines
     */
    public $position = 0;

    public function __construct(string $str)
    {
        $this->lines = explode("\n", $str);
    }

    public function nextLine()
    {
        $next = $this->next(1);
        if($next && count($next)){
            return $next[0];
        }
        return null;
    }

    public function next(int $num = 1)
    {
        $result = $this->peek($num);
        if(!$result){
            return null;
        }

        // If the increment amount would put us
        // past the end of the list, set the position
        // to just be the end of the list
        $this->position = $this->position + $num;
        if($this->position > count($this->lines)){
            $this->position = count($this->lines);
        }

        return $result;
    }

    public function peek(int $num = 1)
    {
        if($this->position >= count($this->lines)){
            return null;
        }

        return array_slice($this->lines, $this->position, $num);
    }

    public function peekBack(int $num = 1)
    {
        if($this->position <= 0){
            return null;
        }

        $offset = $this->position - $num;
        return array_slice(
            $this->lines,
            $offset,
            $this->position
        );
    }

    public function back(int $num = 1)
    {
        $result = $this->peekBack($num);
        if(!$result){
            return null;
        }

        $this->position = $this->position - $num;
        if($this->position < 0){
            $this->position = 0;
        }
    }

    public function upToMatch(string $regex, string $flags="")
    {
        $result = [];
        $currentLine = $this->nextLine();
        $match = preg_match($regex . $flags, $currentLine);
        while($currentLine){
            if($match){
                break;
            }
            array_push($result, $currentLine);
        }

        return $result;
    }

    public function upToAndIncludingMatch(string $regex, string $flags="")
    {
        $result = $this->upToMatch($regex, $flags);
        return array_push(
            $result,
            $this->peekBack()
        );
    }

    public function atEnd()
    {
        return $this->position >= count($this->lines);
    }
}
