import { Title, type TitleProps } from "@mantine/core";
import { unoBrandGradient } from "../../theme";

interface UnoLogoProps extends Omit<TitleProps, "style"> {
  /**
   * Size of the logo text
   * @default 60
   */
  size?: number;
  /**
   * Whether to include the exclamation mark
   * @default true
   */
  withExclamation?: boolean;
}

/**
 * Reusable UNO logo component with brand gradient styling
 */
export const UnoLogo = ({
  size = 60,
  withExclamation = true,
  order = 1,
  fw = 900,
  ...props
}: UnoLogoProps) => {
  return (
    <Title
      order={order}
      size={size}
      fw={fw}
      style={unoBrandGradient}
      {...props}
    >
      UNO{withExclamation ? "!" : ""}
    </Title>
  );
};
