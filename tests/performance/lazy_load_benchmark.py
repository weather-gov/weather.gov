"""
Lazy Load Forecast Benchmark Script

This script measures the Time To First Byte (TTFB) for specific point locations to evaluate
the initial rendering performance of the Django backend. It compares synchronous vs asynchronous
(lazy) loading of the forecast page.

Usage:
  # Run inside the Django web container
  docker compose exec web python tests/performance/lazy_load_benchmark.py
"""

import time
import requests
import sys

def measure(url):
    start = time.time()
    try:
        r = requests.get(url, timeout=60)
        ttfb = time.time() - start
        print(f"URL: {url}")
        print(f"Status: {r.status_code}")
        print(f"TTFB: {ttfb:.2f}s")
        print("-" * 40)
    except Exception as e:
        print(f"Error for {url}: {e}")

if __name__ == "__main__":
    print("Starting Lazy Load Benchmark...")
    print("=" * 40)
    
    # Example locations
    locations = [
        "http://localhost:8080/point/46.009/-87.870/",
        "http://localhost:8080/point/39.739/-104.984/"
    ]
    
    for url in locations:
        measure(url)
