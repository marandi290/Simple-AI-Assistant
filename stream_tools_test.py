# standard library imports
import os
from types import SimpleNamespace

# third-party imports
from openai import OpenAI
from dotenv import load_dotenv

# local imports
from utilities.utilities import log
from tools import TOOLS, run_tool

load_dotenv()   # by default searches for a .env file

client = OpenAI(
    base_url=os.getenv("BASE_URL"),
    api_key=os.getenv("API_KEY")
)

stream = client.chat.completions.create(
    model=os.getenv("MODEL"),
    messages=[{"role": "user", "content": "Tell me the weather of Bangalore and the weather of Delhi"}],
    tools=TOOLS,
    stream=True,
)

calls = {}

for chunk in stream:
    if not chunk.choices:
        continue
    delta = chunk.choices[0].delta
    
    for tool_call in (delta.tool_calls or []):
        obj = calls.setdefault(tool_call.index,
                               SimpleNamespace(id = None,
                                               function = SimpleNamespace(name = "", arguments="")
                                               )
                                )
        if tool_call.id:
            obj.id = tool_call.id
        if tool_call.function and tool_call.function.name:
            obj.function.name += tool_call.function.name
        if tool_call.function and tool_call.function.arguments:
            obj.function.arguments += tool_call.function.arguments

calls_list = []
for key in sorted(calls):
    calls_list.append(calls[key])

print(calls_list)

