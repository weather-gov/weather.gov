class FloatConverter:
    """Utility class to find and convert floating point numbers in URLs."""

    # Integers are floats that haven't found their dots.
    regex = "[-]?[0-9]+([.][0-9]+)?"

    def to_python(self, value):
        """Convert to float."""
        return float(value)

    def to_url(self, value):
        """No-op. Returns `value`."""
        return value
