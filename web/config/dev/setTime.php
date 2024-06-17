<?php

// Run the autoloader so we get everything wired up
require_once "../vendor/autoload.php";

use SlopeIt\ClockMock\ClockMock;

$qs = [];
parse_str($_SERVER["QUERY_STRING"], $qs);

if (strlen($qs["time"]) > 0) {
    // If we have a time string, try to freeze the clock with it.
    try {
        ClockMock::freeze(new \DateTime($qs["time"]));
    } catch (\Throwable $e) {
        // If that fails for some reason, print the plaintext exception and
        // bail out. This should help with debugging this particular behavior.
        header("Content-type: text/plain");
        http_response_code(404);
        print_r($e);
        throw $e;
    }
}

uopz_allow_exit(true);
