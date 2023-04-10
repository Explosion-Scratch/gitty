**Whoops, `gitty` was already taken on NPM, I thought I checked. Name change will be coming soon lol**



<div align=center><h1>🐾 Gitty</h1></div>

<center>😸 <i>Backup all your git repos with a single command!</i></center><br><br>

Gitty is a command-line tool that helps you backup all your git repositories from GitHub, GitLab, Bitbucket or any other git hosting service. It has lots of options, and is fully interactive!

## Installation

You can install Gitty using npm:
    
    npm install -g gitty 

Or you can download the binary for your platform from the [releases page](https://github.com/explosion-scratch/gitty/releases).

## Usage

To backup all your repos, simply run:
    
    gitty 

Gitty scans your disk for GitHub repos, intelligently filters them to ones that have changes, then allows you to pick and choose which ones to back up.

You can also use the following options:
    
```
Usage: backup_all_repos [options]

Options:
    --help               Show this message
    --username           Username (skips API check for username if provided)
    --email              Email address (used instead of "git config --get user.email" if provided)
    --dir                Directory to backup to (defaults to $HOME)
    --no-exclude         Don't exclude folders such as ~/Library, ~/.cache, .git, etc.
    --find-orphans       Find any repos that don't have a remote URL.
    --output             Give the output in JSON, plain text or readable format. (json|plain|readable).
    --mine-only          Only show repos owned by me
    --not-mine           Only show repos NOT owned by me
    --omit-submodules    Don't search for submodules in repos
    --all                Just list all repos found
    --quiet              Don't log anything except the output```

For example, to backup all your repos to a folder called `backup` without excluding any folders, run:
    
    gitty --dir backup --no-exclude 

To backup only your GitHub repos with a specific username and email address, run:
    
    gitty --username explosion-scratch --email explosion@scratch.com 

To get back a machine readable format you can do something like this:

    gitty --quiet --output plain --all

View repos without remote URLs (maybe you forgot to connect it to your repo):

    gitty --find-orphans

View all the repos you've cloned that aren't yours

    gitty --not-mine

Make search faster and don't search for submodules in each repo:

    gitty --omit-submodules

## Features

* 🚀 Backup all your git repos with one command
* 🌐 Supports GitHub, GitLab, Bitbucket and any other git hosting service
* 📝 Allows you to choose which repos to backup
* 🗑️ Excludes folders such as `~/Library`, `~/.cache`, `.git`, etc. by default (can be disabled with `--no-exclude`)
* 💻 Fully interactive via [inquirer](https://npmjs.com/package/inquirer)
* 🎨 Uses colors and spinners to make the output more user-friendly

## License

MIT (c) Explosion-Scratch
