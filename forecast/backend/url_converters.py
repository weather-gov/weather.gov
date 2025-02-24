class FloatConverter:
    regex = "[-]?[0-9]+[.][0-9]+"

    def to_python(self, value):
        return float(value)

    def to_url(self, value):
        return value
