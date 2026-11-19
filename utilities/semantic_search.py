# standard library imports
import os

# third-party imports
from openai import OpenAI
from dotenv import load_dotenv
import numpy as np

load_dotenv()   # by default searches for a .env file

client = OpenAI(
    base_url=os.getenv("BASE_URL"),
    api_key=os.getenv("API_KEY")
)

def get_embeddings(texts):
    response = client.embeddings.create(
        model=os.getenv("EMBEDDINGS_MODEL"),
        input=texts
    )
    return [data.embedding for data in response.data]

def cosine_similarity(vec1, vec2):
    vec1 = np.array(vec1)
    vec2 = np.array(vec2)
    dot_product = np.dot(vec1, vec2)
    magnitude_vec1 = np.linalg.norm(vec1)
    magnitude_vec2 = np.linalg.norm(vec2)

    if magnitude_vec1 == 0 or magnitude_vec2 == 0:
        return 0.0

    return dot_product / (magnitude_vec1 * magnitude_vec2)
