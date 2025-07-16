# Build System Guide

This project supports dual build systems to accommodate different deployment scenarios:

## 1. Regular Build (Absolute Paths)

For web server deployment with absolute paths.

### Commands:

```bash
# Development server
npm run dev

# Production build
npm run build

# Clean build output
npm run clean
```

### Output:

- **Location**: `./dist/pages/`
- **Paths**: Absolute paths (`/assets/...`, `/pages/...`)
- **Use Case**: Web server deployment, development

## 2. Offline Build (Relative Paths)

For ThemeForest submission and offline compatibility. This build works without an internet connection and can be opened directly from files.

### Commands:

```bash
# Offline build with relative paths
npm run build:offline

# Build both versions
npm run build:all

# Clean offline build
npm run clean:offline

# Test offline build with local server (recommended)
npm run serve:offline
```

### Output:

- **Location**: `./dist/offline/`
- **Paths**: Relative paths (`./assets/...`, `../...`)
- **Use Case**: ThemeForest submission, file:// access, offline viewing, local development

## Build Comparison

| Feature                | Regular Build         | Offline Build          |
| ---------------------- | --------------------- | ---------------------- |
| **Paths**              | Absolute (`/assets/`) | Relative (`./assets/`) |
| **Web Server**         | ✅ Required           | ✅ Optional            |
| **File:// Access**     | ❌ No                 | ✅ Yes                 |
| **Offline Viewing**    | ❌ No                 | ✅ Yes                 |
| **ThemeForest Ready**  | ❌ No                 | ✅ Yes                 |
| **Output Directory**   | `./dist/pages/`       | `./dist/offline/`      |
| **Prettier Formatted** | ✅ Yes                | ✅ Yes                 |

## File Structure After Builds

### Regular Build (`./dist/`)

```
dist/
├── pages/           # Astro-generated pages (absolute paths)
├── css/            # Compiled CSS
├── js/             # Compiled JS
├── assets/         # Static assets
└── favicon files   # Root favicon files
```

### Offline Build (`./dist/offline/`)

```
dist/offline/
├── *.html          # All pages in flat structure (relative paths)
├── css/            # Compiled CSS
├── js/             # Compiled JS
├── assets/         # Static assets
├── _astro/         # Astro build assets
└── favicon files   # Root favicon files
```

## Usage Examples

### Development Workflow

```bash
# Start development server
npm run dev

# Your normal development workflow...
# Make changes, test, etc.

# Build for production (web server)
npm run build
```

### ThemeForest Submission Workflow

```bash
# Build both versions
npm run build:all

# Test the offline build with local server (recommended)
npm run serve:offline

# Or test directly with file:// (may have CORS issues)
cd dist/offline
# Open any HTML file in browser
```

### Individual Builds

```bash
# Only web server build
npm run build

# Only offline build (requires CSS/JS to be built first)
npm run css && npm run js && npm run build:offline
```

## Testing Offline Builds

### Method 1: Local Server (Recommended)

Use the built-in local server to test your offline build without CORS issues:

```bash
npm run serve:offline
```

This will:

- Start a local server on port 3001 (or next available port)
- Automatically open your browser to the offline build
- Serve all files with proper headers to avoid CORS issues
- Allow you to test all functionality as it would work when deployed

### Method 2: Direct File Access

You can also open files directly, but modern browsers may block some resources due to CORS policy:

```bash
cd dist/offline
# Open any .html file in your browser using file:// protocol
```

**Note**: If you encounter CORS errors with direct file access, use the local server method instead.

## Technical Details

### Path Resolution

The system uses environment variables to determine path generation:

- `import.meta.env.DEV`: Development mode detection
- `import.meta.env.PUBLIC_OFFLINE_PATHS`: Offline build mode

### Configuration Files

- `config/astro.config.mjs`: Regular build configuration
- `config/astro.offline.config.mjs`: Offline build configuration
- `config/assets.offline.config.mjs`: Offline asset handling

### Build Tools

- `tools/build.mjs`: Regular build tool
- `tools/build-offline.mjs`: Offline build tool
- `tools/fix-offline-paths.mjs`: Path correction for offline compatibility
- `tools/serve-offline.mjs`: Local server for testing offline builds

### Build Process Details

The offline build includes these steps:

1. **Astro Build**: Generates static HTML files with offline paths
2. **Asset Copying**: Copies CSS, JS, images, and favicon files
3. **Path Fixing**: Corrects offline paths based on file depth
4. **Prettier Formatting**: Formats all HTML files for better readability
5. **Verification**: Checks that all required files are present

## Troubleshooting

### Offline Build Issues

1. **CSS/JS not found**: Run `npm run css && npm run js` before `npm run build:offline`
2. **Assets missing**: Check that `src/assets/` directory exists
3. **Paths still absolute**: Verify `PUBLIC_OFFLINE_PATHS=true` environment variable
4. **CORS errors**: Use `npm run serve:offline` instead of opening files directly

### Common CORS Issues

If you see errors like:

```
Access to script at 'file:///...' has been blocked by CORS policy
```

**Solution**: Use the local server instead:

```bash
npm run serve:offline
```

### Server Port Issues

If port 3001 is busy, the server will automatically try the next available port. Check the console output for the actual URL.

## Integration with ThemeForest

The offline build output (`./dist/offline/`) is designed to be the contents of your ThemeForest "HTML Template" folder:

```
themeforest-submission.zip
├── 1_HTML_Template/     ← Contents of ./dist/offline/
├── 2_Astro_Source_Files/ ← Your entire project source
└── 3_Documentation/     ← Your documentation files
```

### Benefits for ThemeForest Submission

- **File:// Compatibility**: Works when customers open files directly
- **No Server Required**: Customers can preview without setting up a web server
- **Offline Paths**: All links and assets work regardless of folder location
- **Formatted Code**: Clean, readable HTML for customer review
- **Offline Ready**: Perfect for marketplace requirements
