# standard library imports
import os

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
    messages=[{"role": "user", "content": "Explain what an API is in 100 words or less. No need to mention the number of words in your response."}],
    stream=True
)

full_response = ""

for chunk in stream:
    #print(chunk.choices[0].delta.content, end="", flush=True)
    peice = chunk.choices[0].delta.content
    if peice:
        print(peice, end="", flush=True)
        full_response += peice

print("\n\nFull response: ", full_response)

