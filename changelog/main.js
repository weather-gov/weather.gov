const main = async () => {
  const main = document.querySelector("main");
  const releases = await fetch(
    "https://api.github.com/repos/weather-gov/weather.gov/releases",
  ).then((r) => r.json());

  const latest = releases[0];
  document.querySelector("h1").innerText += ` [${latest.name}]`;

  const after = new Date(Date.parse(latest.published_at));

  const issues = [];
  let issuesPage = `https://api.github.com/repos/weather-gov/weather.gov/issues?state=closed&since=${after.toISOString()}&sort=updated&direction=desc&per_page=100`;
  while (issuesPage) {
    const [page, link] = await fetch(issuesPage).then(async (r) => [
      await r.json(),
      r.headers.get("link"),
    ]);
    issuesPage = null;

    const newIssues = page.filter(({ closed_at }) => {
      if (closed_at) {
        const closed = new Date(Date.parse(closed_at));
        return closed > after;
      }
      return false;
    });

    issues.push(...newIssues);

    if (newIssues.length > 0 && link) {
      const [, url] = link.match("^<([^>]+)>");
      issuesPage = url;
    }
  }

  const issueList = document.createElement("ul");
  for (const issue of issues) {
    const li = document.createElement("li");
    li.innerHTML = `<a href="https://github.com/weather-gov/weather.gov/issue/${issue.number}">#${issue.number}</a> - ${issue.title}`;
    issueList.append(li);
  }

  const issueHeading = document.createElement("h2");
  issueHeading.innerText = "issues closed";
  main.append(issueHeading);
  main.append(issueList);

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

  const pullRequestList = document.createElement("ul");
  for (const pull of pulls) {
    const li = document.createElement("li");
    li.innerHTML = `<a href="https://github.com/weather-gov/weather.gov/pull/${pull.number}">#${pull.number}</a> - ${pull.title}`;
    pullRequestList.append(li);
  }

  const prHeading = document.createElement("h2");
  prHeading.innerText = "pull requests merged";
  main.append(prHeading);
  main.append(pullRequestList);

  document.getElementById("wait").remove();
};
main();
