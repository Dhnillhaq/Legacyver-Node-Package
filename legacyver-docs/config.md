## Overview
This is a JavaScript module that exports a single function `loadConfig`, which loads configuration from a file and merges with CLI flags.

## Functions
### `loadConfig`

#### Description:
Load configuration from file and merge with CLI flags.
CLI flags always win over file config.

#### Params Table:

| Name | Type |
| --- | --- |
| `cliFlags` | Object |

#### Return Value:
Object

```javascript
function loadConfig(cliFlags = {}) {
  // ...
}
```

## Dependencies
* `cosmiconfig: cosmiconfigSync`

## Usage Example
No clear pattern is visible in the code to demonstrate usage.