## Overview
This file exports five custom error classes for use in a Legacyver application.

## Functions

### `LegacyverError`
#### Description
A base class for all custom errors in Legacyver.
#### Parameters
| Name | Type | Default Value |
| --- | --- | --- |
| message | string |  |
| code | string | 'LEGACYVER_ERROR' |

#### Return Value
None.

### `NoApiKeyError`
#### Description
Raised when no API key is found for a provider.
#### Parameters
| Name | Type | Required | Default Value |
| --- | --- | --- | --- |
| provider | string |  |  |

#### Return Value
None.

#### Detected Patterns:
- The error message includes a suggestion to set the `OPENROUTER_API_KEY` environment variable or run `legacyver init`.
- The error message includes a link to obtain an API key at https://openrouter.ai/keys.

### `RateLimitError`
#### Description
Raised when the rate limit is exceeded for a provider.
#### Parameters
| Name | Type | Required | Default Value |
| --- | --- | --- | --- |
| provider | string |  |  |
| retryAfter | number |  | 1000 |

#### Return Value
None.

#### Detected Patterns:
- The error message includes a suggestion to retry.
- The error message indicates the amount of time that must pass before retrying (1000ms by default).

### `ParseError`
#### Description
Raised when there is an issue parsing a file.
#### Parameters
| Name | Type | Required | Default Value |
| --- | --- | --- | --- |
| filePath | string |  |  |
| originalError | Error |  |  |

#### Return Value
None.

### `RenderError`
#### Description
Raised when there is an issue rendering a format.
#### Parameters
| Name | Type | Required | Default Value |
| --- | --- | --- | --- |
| format | string |  |  |
| originalError | Error |  |  |

#### Return Value
None.

## Dependencies
* `Error`