import json

from tools.get_current_time import get_current_time, details as get_current_time_details
from tools.get_city_weather import get_city_weather, details as get_city_weather_details
from tools.get_user_city import get_user_city, details as get_user_city_details
from utilities.utilities import (
    log,
    RESET,
    BOLD,
    BRIGHT_YELLOW,
    BRIGHT_GREEN,
    BRIGHT_RED,
    BRIGHT_BLACK,
)

TOOLS = [
    get_current_time_details,
    get_city_weather_details,
    get_user_city_details
]

FUNCTION_NAME_TO_FUNCTION_MAP = {
    "get_current_time": get_current_time,
    "get_city_weather": get_city_weather,
    "get_user_city": get_user_city
}

def run_tool(tool_call):            
    function_name = tool_call.function.name

    try:
        function_args = json.loads(tool_call.function.arguments or "{}")
        args_str = ", ".join(f"{k}={v!r}" for k, v in function_args.items())
        log(f"{BRIGHT_YELLOW}⚙ Tool Call:{RESET} {BOLD}{function_name}{RESET}{BRIGHT_BLACK}({args_str}){RESET}")

        if function_name in FUNCTION_NAME_TO_FUNCTION_MAP:
            function = FUNCTION_NAME_TO_FUNCTION_MAP[function_name]
            result = function(**function_args)
        else:
            result = f"Error: Function '{function_name}' not found."
            log(f"  {BRIGHT_RED}✖ Error:{RESET} {result}")
        
    except Exception as e:
        result = f"Error while executing function '{function_name}': {e}"
        log(f"  {BRIGHT_RED}✖ Error:{RESET} {result}")

    log(f"  {BRIGHT_GREEN}↳ Result:{RESET} {BRIGHT_BLACK}{result}{RESET}")
    return result
