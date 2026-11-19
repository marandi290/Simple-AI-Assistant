# test_embeddings.py

# standard library imports
import os

# third-party imports
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()   # by default searches for a .env file

client = OpenAI(
    base_url=os.getenv("BASE_URL"),
    api_key=os.getenv("API_KEY")
)

response = client.embeddings.create(
    model=os.getenv("EMBEDDINGS_MODEL"),
    input=["I am a good boy", "I am a programmer.", "Python is a good programming language."]
)

for data in response.data:
    print("================================")
    print(f"Embedding {data.index} length: {len(data.embedding)}")
    print("================================")
