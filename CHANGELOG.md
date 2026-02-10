# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.4] - 2026-02-10

### Changed

- GitGerbil will now wait for up to 5 seconds to detect a git repo when activating instead of immediately failing.
- File extensions like `.test.ts` will be correctly detected as `.ts` files now and scanned if the base extension is in the list of scanned file types.
- Replaced `enable` and `disable` commands (i.e. `gitgerbil.enableSecretScanning`) with `toggle` commands.
- Submitting an empty field when running `gitgerbil.setScannedFileTypes` will now reset to the default list of scanned file types instead of an empty list.

## [0.1.3] - 2026-02-08

### Added

- Added `gitgerbil-ignore-file` comment to ignore entire files from scanning.
- Added `.md` to the default list of scanned file extensions.

### Changed

- `gitgerbil-ignore-line` and `gitgerbil-ignore-file` comments now work on all types of scanning (file path, secrets, comments) instead of just secret scanning.
  - To ignore a file from file path scanning, use `gitgerbil-ignore-file`.
- Failing to detect a git repository in the current workspace now shows an error message.
- Changed the severity of comment scanning diagnostics to "Information" instead of "Hint" to make them more visible.
- Secret scanning will now provide diagnostics for all secrets detected in a file instead of just the first one.

## [0.1.2] - 2026-02-07

### Changed

- Fixed the extension's diagnostic source to be "GitGerbil" instead of the previous interim name.

## [0.1.1] - 2026-02-07

### Added

- Added `gitgerbil-ignore-line` comment to allow users to ignore specific lines that would otherwise be flagged as a potential secret.
- Added default ignored files that are ignored when secret scanning, like `package-lock.json`.
- Added an icon for the extension.

### Changed

- Added actual documentation to the `README.md`.

## [0.1.0] - 2026-02-07

### Added

- Initial release.
