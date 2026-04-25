async function testProxy() {
  try {
    const res = await fetch("http://api-interop-layer:8082/products/afd/versions");
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body length:", text.length, "starts with:", text.slice(0, 100));
  } catch (err) {
    console.error("Failed to hit proxy", err);
  }
}
testProxy();
