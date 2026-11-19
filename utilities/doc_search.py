import os
from dotenv import load_dotenv

from semantic_search import cosine_similarity, get_embeddings

load_dotenv()

KB_FOLDER = os.getenv("KB_FOLDER")

def load_documents(folder_path):
    """
    Load documents from the specified folder.

    Args:
        folder_path (str): The path to the folder containing documents.

    Returns:
        list: A list of loaded document contents.
    """
    documents = []
    for filename in os.listdir(folder_path):
        if not filename.endswith(('.md', '.txt', '.text')):  # Load .md, .txt, and .text files
            continue  # Skip unsupported files
        with open(os.path.join(folder_path, filename), 'r', encoding='utf-8') as f:
            documents.append(
                {"source": filename, "text": f.read()}
            )

    return documents

def add_embeddings(documents):
    """
    Add embeddings to the documents.

    Args:
        documents (list): A list of document dictionaries.

    Returns:
        list: A list of document dictionaries with embeddings added.
    """

    for doc in documents:
        doc["vector"] = get_embeddings([doc["text"]])[0]
    return documents

def search(query, documents, top_k=3):
    """
    Search for the most relevant documents based on the query.

    Args:
        query (str): The search query.
        documents (list): A list of document dictionaries with embeddings.
        top_k (int): The number of top results to return.
    """
    query_embedding = get_embeddings([query])[0]
    results = []
    for doc in documents:
        score = cosine_similarity(query_embedding, doc["vector"])
        results.append({
            "score": score,
            "source": doc["source"],
            "text": doc["text"],
            "size": len(doc["text"])
        })
    # sort the result in descending order of score
    results.sort(key=lambda rec: rec["score"], reverse=True)
    return results[:top_k]

def test(user_query, documents, top_k=3):
    """
    Test the search functionality with a user query.

    Args:
        user_query (str): The search query.
        documents (list): A list of document dictionaries with embeddings.
        top_k (int): The number of top results to return.
    """
    print(f"Searching for: '{user_query}'")

    results = search(user_query, documents, top_k)
    for result in results:
        print(f"Score: {result['score']:.4f}, Source: {result['source']}, Size: {result['size']} characters")

# Let's start testing
documents = load_documents(KB_FOLDER)
documents_with_embeddings = add_embeddings(documents)

print(f"We have embedded {len(documents_with_embeddings)} documents from the knowledge base.")

user_query = "How many days I will get for maternity leaves?"

test(user_query, documents_with_embeddings, top_k=3)