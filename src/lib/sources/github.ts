interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  html_url: string;
}

interface RepoActivity {
  repo: string;
  commits: { message: string; sha: string; date: string; url: string }[];
}

export async function fetchTodayActivity(): Promise<{
  date: string;
  repos: RepoActivity[];
  summary: string;
}> {
  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_USERNAME;
  if (!token || !username) throw new Error("GitHub not configured");

  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" };

  // Get repos pushed today (or recently)
  const today = new Date().toISOString().slice(0, 10);
  const reposRes = await fetch(
    `https://api.github.com/user/repos?per_page=30&sort=pushed`,
    { headers },
  );
  if (!reposRes.ok) throw new Error(`GitHub API error: ${reposRes.status}`);

  const repos = (await reposRes.json()) as { full_name: string; pushed_at: string }[];
  const todayRepos = repos.filter((r) => r.pushed_at?.startsWith(today));

  const repoActivities: RepoActivity[] = [];

  for (const repo of todayRepos.slice(0, 5)) {
    const commitsRes = await fetch(
      `https://api.github.com/repos/${repo.full_name}/commits?since=${today}T00:00:00Z&per_page=20`,
      { headers },
    );
    if (!commitsRes.ok) continue;

    const commits = (await commitsRes.json()) as GitHubCommit[];
    const userCommits = commits.filter(
      (c) => c.commit.author.name?.toLowerCase().includes(username.toLowerCase()),
    );

    if (userCommits.length > 0) {
      repoActivities.push({
        repo: repo.full_name,
        commits: userCommits.map((c) => ({
          message: c.commit.message.split("\n")[0],
          sha: c.sha.slice(0, 7),
          date: c.commit.author.date,
          url: c.html_url,
        })),
      });
    }
  }

  const totalCommits = repoActivities.reduce((sum, r) => sum + r.commits.length, 0);
  const summary = repoActivities.length > 0
    ? `${totalCommits} commits across ${repoActivities.length} repos: ${repoActivities.map((r) => r.repo.split("/")[1]).join(", ")}`
    : "No activity today yet";

  return { date: today, repos: repoActivities, summary };
}
