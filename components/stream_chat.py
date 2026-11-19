from types import SimpleNamespace
from utilities.utilities import (
    RESET,
    BOLD,
    BRIGHT_MAGENTA,
    BRIGHT_YELLOW,
)


def stream(client, MODEL, messages, TOOLS):
    full_response = ""
    calls = {}
    label_printed = False
    error = False

    try:
        stream_response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=TOOLS,
            stream=True,
        )

        for chunk in stream_response:
            if not chunk.choices:
                continue

            delta = chunk.choices[0].delta

            # 1. Content Streaming: Do we have message (content) from the LLM?
            if delta.content:
                if not label_printed:
                    print(f"\n{BRIGHT_MAGENTA}{BOLD}✦ Assistant:{RESET} ", end="", flush=True)
                    label_printed = True
                print(delta.content, end="", flush=True)
                full_response += delta.content

            # 2. Tool Calls
            for tool_call in (delta.tool_calls or []):
                obj = calls.setdefault(
                    tool_call.index,
                    SimpleNamespace(
                        id=None,
                        function=SimpleNamespace(name="", arguments=""),
                    ),
                )
                if tool_call.id:
                    obj.id = tool_call.id
                if tool_call.function and tool_call.function.name:
                    obj.function.name += tool_call.function.name
                if tool_call.function and tool_call.function.arguments:
                    obj.function.arguments += tool_call.function.arguments

    except KeyboardInterrupt:
        error=True
        if label_printed:
            print()
        print("{you interrupted}")
    if label_printed:
        print()

    return full_response, calls, error
