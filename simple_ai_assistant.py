# standard library imports
import os

# third-party imports
from openai import OpenAI
from dotenv import load_dotenv

# local imports
from utilities.utilities import (
    log,
    print_banner,
    divider,
    RESET,
    BOLD,
    BRIGHT_CYAN,
    BRIGHT_RED,
)
from tools import TOOLS, run_tool
from components.stream_chat import stream

load_dotenv()   # by default searches for a .env file

client = OpenAI(
    base_url=os.getenv("BASE_URL"),
    api_key=os.getenv("API_KEY")
)
MODEL = os.getenv("MODEL", "qwen3:4b")

messages = []
messages.append(
    {
        "role": "system",
        "content": "Act as a senior software engineer."
    }
)
messages.append(
    {
        "role": "system",
        "content": "Keep your answers concise and to the point. However, you should be able to clarify the concepts."
    }
)

# Display startup banner
print_banner(MODEL)

while True:
    try:
        user_input = input(f"\n{BRIGHT_CYAN}{BOLD}❯ Prakash:{RESET} ").strip()
    except (KeyboardInterrupt, EOFError):
        print(f"\n\n{BRIGHT_CYAN}✦ Goodbye, Prakash! Have a great day.{RESET}\n")
        break

    if not user_input:
        continue

    if user_input.lower() in ["exit", "quit", "bye"]:
        print(f"\n{BRIGHT_CYAN}✦ Goodbye, Prakash! Have a great day.{RESET}\n")
        break

    messages.append({"role": "user", "content": user_input})

    MAX_STEPS = 10

    # chained tool calls
    for _ in range(MAX_STEPS):

        full_response, calls, error = stream(client, MODEL, messages, TOOLS)

        if error:
            break

        if full_response:
            messages.append({"role": "assistant", "content": full_response})
            break
        else:
            for tool_call in calls.values():
                result = run_tool(tool_call)
                messages.append({"role": "tool", "content": str(result), "tool_call_id": tool_call.id})

    else:
        # Ran out of steps: The model never gave the final answer
        fallback = f"{BRIGHT_RED}⚠ Sorry, I couldn't provide a final answer within the allowed steps.{RESET}"
        print(f"\n{fallback}")
        messages.append({"role": "assistant", "content": fallback})

    # Subtle divider after each turn
    divider()
