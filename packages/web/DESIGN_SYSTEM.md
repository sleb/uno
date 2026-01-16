# UNO Design System

This document describes the reusable design elements and theming system for the UNO web application.

## Overview

The UNO app uses [Mantine](https://mantine.dev/) as its UI component library with a custom theme that reflects the classic UNO card game's vibrant color palette.

## Theme Configuration

The custom theme is defined in `src/theme.tsx` and includes:

### Brand Colors

The UNO theme includes four primary brand colors, each defined as a full Mantine color tuple (10 shades):

- **UNO Red** (`unoRed`) - Main: `#e74c3c`
- **UNO Blue** (`unoBlue`) - Main: `#3498db` (Primary color)
- **UNO Green** (`unoGreen`) - Main: `#2ecc71`
- **UNO Yellow** (`unoYellow`) - Main: `#f39c12`

### Using Theme Colors

You can reference theme colors in Mantine components:

```tsx
import { Button } from "@mantine/core";

// Using the primary color (unoBlue)
<Button color="unoBlue">Click Me</Button>

// Using specific shades
<Button color="unoRed.5">Red Button</Button>
<Button color="unoGreen.4">Green Button</Button>
```

### Constants

The theme exports several constants for consistency:

#### `UNO_CARD_COLORS`

Object containing the main UNO card colors for game UI:

```tsx
import { UNO_CARD_COLORS } from "../theme";

<div style={{ backgroundColor: UNO_CARD_COLORS.red }}>Red Card</div>
```

#### `UNO_ICON_COLOR`

Standard color for icons throughout the app (`#3498db`):

```tsx
import { UNO_ICON_COLOR } from "../theme";
import { FaGamepad } from "react-icons/fa";

<FaGamepad color={UNO_ICON_COLOR} />
```

#### `unoBrandGradient`

The signature UNO gradient style for titles and logos:

```tsx
import { unoBrandGradient } from "../theme";

<h1 style={unoBrandGradient}>UNO!</h1>
```

Or use the helper function:

```tsx
import { getUnoBrandGradient } from "../theme";

<h1 style={getUnoBrandGradient()}>UNO!</h1>
```

## Reusable Components

### UnoLogo

A reusable logo component with the signature UNO gradient styling.

**Location:** `src/components/common/uno-logo.tsx`

**Usage:**

```tsx
import { UnoLogo } from "../components/common";

// Default usage (size 60, with exclamation mark)
<UnoLogo />

// Custom size
<UnoLogo size={80} />

// Without exclamation mark
<UnoLogo withExclamation={false} />

// With custom title order
<UnoLogo order={2} size={40} />
```

**Props:**

- `size?: number` - Font size of the logo (default: 60)
- `withExclamation?: boolean` - Include "!" after UNO (default: true)
- All other Mantine `Title` props are supported

## Component Defaults

The theme configures default props for common components:

### Button

- Default size: `"md"`

### Card

- Default shadow: `"sm"`
- Default padding: `"lg"`
- Default radius: `"md"`
- Default withBorder: `true`

This means you can use `<Card>` without props and get consistent styling:

```tsx
// These are equivalent:
<Card />
<Card shadow="sm" padding="lg" radius="md" withBorder />
```

## Typography

### Font Family

The theme uses the system font stack for both body text and headings:

```
-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
```

### Headings

All headings use `fontWeight: 900` by default for a bold, game-like appearance.

## Gradients

### Default Gradient

The default gradient for gradient buttons and elements:

```tsx
<Button variant="gradient">Click Me</Button>
// Uses: from: "unoBlue.4", to: "cyan", deg: 90
```

### Custom Gradients

You can create custom gradients using the UNO colors:

```tsx
<Button 
  variant="gradient" 
  gradient={{ from: "unoRed", to: "unoYellow", deg: 45 }}
>
  Custom Gradient
</Button>
```

## Best Practices

1. **Always use theme colors** instead of hardcoded hex values
2. **Use the `UnoLogo` component** instead of creating custom logo implementations
3. **Leverage component defaults** - omit props when the defaults are appropriate
4. **Use `UNO_ICON_COLOR`** for all icons to maintain visual consistency
5. **Reference colors by name** (`color="unoBlue"`) instead of hex values

## Examples

### Feature Card with Icon

```tsx
import { Card, Stack, Title, Text } from "@mantine/core";
import { FaGamepad } from "react-icons/fa";
import { UNO_ICON_COLOR } from "../../theme";

<Card>
  <Stack gap="sm" align="center">
    <FaGamepad size={40} color={UNO_ICON_COLOR} />
    <Title order={3} size="h4">Feature Title</Title>
    <Text size="sm" c="dimmed" ta="center">
      Feature description text
    </Text>
  </Stack>
</Card>
```

### Hero Section with Logo

```tsx
import { Center, Stack, Text } from "@mantine/core";
import { UnoLogo } from "../components/common";

<Center>
  <Stack gap="md" align="center">
    <UnoLogo />
    <Text size="xl" c="dimmed" ta="center">
      Your tagline here
    </Text>
  </Stack>
</Center>
```

### Branded Button

```tsx
import { Button } from "@mantine/core";

<Button 
  variant="gradient"
  gradient={{ from: "blue", to: "cyan", deg: 90 }}
  size="lg"
>
  Get Started
</Button>
```

## Adding New Theme Elements

To add new reusable design elements:

1. **Colors:** Add to `src/theme.tsx` as new color tuples
2. **Constants:** Export from `src/theme.tsx` (e.g., spacing, sizes)
3. **Components:** Add to `src/components/common/` and export via index
4. **Document:** Update this file with usage examples

## Future Enhancements

Potential additions to the design system:

- Card components (UnoCard, WildCard, etc.)
- Game-specific UI components (PlayerHand, DrawPile, etc.)
- Animation utilities for card plays
- Responsive breakpoint constants
- Custom notification styles
- Badge/chip variants for game status
