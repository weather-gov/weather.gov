<?php

require_once "../vendor/autoload.php";

use SebastianBergmann\CodeCoverage\Filter;
use SebastianBergmann\CodeCoverage\Driver\Selector;
use SebastianBergmann\CodeCoverage\CodeCoverage;

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

$weathergov_coverage_collector = new CodeCoverage(
    (new Selector())->forLineCoverage($weathergov_coverage_filter),
    $weathergov_coverage_filter,
);

$weathergov_coverage_collector->start($_SERVER["REQUEST_URI"]);

function weathergov_coverage_save()
{
    global $weathergov_coverage_collector;

    $data = $weathergov_coverage_collector->stop();

    $savePath = "/coverage/" . bin2hex(random_bytes(16)) . ".cov";

    file_put_contents($savePath, serialize($data));
}

register_shutdown_function("weathergov_coverage_save");
