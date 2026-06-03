# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-27

### Breaking Changes

- Upgraded `@noble/hashes` and `@noble/curves` to v2.0.1. Noble v2 renamed
  several module entry points. If your package imports noble directly alongside
  `canopy-crypto`, update the following paths:
  - `@noble/hashes/sha256.js` → `@noble/hashes/sha2.js`
  - `@noble/hashes/ripemd160.js` → `@noble/hashes/legacy.js`

## [0.1.0] - Initial release
