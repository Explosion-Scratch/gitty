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
Usage: gitty [options]

Options:
    --help               Show this message
    --username           Username (skips API check for username if provided)
    --email              Email address (used instead of "git config --get user.email" if provided)
    --dir                Directory to backup to (defaults to $HOME)
    --no-exclude         Don't exclude folders such as ~/Library, ~/.cache, .git, etc.
```

For example, to backup all your repos to a folder called `backup` without excluding any folders, run:
    
    gitty --dir backup --no-exclude 

To backup only your GitHub repos with a specific username and email address, run:
    
    gitty --username explosion-scratch --email explosion@scratch.com 

## Features

* 🚀 Backup all your git repos with one command
* 🌐 Supports GitHub, GitLab, Bitbucket and any other git hosting service
* 📝 Allows you to choose which repos to backup
* 🗑️ Excludes folders such as `~/Library`, `~/.cache`, `.git`, etc. by default (can be disabled with `--no-exclude`)
* 💻 Fully interactive via [inquirer](https://npmjs.com/package/inquirer)
* 🎨 Uses colors and spinners to make the output more user-friendly

## License

MIT (c) Explosion-Scratch