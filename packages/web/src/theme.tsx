import { createTheme, type MantineColorsTuple } from "@mantine/core";

// UNO brand colors based on the classic UNO card game
const unoRed: MantineColorsTuple = [
  "#ffe5e5",
  "#ffc9c9",
  "#ff9191",
  "#ff5757",
  "#ff2626",
  "#e74c3c", // Main red
  "#d43f2f",
  "#c13024",
  "#a82419",
  "#8f1a0f",
];

const unoBlue: MantineColorsTuple = [
  "#e5f4ff",
  "#cce5ff",
  "#99cbff",
  "#66b0ff",
  "#3498db", // Main blue
  "#2980b9",
  "#2471a3",
  "#1f618d",
  "#1a5276",
  "#154360",
];

const unoGreen: MantineColorsTuple = [
  "#e5f9f0",
  "#ccf3e1",
  "#99e7c3",
  "#66dba5",
  "#33cf87",
  "#2ecc71", // Main green
  "#27ae60",
  "#229954",
  "#1e8449",
  "#196f3d",
];

const unoYellow: MantineColorsTuple = [
  "#fff9e5",
  "#fff3cc",
  "#ffe799",
  "#ffdb66",
  "#ffcf33",
  "#f39c12", // Main yellow/orange
  "#e67e22",
  "#d35400",
  "#ba4a00",
  "#a04000",
];

export const theme = createTheme({
  colors: {
    unoRed,
    unoBlue,
    unoGreen,
    unoYellow,
  },
  primaryColor: "unoBlue",
  defaultGradient: {
    from: "unoBlue.4",
    to: "cyan",
    deg: 90,
  },
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  headings: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontWeight: "900",
  },
  components: {
    Button: {
      defaultProps: {
        size: "md",
      },
    },
    Card: {
      defaultProps: {
        shadow: "sm",
        padding: "lg",
        radius: "md",
        withBorder: true,
      },
    },
  },
});

// UNO brand gradient for titles/logos
export const unoBrandGradient = {
  background: "linear-gradient(45deg, #e74c3c, #3498db, #2ecc71, #f39c12)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
} as const;

// Helper function to get UNO brand gradient style
export const getUnoBrandGradient = () => unoBrandGradient;

// UNO card colors (for game UI)
export const UNO_CARD_COLORS = {
  red: "#e74c3c",
  blue: "#3498db",
  green: "#2ecc71",
  yellow: "#f39c12",
} as const;

// Icon color for consistency
export const UNO_ICON_COLOR = "#3498db";
