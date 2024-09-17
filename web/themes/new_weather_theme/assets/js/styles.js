const styles = getComputedStyle(document.body);

const fontMono = styles.getPropertyValue("--font-family-mono");
const colors = {
  base: styles.getPropertyValue("--color-base"),
  baseLighter: styles.getPropertyValue("--color-base-lighter"),
  baseLightest: styles.getPropertyValue("--color-base-lightest"),
  primary: styles.getPropertyValue("--color-primary"),
  primaryDark: styles.getPropertyValue("--color-primary-dark"),
  primaryLight: styles.getPropertyValue("--color-primary-light"),
  secondary: styles.getPropertyValue("--color-secondary"),
  secondaryDarker: styles.getPropertyValue("--color-secondary-darker"),
  cyan50: styles.getPropertyValue("--color-cyan-50"),
  accentCoolDark: styles.getPropertyValue("--color-accent-cool-dark"),
};

export default {
  font: {
    mono: fontMono,
  },
  colors,
};
