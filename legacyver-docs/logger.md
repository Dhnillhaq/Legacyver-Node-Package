## Overview
This module provides a logging system with configurable log levels and colorful output.

## Functions

### `setLevel(level)`
#### Params | Description
----------|-------------
`level`    | The desired log level

#### Returns
None

Sets the current log level to the specified `level`.

### `setCI(val)`
#### Params | Description
----------|-------------
`val`      | A boolean indicating whether CI mode is enabled

#### Returns
None

Toggles the CI mode on or off.

### `shouldLog(level)`
#### Params | Description
----------|-------------
`level`    | The log level to check for

#### Returns
Boolean
Determines whether the current log level allows logging at the specified `level`.

### `debug(...args)`
#### Params | Description
----------|-------------
`...args`  | Variable number of arguments to be logged as debug output

#### Returns
None
Logs the provided `args` to the console with a gray '[debug]' prefix if the current log level allows it.

### `info(...args)`
#### Params | Description
----------|-------------
`...args`  | Variable number of arguments to be logged as info output

#### Returns
None
Logs the provided `args` to the console with a cyan '[info]' prefix if the current log level allows it.

### `warn(...args)`
#### Params | Description
----------|-------------
`...args`  | Variable number of arguments to be logged as warn output

#### Returns
None
Logs the provided `args` to the console with a yellow '[warn]' prefix if the current log level allows it.

### `error(...args)`
#### Params | Description
----------|-------------
`...args`  | Variable number of arguments to be logged as error output

#### Returns
None
Logs the provided `args` to the console with a red '[error]' prefix if the current log level allows it.

## Dependencies
* picocolors (`pc`)

## Usage Example
```javascript
const logger = require('./logger');

logger.debug('This is a debug message');
logger.info('This is an info message');
logger.warn('This is a warn message');
logger.error('This is an error message');
```
Note: This example demonstrates the usage of the `debug`, `info`, `warn`, and `error` functions, which are exported from the logger module.