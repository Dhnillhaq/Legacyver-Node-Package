## Overview
This file contains React components and a utility function for formatting currency. The components include a Button and a UserCard.

## Functions
### Button
The Button component is a React functional component that renders a button element.
#### Parameters
| Parameter | Type | Description |
| --- | --- | --- |
| label | string | The text to display on the button |
| onClick | () => void | The function to call when the button is clicked |
| disabled | boolean | Optional, whether the button is disabled |
| variant | 'primary' | 'secondary' | 'danger' | Optional, the style variant of the button |
#### Return Value
The Button component returns a JSX button element.

### UserCard
The UserCard component is a React functional component that fetches user data and displays it in a card.
#### Parameters
| Parameter | Type | Description |
| --- | --- | --- |
| userId | number | The ID of the user to fetch |
| onClose | () => void | The function to call when the close button is clicked |
#### Return Value
The UserCard component returns a JSX div element containing the user's data or a loading/error message.

### formatCurrency
The formatCurrency function formats a number as a currency string.
#### Parameters
| Parameter | Type | Description |
| --- | --- | --- |
| amount | number | The amount to format |
| currency | string | Optional, the currency to use (default: 'USD') |
#### Return Value
The formatCurrency function returns a string representing the formatted currency amount.

## Dependencies
* React
* Intl.NumberFormat

## Usage Example
No clear usage example is visible in the provided code. However, components can be used as follows:
```jsx
import { Button, UserCard, formatCurrency } from './components';

const App = () => {
  const handleButtonClicked = () => {
    console.log('Button clicked');
  };

  const handleUserCardClose = () => {
    console.log('User card closed');
  };

  return (
    <div>
      <Button label="Click me" onClick={handleButtonClicked} />
      <UserCard userId={1} onClose={handleUserCardClose} />
      <p>Formatted currency: {formatCurrency(1000)}</p>
    </div>
  );
};
```