import path from "path";
import ora from "ora";
import inquirer from "inquirer";
import { $, execa } from "execa";
import minimist from "minimist";
import "colors";
import { findGithubRepos } from "./findRepos.js";
import logUpdate from "log-update";
const HOME_DIR = process.env.HOME || process.env.USERPROFILE;
import "isomorphic-fetch";
import PressToContinuePrompt from "inquirer-press-to-continue";

let HELP = `
${"Usage:".bold.white} backup_all_repos [options]

${"Options:".bold.white}
    ${"--help".bold.white}               ${`Show this message`.italic.dim}
    ${"--username".bold.white}           ${`Username (skips API check for username if provided)`.italic.dim
}
    ${"--email".bold.white}              ${`Email address (used instead of "git config --get user.email" if provided)`
        .italic.dim
}
    ${"--dir".bold.white}                ${`Directory to backup to (defaults to ${HOME_DIR.bold.white.reset}${")".italic.dim
        }`.italic.dim
}
    ${"--no-exclude".bold.white}         ${`Don't exclude folders such as ~/Library, ~/.cache, .git, etc.`.italic.dim
}
    ${"--find-orphans".bold.white}       ${`Find any repos that don't have a remote URL.`.italic.dim
}
    ${"--output".bold.white}             ${`Give the output in JSON, plain text or readable format. (json|plain|readable).`
        .italic.dim
}
    ${"--mine-only".bold.white}          ${`Only show repos owned by me`.italic.dim
}
    ${"--not-mine".bold.white}           ${`Only show repos NOT owned by me`.italic.dim
}
    ${"--omit-submodules".bold.white}    ${`Don't search for submodules in repos`.italic.dim
}
    ${"--all".bold.white}                ${`Just list all repos found`.italic.dim
}
    ${"--quiet".bold.white}              ${`Don't log anything except the output`.italic.dim
}

${`Give it a ⭐️ on GitHub if you want!`.yellow}${" - ".dim}${"@Explosion-Scratch/gitty".bold.blue
}
`.trim();

inquirer.registerPrompt("press-to-continue", PressToContinuePrompt);
async function backupRepo(repo) {
    try {
        process.chdir(repo);
        await execa("git", ["stage", "."]);
        await execa("git", ["commit", "-m", `Backup ${new Date().toString()}`]);
        await execa("git", ["push"]);
        return true;
    } catch (error) {
        return false;
    }
}

async function main() {
    try {
        const args = minimist(process.argv.slice(2));
      const recognizedOptions = [
          "exclude",
          "dir",
          "username",
          "email",
          "help",
          "find-orphans",
          "output",
          "not-mine",
          "mine-only",
          "omit-submodules",
          "all",
          "quiet",
      ];
      if (args.help === true) {
          log(HELP);
          process.exit(0);
      }
      if (args["quiet"]) {
          HELP = "";
      }
      delete args["_"];
      if (!Object.keys(args).every((i) => recognizedOptions.includes(i))) {
          error(
              `Unrecognized option ${Object.keys(args)
                  .filter((i) => !recognizedOptions.includes(i))
                  .map((i) => `--${i}=${JSON.stringify(args[i])}`)
                  .join(", ")}`
      );
    }
      if (args["omit-submodules"] && args["omit-submodules"] != false) {
          args["submodules"] = false;
      } else {
          args["submodules"] = true;
      }
      if (
          args.output &&
          !(
              args["find-orphans"] ||
              args["mine-only"] ||
              args["not-mine"] ||
              args["all"]
          )
    ) {
        error(
            `Output cannot be used without specifying one of --find-orphans, --mine-only, --not-mine or --all`
      );
      }
      if (!args.output) {
          args.output = "readable";
      }
      if (!["plain", "json", "readable"].includes(args.output)) {
          error(`Output format must be one of 'json', 'plain', or 'readable'`);
      }
      if (args.exclude === undefined) {
          args.exclude = true;
      }
      const stdout = args.username
          ? null
          : args.email
              ? args.email
              : await execa("git", ["config", "--get", "user.email"]);
      if (!stdout?.stdout && !args.username) {
          error(`No email found`);
      }
      const email = stdout?.stdout;
      const username =
          args.username ||
          (await fetch(
              `https://api.github.com/search/users?q=${encodeURIComponent(email)}`
          )
              .then((r) => r.json())
              .then((r) => r?.items[0]?.login));
      if (!username) {
          error(`No username found`);
          process.exit(1);
      }
      log("Found username: ".green.bold + username.white.bold.underline);
      const dir = args.dir ? path.resolve(args.dir) : HOME_DIR;
      const spinner = genLoader("Finding github repos...").start();
      const repos = await findGithubRepos(dir, {
          top: true,
          exclude: args.exclude,
          submodules: args.submodules,
      }).then(async (repos) => {
          spinner.stop();
          const load = genLoader("Checking status of repos...").start();
          let out = await Promise.all(
              repos.map(async (i) => {
                  const { clean, output } = await isClean(i);
                  const url = await getUrl(i);
                  return {
                      repo: i,
                      clean,
                      output: output
                          .split("\n")
                          .map((i) => i.trim())
                          .filter((i) => i.length),
                      url,
                  };
        })
      ).then((a) =>
          a
              .filter((i) =>
                  args["find-orphans"] ||
                      args["not-mine"] ||
                      args["mine-only"] ||
                      args["all"]
                      ? true
                      : !i.clean
          )
              .filter((i) =>
                  args["all"] ? true : args["find-orphans"] ? !i.url : i.url
              )
              .map((i) => [i.repo, i.output, i.url, i.output])
              .sort((a, b) => b[1].length - a[1].length)
              .map((i) => [
                  i[0],
                  i[1].length
                      ? `${i[1].length} changed file${i[1].length > 1 ? "s" : ""}`
                      : "",
                  i[2].split("/").slice(-2).join("/"),
                  i[3],
          ])
              .filter((i) => {
                  if (args["all"]) {
                      return true;
                  }
                  if (!(args["not-mine"] || args["mine-only"])) {
                      return true;
                  }
                  if (args["not-mine"] && args["mine-only"]) {
                      error(
                          `Arguments --not-mine and --mine-only can't be used together.`
                      );
                  }
                  if (args["find-orphans"]) {
                      error(
                          `Error: Arguments --find-orphans and --(not-mine|mine-only) can't be used together, as --(not-mine|mine-only) depends on repos with a remote URL.`
                      );
                  }
                  // Get a string like "Explosion-Scratch/blog"
                  const repoString = getUsername(i, true);
                  const repoUsername = repoString?.split("/")[0];
                  const out = repoUsername.toLowerCase() === username.toLowerCase();
                  return args["mine-only"] ? out : !out;
          })
      );
        load.stop();
        return out;
    });
      const longestRepoName = repos.reduce(
          (a, b) => Math.max(a, b[0].split(path.sep).slice(-1)[0].length),
          0
      );
      const longestPath = repos.reduce((a, b) => Math.max(a, b[0].length), 0);
      if (
          args["find-orphans"] ||
          args["not-mine"] ||
          args["mine-only"] ||
          args["all"]
      ) {
          console.clear();
          switch (args.output) {
              case "plain":
                  console.log(repos.map((i) => i[0]).join("\n"));
                  break;
              case "json":
                  console.log(JSON.stringify(formatRepos(repos), null, 2));
                  break;
              case "readable":
                  const message = args["find-orphans"]
                      ? "Orphaned repos (with no origin URL):"
                      : args["not-mine"]
                          ? `Repos not owned by ${username}:`
                          : args["mine-only"]
                              ? `Repos owned by ${username}`
                              : args["all"]
                                  ? `All repos:`
                                  : `This message should never show up`;
                  log(message.bold.green.underline);
                  console.log(
                      repos
                          .map(
                              (i) =>
                      `${i[0].padEnd(longestPath + 7, " ").bold.blue} ${!(i[1] || getUsername(i))
                          ? `(No changes or remote)`.dim.italic
                          : ""
                      }${i[1] ? `(${i[1]})`.dim.italic : ""}${i[1] && getUsername(i) ? " - " : ""
                      }${getUsername(i) ? getUsername(i) : ""}`
              )
                  .join("\n")
          );
                  break;
              default:
                  error("Unexpected output format: ", args.output);
                  process.exit(1);
          }
          process.exit(0);
      }
      if (repos.length === 0) {
          log("No github repos found.");
          process.exit(0);
      }
      const choices = repos.map((repo) => ({
          name: `${repo[0]
              .split(path.sep)
              .slice(-1)[0]
            .bold.padEnd(longestRepoName + 10, " ")}${`${repo[1] ? " - " : ""}${repo[1].italic} (${niceslice(
                repo[0].replace(process.env.HOME, "~"),
                Math.floor(process.stdout.columns / 4)
            )} - ${repo[2].split("/")[0].toLowerCase() === username.toLowerCase()
                    ? repo[2].split("/")[0]
                    : repo[2].split("/")[0].bold.blue.reset
                }${("/" + repo[2].split("/")[1]).dim + ")"}`.dim
            }`,
        value: repo,
        checked: false,
    }));
      const selectedRepos = await inquirer
          .prompt([
              {
                  loop: false,
                  type: "checkbox",
                  name: "selectedRepos",
                  message: "Select the repos you want to backup:",
                  choices,
              },
              {
                  name: "key",
                  type: "press-to-continue",
                  key: "y",
              pressToContinueMessage: `Press ${"<y>".blue.bold
                  } to continue. This will stage, commit and push all repos you selected.`,
          },
      ])
          .then((a) => a.selectedRepos.map((i) => i[0]));
      if (selectedRepos.length === 0) {
          log("No repos selected.".red.bold);
          process.exit(0);
      }
      log("Starting backup...".yellow);
      let prev = "";
      for (let repo of selectedRepos) {
          console.clear();
          logUpdate(
              `${prev ? prev + "\n\n" : ""}Backing up repo: ${repo
                  .split(path.sep)
                  .slice(-2)
                  .join("/")}`.italic
          );
          const result = await backupRepo(repo);
          if (result) {
              prev = `✅ Backup successful for ${repo}`.green.bold;
          } else {
              prev = `🛑 Backup failed for ${repo}`.red.bold;
          }
      }
      logUpdate("Backup finished.".green);
      function formatRepos(repos) {
          // JSON format repos
          return repos.map((i) => ({
              path: i[0],
              changedFileCount: parseInt(i[1].split(" ")[0], 10),
              url: i[2],
              changedFiles: i[3],
      }));
      }
      function getUsername(repo, raw) {
          if (raw) {
              return repo[2];
          }
          if (!repo[2]?.length) {
              return false;
          }
        return `${repo[2].split("/")[0].toLowerCase() === username.toLowerCase()
                ? repo[2].split("/")[0]
                : repo[2].split("/")[0].bold.blue.reset
            }${("/" + repo[2].split("/")[1]).dim}`;
    }
      function log(message) {
          if (args["quiet"]) {
              return;
          }
          console.log(message);
      }
      function genLoader(message) {
          if (args["quiet"]) {
              return {
                  start() {
                return { stop: () => { } };
            },
            stop() {
                    return { start: () => { } };
                },
            };
        }
        return ora(message);
    }
  } catch (e) {
      error(e.message);
  }
    function error(message) {
        console.clear();
        console.log(`${`Error: ${message}`.red.bold}\n\n${HELP}`);
        process.exit(1);
  }
}

async function isClean(path) {
    try {
        const { stdout } = await execa("git", ["diff", "--name-only"], {
            cwd: path,
        });
        return { clean: !stdout.trim().length, output: stdout };
    } catch (error) {
        return { clean: false, output: "" };
    }
}
async function getUrl(path) {
    try {
        const { stdout } = await execa(
            "git",
            ["config", "--get", "remote.origin.url"],
            {
                cwd: path,
            }
        );
        return stdout.trim();
    } catch (error) {
        return "";
    }
}
main();

function niceslice(str, n) {
    return str.length > n - 3 ? str.slice(0, n - 3) + "..." : str;
}
