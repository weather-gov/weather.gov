import subprocess
import re

TEST_LOCATIONS = {
    "Anchorage_AK": "61.2181/-149.9003",
    "Miami_FL": "25.7617/-80.1918"
}

SERVERS = {
    "NodeJS Sever": 8082,
    "Golang Server": 8083
}

CONCURRENCY = 5
ITERATIONS = 20

def run_ab(port, lat_lon):
    url = f"http://localhost:{port}/point/{lat_lon}"
    cmd = ["ab", "-n", str(ITERATIONS), "-c", str(CONCURRENCY), url]
    out = subprocess.run(cmd, capture_output=True, text=True)
    
    if out.returncode != 0:
        return {"error": out.stderr}

    rps = re.search(r"Requests per second:\s+([\d.]+)", out.stdout)
    mean = re.search(r"Time per request:\s+([\d.]+)\s+\[ms\] \(mean\)", out.stdout)
    median = re.search(r"50%\s+(\d+)", out.stdout)
    p99 = re.search(r"99%\s+(\d+)", out.stdout)

    # In case ab doesn't output P99 when n=20, let's grab the max instead if p99 is missing
    if not p99:
        p99 = re.search(r"100%\s+(\d+)\s+\(longest", out.stdout)

    return {
        "rps": float(rps.group(1)) if rps else 0,
        "mean": float(mean.group(1)) if mean else 0,
        "median": float(median.group(1)) if median else 0,
        "p99": float(p99.group(1)) if p99 else 0
    }

def print_markdown(loc_name, node_res, go_res):
    print(f"### Load Testing Metrics - {loc_name.replace('_', ', ')}")
    print("_(Concurrency: 5 | Iterations: 20)_")
    print()
    print("| Metric | NodeJS Server (`8082`) | Golang Server (`8083`) | Improvement |")
    print("| :--- | :--- | :--- | :--- |")
    
    # RPS
    improvement_rps = go_res['rps'] / node_res['rps'] if node_res['rps'] > 0 else 0
    print(f"| **Requests Per Second (RPS)** | {node_res['rps']} req/sec | **{go_res['rps']} req/sec** | **{improvement_rps:.2f}x Faster** |")
    
    # Mean
    improvement_mean = ((node_res['mean'] - go_res['mean']) / node_res['mean']) * 100 if node_res['mean'] > 0 else 0
    print(f"| **Time per request (Mean)** | {node_res['mean']} ms | **{go_res['mean']} ms** | **{improvement_mean:.0f}% Reduction** |")

    # Median
    improvement_median = node_res['median'] / go_res['median'] if go_res['median'] > 0 else 0
    print(f"| **Median Latency (p50)** | {node_res['median']:.0f} ms | **{go_res['median']:.0f} ms** | **{improvement_median:.1f}x Faster** |")

    # P99
    improvement_p99 = ((node_res['p99'] - go_res['p99']) / node_res['p99']) * 100 if node_res['p99'] > 0 else 0
    print(f"| **P99 Tail Latency** | {node_res['p99']:.0f} ms | **{go_res['p99']:.0f} ms** | **{improvement_p99:.0f}% Reduction** |")
    print()


def main():
    for loc_name, loc_val in TEST_LOCATIONS.items():
        node_res = run_ab(SERVERS["NodeJS Sever"], loc_val)
        go_res = run_ab(SERVERS["Golang Server"], loc_val)
        print_markdown(loc_name, node_res, go_res)

if __name__ == "__main__":
    main()
