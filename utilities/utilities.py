import os
import sys

# Configure UTF-8 encoding for standard output/error on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Initialize Windows console for ANSI escape sequences if running on Windows
if os.name == "nt":
    os.system("")

# ANSI Styles
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
ITALIC = "\033[3m"
UNDERLINE = "\033[4m"

# Standard Colors
RED = "\033[31m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
BLUE = "\033[34m"
MAGENTA = "\033[35m"
CYAN = "\033[36m"
WHITE = "\033[37m"

# High-Intensity / Bright Colors
BRIGHT_BLACK = "\033[90m"   # Muted gray / subtle borders
BRIGHT_RED = "\033[91m"
BRIGHT_GREEN = "\033[92m"
BRIGHT_YELLOW = "\033[93m"
BRIGHT_BLUE = "\033[94m"
BRIGHT_MAGENTA = "\033[95m"
BRIGHT_CYAN = "\033[96m"
BRIGHT_WHITE = "\033[97m"

# Semantic Theme
C_USER = f"{BOLD}{BRIGHT_CYAN}"
C_ASSISTANT = f"{BOLD}{BRIGHT_MAGENTA}"
C_TOOL = f"{BOLD}{BRIGHT_YELLOW}"
C_RESULT = f"{BRIGHT_GREEN}"
C_ERROR = f"{BOLD}{BRIGHT_RED}"
C_MUTED = f"{BRIGHT_BLACK}"
C_ACCENT = f"{BOLD}{BRIGHT_BLUE}"

# Kept for backward compatibility
START_SEQUENCE = BRIGHT_BLACK
END_SEQUENCE = RESET


def print_banner(model: str = "qwen3:4b"):
    """
    Displays a stylish startup banner in the terminal with ANSI colors.
    """
    width = 56
    line = "─" * (width - 2)
    print(f"\n{BRIGHT_CYAN}╭{line}╮{RESET}")
    title = "✦  SIMPLE AI ASSISTANT  ✦"
    print(f"{BRIGHT_CYAN}│{RESET}{BOLD}{BRIGHT_WHITE}{title:^{width - 2}}{RESET}{BRIGHT_CYAN}│{RESET}")
    subtitle = f"Model: {model}  •  Type 'exit' to quit"
    print(f"{BRIGHT_CYAN}│{RESET}{BRIGHT_BLACK}{subtitle:^{width - 2}}{RESET}{BRIGHT_CYAN}│{RESET}")
    print(f"{BRIGHT_CYAN}╰{line}╯{RESET}\n")


def divider(width: int = 56):
    """
    Prints a subtle horizontal divider line.
    """
    print(f"\n{BRIGHT_BLACK}{'─' * width}{RESET}")


def log(text):
    """
    Logs the provided text to the console if DEBUG is set to True in the environment variables.
    """
    if os.getenv("DEBUG") == "True":
        print(f"  {text}{RESET}")
