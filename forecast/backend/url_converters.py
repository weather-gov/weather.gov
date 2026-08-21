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


class WFOConverter:
    """Utility class to find and convert WFO codes in URLs."""

    regex = "[A-Za-z]{3}"

    def to_python(self, value):
        """Convert to string."""
        return value

    def to_url(self, value):
        """Convert to string for url."""
        return value


class AFDIdentifierConverter:
    """Utility class to find and convert AFD IDs in URLs."""

    regex = "[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}"

    def to_python(self, value):
        """Return as string."""
        return value

    def to_url(self, value):
        """Return as string."""
        return value


class FIPSConverter:
    """Utility class to find and convert county FIPS codes in URLs."""

    regex = "[0-9]{5}"

    def to_python(self, value):
        """Return as string."""
        return value

    def to_url(self, value):
        """Return as string."""
        return value


class StateCodeConverter:
    """Utility class to find and convert two-letter state codes in URLs."""

    regex = "[A-Za-z]{2}"

    def to_python(self, value):
        """Return as string."""
        return value

    def to_url(self, value):
        """Return as string."""
        return value


class PlaceNameConverter:
    """Utility class to find and convert slugs for place names in URLs."""

    regex = "[A-Za-z_ ]+"

    def to_python(self, value):
        """Return as string."""
        return value

    def to_url(self, value):
        """Return as string."""
        return value
