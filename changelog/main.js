const main = async () => {
  const releases = await fetch(
    "https://api.github.com/repos/weather-gov/weather.gov/releases",
  ).then((r) => r.json());

  const latest = releases[0];
  document.querySelector("h1").innerText += ` [${latest.name}]`;

  const after = new Date(Date.parse(latest.published_at));

  const pulls = [];
  let prPage =
    "https://api.github.com/repos/weather-gov/weather.gov/pulls?state=closed&sort=updated&direction=desc";
  while (prPage) {
    const [page, link] = await fetch(prPage).then(async (r) => [
      await r.json(),
      r.headers.get("link"),
    ]);
    prPage = null;

    const newPulls = page.filter(({ merged_at }) => {
      if (merged_at) {
        const merged = new Date(Date.parse(merged_at));
        return merged > after;
      }
      return false;
    });

    pulls.push(...newPulls);

    if (newPulls.length > 0 && link) {
      const [, url] = link.match("^<([^>]+)>");
      prPage = url;
    }
  }

  const ul = document.createElement("ul");
  for (const pull of pulls) {
    const li = document.createElement("li");
    li.innerHTML = `<a href="${pull.url}">#${pull.number}</a> - ${pull.title}`;
    ul.append(li);
  }

  document.querySelector("main").append(ul);
  console.log(pulls);

  document.getElementById("wait").remove();
};
main();
