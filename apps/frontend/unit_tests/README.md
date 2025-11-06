# Unit Tests

This directory contains unit tests for the frontend application.

## Test Structure

Each test file follows the pattern: `*.test.ts` and includes:
- **Normal case**: Tests typical, expected behavior
- **Edge case**: Tests boundary conditions and unusual but valid inputs
- **Error case**: Tests error handling and invalid inputs

## Test Files

### 1. `logger.test.ts`
Tests the Logger singleton class with 5 test functions:
- `logger.info()` - 3 test cases
- `logger.debug()` - 3 test cases
- `logger.warn()` - 3 test cases
- `logger.error()` - 3 test cases
- `logger.setEnabled()` - 3 test cases

**Total: 15 test cases**

### 2. `drinks.test.ts`
Tests drink data access functions with 3 test functions:
- `getDrinkById()` - 3 test cases
- `DRINKS array validation` - 3 test cases
- `Drink object structure` - 3 test cases

**Total: 9 test cases**

### 3. `theme.test.ts`
Tests theme color resolution with 2 test functions:
- `useThemeColor()` - 3 test cases
- `Colors object structure` - 3 test cases

**Total: 6 test cases**

### 4. `environment.test.ts`
Tests environment configuration with 3 test functions:
- `environment configuration` - 3 test cases
- `IS_PROD flag` - 3 test cases
- `NETWORK_IP configuration` - 3 test cases

**Total: 9 test cases**

### 5. `favorites.test.ts`
Tests favorites management with 5 test functions:
- `FavoritesManager.isFavorite()` - 3 test cases
- `FavoritesManager.add()` - 3 test cases
- `FavoritesManager.remove()` - 3 test cases
- `FavoritesManager.toggleFavorite()` - 3 test cases
- `FavoritesManager.clear()` - 3 test cases

**Total: 15 test cases**

### 6. `color-scheme.test.ts`
Tests color scheme hook with 2 test functions:
- `useColorScheme() with system theme` - 3 test cases
- `useColorScheme() with explicit theme` - 3 test cases

**Total: 6 test cases**

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

## Test Coverage

- **Total test functions**: 18
- **Total test cases**: 60+
- Each test function includes at least 3 test cases (normal, edge, error)

## CI/CD Integration

Tests are automatically run on:
- Push to main/master/develop branches
- Pull requests to main/master/develop branches

See `.github/workflows/tests.yml` for CI/CD configuration.

