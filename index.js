import path from "path";
import ora from "ora";
import inquirer from "inquirer";
import { execa } from "execa";
import minimist from "minimist";
import "colors";
import { findGithubRepos } from "./findRepos.js";
import logUpdate from "log-update";
const HOME_DIR = process.env.HOME || process.env.USERPROFILE;
import "isomorphic-fetch";
import PressToContinuePrompt from "inquirer-press-to-continue";

const HELP = `
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

function log(message) {
    console.log(message);
}

async function main() {
    try {
        const args = minimist(process.argv.slice(2));
        const recognizedOptions = ["exclude", "dir", "username", "email", "help"];
        delete args["_"];
        if (!Object.keys(args).every((i) => recognizedOptions.includes(i))) {
            log(
                `${`Error: Unrecognized option ${Object.keys(args).filter(
                    (i) => !recognizedOptions.includes(i)
                ).map(i => `--${i}=${JSON.stringify(args[i])}`).join(', ')}`.red.bold}\n\n${HELP}`
            );
            process.exit(0);
        }
        if (args.help === true) {
            log(HELP);
            process.exit(0);
        }
        if (args.exclude === undefined) {
            args.exclude = true;
        }
        const { stdout: email } = args.username
            ? null
            : args.email
                ? args.email
                : await execa("git", ["config", "--get", "user.email"]);
        if (!email) {
            log("No email provided.".red.bold);
            process.exit(1);
        }
        const username =
            args.username ||
            (await fetch(
                `https://api.github.com/search/users?q=${encodeURIComponent(email)}`
            )
                .then((r) => r.json())
                .then((r) => r?.items[0]?.login));
        if (!username) {
            log("No username found.".red.bold);
            process.exit(1);
        }
        log("Found username: ".green.bold + username.white.bold.underline);
        const dir = args.dir ? path.resolve(args.dir) : HOME_DIR;
        const spinner = ora("Finding github repos...").start();
        const repos = await findGithubRepos(dir, true, args.exclude).then(
            async (repos) => {
                spinner.stop();
                const load = ora("Checking status of repos...").start();
                let out = await Promise.all(
                    repos.map(async (i) => {
                        const { clean, output } = await isClean(i);
                        const url = await getUrl(i);
                        return { repo: i, clean, output, url };
                    })
                ).then((a) =>
                    a
                        .filter((i) => !i.clean)
                        .filter((i) => i.url)
                        .map((i) => [
                            i.repo,
                            i.output.split("\n").map((i) => i.trim()),
                            i.url,
                        ])
                        .sort((a, b) => b[1].length - a[1].length)
                        .map((i) => [
                            i[0],
                            `${i[1].length} changed file${i[1].length > 1 ? "s" : ""}`,
                            i[2].split("/").slice(-2).join("/"),
                        ])
                );
                load.stop();
                return out;
            }
        );
        if (repos.length === 0) {
            log("No github repos found.");
            process.exit(0);
        }
        const longestRepoName = repos.reduce(
            (a, b) => Math.max(a, b[0].split(path.sep).slice(-1)[0].length),
            0
        );
        const choices = repos.map((repo) => ({
            name: `${repo[0]
                .split(path.sep)
                .slice(-1)[0]
                .bold.padEnd(longestRepoName + 10, " ")}${` - ${repo[1].italic} (${niceslice(
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
    } catch (error) {
        console.error(error.message);
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
