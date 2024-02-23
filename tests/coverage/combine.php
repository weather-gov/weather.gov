<?php

require_once "../../vendor/autoload.php";

use SebastianBergmann\CodeCoverage\Filter;
use SebastianBergmann\CodeCoverage\Driver\Selector;
use SebastianBergmann\CodeCoverage\CodeCoverage;
use SebastianBergmann\CodeCoverage\Report\Clover;
use SebastianBergmann\CodeCoverage\Report\Html\Facade as HtmlReport;

$weathergov_coverage_filter = new Filter();

$paths = [
    "/opt/drupal/web/modules/weather_blocks",
    "/opt/drupal/web/modules/weather_data",
    "/opt/drupal/web/modules/weather_routes",
    "/opt/drupal/web/themes/new_weather_theme",
    "/opt/drupal/web/themes/weathergov_admin",
];
foreach ($paths as $path) {
    $files = glob(
        $path . "/{,*,*/*,*/*/*,*/*/*/*,*/*/*/*/*}/*.{module,php,theme}",
        \GLOB_BRACE,
    );
    $weathergov_coverage_filter->includeFiles($files);
}

$combined_coverage = new CodeCoverage(
    (new Selector())->forLineCoverage($weathergov_coverage_filter),
    $weathergov_coverage_filter,
);

foreach (glob("/coverage/*.cov") as $file) {
    $data = unserialize(file_get_contents($file));

    $file_coverage = new CodeCoverage(
        (new Selector())->forLineCoverage($weathergov_coverage_filter),
        $weathergov_coverage_filter,
    );
    $file_coverage->append($data, "end-to-end tests");

    $combined_coverage->merge($file_coverage);
}

// Incorporate coverage from unit tests
// $unit_coverage = require "unit-coverage.php";
// $combined_coverage->merge($unit_coverage);

(new HtmlReport())->process($combined_coverage, "/coverage");
(new Clover())->process($combined_coverage, "/coverage/coverage.xml");
