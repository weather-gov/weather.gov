const styles = getComputedStyle(document.body);

const fontMono = styles.getPropertyValue("--font-family-mono");
const colors = {
  base: styles.getPropertyValue("--color-base"),
  baseLight: styles.getPropertyValue("--color-base-light"),
  baseLighter: styles.getPropertyValue("--color-base-lighter"),
  baseLightest: styles.getPropertyValue("--color-base-lightest"),
  baseDarker: styles.getPropertyValue("--color-base-darker"),
  primary: styles.getPropertyValue("--color-primary"),
  primaryDark: styles.getPropertyValue("--color-primary-dark"),
  primaryLight: styles.getPropertyValue("--color-primary-light"),
  secondary: styles.getPropertyValue("--color-secondary"),
  secondaryDarker: styles.getPropertyValue("--color-secondary-darker"),
  cyan50: styles.getPropertyValue("--color-cyan-50"),
  cyan60: styles.getPropertyValue("--color-cyan-60"),
  cyan80: styles.getPropertyValue("--color-cyan-80"),
  accentCool: styles.getPropertyValue("--color-accent-cool"),
  accentCoolDark: styles.getPropertyValue("--color-accent-cool-dark"),
  white: styles.getPropertyValue("--color-white"),
};

export default {
  font: {
    mono: fontMono,
  },
  colors,
};
