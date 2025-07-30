# Building Schema Score

This document explains how to build compiled binaries for the GraphQL Schema Scorer.

## Prerequisites

- [Bun](https://bun.sh/) v1.0.0 or later
- Git

## Local Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run directly with Bun
bun run index.ts schema.graphql

# Or use the npm script
npm start schema.graphql
```

## Building Binaries

### Quick Build (Linux x64)
```bash
npm run build
```

### Build for Specific Architecture
```bash
# Linux x64 (glibc)
npm run build:linux-x64

# Linux x64 (musl - Alpine/static)
npm run build:linux-x64-musl

# Linux ARM64
npm run build:linux-arm64

# macOS Intel
npm run build:darwin-x64

# macOS Apple Silicon
npm run build:darwin-arm64

# Windows x64
npm run build:windows-x64
```

### Build All Architectures
```bash
npm run build:all
```

This creates binaries for all supported platforms:
- `schema-score-linux-x64`
- `schema-score-linux-x64-musl`
- `schema-score-linux-arm64`
- `schema-score-darwin-x64`
- `schema-score-darwin-arm64`
- `schema-score-windows-x64.exe`

## GitHub Actions CI/CD

The repository includes a GitHub Actions workflow (`.github/workflows/build.yml`) that automatically:

1. **On Pull Requests**: Builds and tests all architectures
2. **On Tag Push**: Creates a GitHub release with all binaries and checksums
3. **On Tag Push**: Builds and publishes a Docker image

### Creating a Release

1. Create and push a git tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```

2. GitHub Actions will automatically:
   - Build binaries for all architectures
   - Run tests on each platform
   - Create SHA256 checksums
   - Create a GitHub release with all assets
   - Build and push a Docker image to `ghcr.io`

### Supported Architectures

| Target | Description | Use Case |
|--------|-------------|----------|
| `linux-x64` | Linux x64 with glibc | Most Linux distributions |
| `linux-x64-musl` | Linux x64 with musl | Alpine Linux, static linking |
| `linux-arm64` | Linux ARM64 | ARM servers, Raspberry Pi |
| `darwin-x64` | macOS Intel | macOS on Intel processors |
| `darwin-arm64` | macOS Apple Silicon | macOS on M1/M2/M3 processors |
| `windows-x64` | Windows x64 | Windows systems |

## Docker Usage

The CI automatically builds a Docker image with the `linux-x64-musl` binary:

```bash
# Pull the latest image
docker pull ghcr.io/ldebruijn/schema-score:latest

# Run with a local schema file
docker run --rm -v $(pwd):/workspace ghcr.io/ldebruijn/schema-score:latest /workspace/schema.graphql

# Run with reporting
docker run --rm -v $(pwd):/workspace ghcr.io/ldebruijn/schema-score:latest \
  /workspace/schema.graphql \
  --report-endpoint https://api.example.com/reports \
  --subgraph-name my-service
```

## Binary Verification

Each release includes SHA256 checksums. Verify your download:

```bash
# Download both the binary and checksum
wget https://github.com/ldebruijn/schema-score/releases/latest/download/schema-score-linux-x64-musl
wget https://github.com/ldebruijn/schema-score/releases/latest/download/schema-score-linux-x64-musl.sha256

# Verify
sha256sum -c schema-score-linux-x64-musl.sha256
```

## Troubleshooting

### Build Failures

1. **Missing Bun**: Install from [bun.sh](https://bun.sh/)
2. **Target not supported**: Check Bun documentation for supported targets
3. **Permission issues**: Ensure you have write permissions in the directory

### Runtime Issues

1. **Permission denied**: Make the binary executable with `chmod +x schema-score-*`
2. **Library not found**: Use the musl variant for maximum compatibility
3. **Architecture mismatch**: Ensure you downloaded the correct binary for your system

```bash
# Check your architecture
uname -m  # x86_64 = x64, aarch64 = arm64

# Check your OS
uname -s  # Linux, Darwin (macOS), Windows_NT
```