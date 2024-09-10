const styles = getComputedStyle(document.body);

const fontMono = styles.getPropertyValue("--font-family-mono");
const colors = {
  base: styles.getPropertyValue("--color-base"),
  baseLighter: styles.getPropertyValue("--color-base-lighter"),
  baseLightest: styles.getPropertyValue("--color-base-lightest"),
  primary: styles.getPropertyValue("--color-primary"),
  primaryDark: styles.getPropertyValue("--color-primary-dark"),
  primaryLight: styles.getPropertyValue("--color-primary-light"),
  cyan50: styles.getPropertyValue("--color-cyan-50"),
};

export default {
  font: {
    mono: fontMono,
  },
  colors,
};
