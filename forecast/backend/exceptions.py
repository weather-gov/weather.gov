class Http429(Exception):  # noqa: N818
    """Custom exception for 429 interop responses."""

    def __init__(self, message="Too many requests"):
        self.message = message
        super().__init__(self.message)
