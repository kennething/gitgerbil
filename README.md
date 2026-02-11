# GitGerbil

Are you struggling to not commit environment variables?

Are unusually large rats leaking into your databases and you don't know why?

Protect your repositories with this monsterously big rodent!

<img src="./src/assets/hero.png" alt="GitGerbil Hero Image" width="300" />

<br>

We've all been there: we vibe coded an entire project, and oopsie poopsie, we committed all of our secrets!
Scan your project for potential secrets, sensitive information, and less-than-ideal files that you probably shouldn't commit, and save yourself the trouble of resetting all of your API keys.

Download the extension [here](https://marketplace.visualstudio.com/items?itemName=KennethNg.gitgerbil) or look for `KennethNg.gitgerbil` in the VSCode Extensions tab.

## Features

Scans your tracked git files for potential secret keys with some pretty basic regex that looks for secret key patterns.

Also scans if files are being tracked that probably shouldn't be tracked, like `.env` and `node_modules`.

Also also scans for TODO or FIXME comments in your code and gives a friendly reminder TO FIXHIM. COME ON HE'S BEEN WAITING TO BE FIXED FOR 3 YEARS WHAT ARE YOU WAITING FOR

> \[!TIP\]
>
> GitGerbil can have false positives. To ignore a line, add `// gitgerbil-ignore-line` above it (or whatever comment syntax your language uses).
>
> Or to ignore an entire file, add `// gitgerbil-ignore-file` at the top of the file.

## Extension Settings

This extension adds the following settings:

- `gitgerbil.scannedFileTypes`: An array of file extensions that GitGerbil will scan for secrets and comments. By default, this includes common programming languages and configuration files.
- `gitgerbil.enableFilePathScanning`: Whether GitGerbil should read file paths against common sensitive patterns. Default is `true`.
- `gitgerbil.enableSecretScanning`: Whether GitGerbil should scan file contents for potential secret keys. Default is `true`.
- `gitgerbil.enableStrictSecretScanning`: When enabled, makes secret scanning skip files that don't have a common secret indicator (like "API_SECRET"). Default is `true`.
- `gitgerbil.enableCommentScanning`: Whether GitGerbil should scan file contents for TODO and FIXME comments. Default is `true`.

## Note

Gerbils are rodents, and rats are rodents. Therefore, close enough.
