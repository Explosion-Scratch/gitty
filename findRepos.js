import fs from "fs/promises";
import path from "path";

const BLACKLIST = [
    "node_modules",
    ".git",
    "Library",
    ".localized",
    ".cache",
    ".local",
    "d",
    "envs",
    "etc",
    "xcuserdata",
    "logs",
    ".Trash",
];
const HOME_BLACKLIST = [
    ...BLACKLIST,
    "Applications",
    "mambaforge",
    "anaconda",
    "micromamba",
    "dalai",
];
export const findGithubRepos = async (dir, top = false, exclude = true) => {
    const repos = [];
    const files = await fs
        .readdir(dir)
        .then((a) =>
            top
                ? a.filter((file) =>
                    !exclude
                        ? true
                        : !(file.startsWith(".") || HOME_BLACKLIST.includes(file))
                )
                : a
        );
    for (const file of files) {
      if (BLACKLIST.includes(file) && exclude) {
          continue;
      }
      const filePath = `${dir}/${file}`;
      const isDir = await isDirectory(filePath);
      if (isDir) {
          const hasGit = await hasGitFolder(filePath);
          if (hasGit) {
              repos.push(filePath);
          } else {
                repos.push(...(await findGithubRepos(filePath)));
            }
        }
    }
    return repos;
};

async function isDirectory(path) {
    try {
        const stats = await fs.lstat(path);
        return stats.isDirectory();
    } catch (err) {
      if (err.code === "ENOENT") {
          return false;
      }
      throw err;
  }
}

async function hasGitFolder(dirPath) {
    const files = await fs.readdir(dirPath);
    return files.includes(".git");
}
