<?php

namespace Drupal\weather_data\Service\Test;

use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\Database\Connection;
use Drupal\Core\StringTranslation\TranslationInterface;
use Drupal\weather_data\Service\WeatherDataService;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpFoundation\Request;

/**
 * Tests for the WeatherDataService getCurrentConditions method.
 */
abstract class Base extends TestCase
{
    /**
     * Mocked Drupal cache object.
     *
     * @var cacheMock
     */
    protected $cacheMock;

    /**
     * Mocked Drupal database connection.
     *
     * @var databaseMock;
     */
    protected $databaseMock;

    /**
     * History of HTTP calls made during a test.
     *
     * @var httpCallStack
     */
    protected $httpCallStack;

    /**
     * The mocked HTTP client.
     *
     * @var httpClientMock
     */
    protected $httpClientMock;

    /**
     * Mocked Drupal request object.
     *
     * @var requestMock
     */
    protected $requestMock;

    /**
     * WeatherDataService mock object, to be used as $self.
     *
     * @var selfMock
     */
    protected $selfMock;

    /**
     * The WeatherDataService object under test.
     *
     * @var weatherDataService
     */
    protected $weatherDataService;

    /**
     * Common setup for all component tests.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $this->httpCallStack = [];
        $history = Middleware::history($this->httpCallStack);

        $this->httpClientMock = new MockHandler([]);
        $stack = HandlerStack::create($this->httpClientMock);
        $stack->push($history);
        $client = new Client(["handler" => $stack]);

        // Just return the input string. The translation manager is tested by Drupal
        // so we don't need to.
        $translationManager = $this->createStub(TranslationInterface::class);
        $translationManager->method("translate")->will(
            $this->returnCallback(function ($str) {
                return $str;
            }),
        );

        $this->cacheMock = $this->createMock(CacheBackendInterface::class);
        $this->requestMock = $this->createStub(Request::class);
        $this->databaseMock = $this->createStub(Connection::class);
        $this->selfMock = $this->getMockBuilder(WeatherDataService::class)
            ->disableOriginalConstructor()
            ->getMock();

        // The WeatherDataService ingests this RequestStack service, but it
        // immediately uses it to get an instance of the current request and
        // saves the request object. So our mock should be prepped to supply
        // the current request object.
        $requestStack = $this->createStub(RequestStack::class);
        $requestStack
            ->method("getCurrentRequest")
            ->willReturn($this->requestMock);

        $this->weatherDataService = new WeatherDataService(
            $client,
            $translationManager,
            $requestStack,
            $this->cacheMock,
            $this->databaseMock,
        );
    }
}
