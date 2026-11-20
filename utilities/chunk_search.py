# standard library imports
import os
import re
import json

# third-party imports
from dotenv import load_dotenv

# local imports
try:
    from semantic_search import cosine_similarity, get_embeddings
except ImportError:
    from utilities.semantic_search import cosine_similarity, get_embeddings

load_dotenv()

# Resolve knowledge base folder relative to project root
raw_kb = os.getenv("KB_FOLDER", "knowledge_base")
if not os.path.isabs(raw_kb):
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    KB_FOLDER = os.path.join(project_root, raw_kb)
else:
    KB_FOLDER = raw_kb

VECTOR_STORE_FILE = os.path.join(KB_FOLDER, "vector_store.json")


def load_documents(folder_path):
    """
    Loads text and markdown documents from the specified directory.

    Args:
        folder_path (str): Path to the knowledge base directory.

    Returns:
        list: List of document dicts with 'source' and 'text'.
    """
    if not os.path.exists(folder_path):
        raise FileNotFoundError(f"Knowledge base folder not found at: {folder_path}")

    documents = []
    for filename in sorted(os.listdir(folder_path)):
        if not filename.endswith(('.txt', '.text', '.md')):
            continue

        file_path = os.path.join(folder_path, filename)
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            documents.append({
                "source": filename,
                "text": f.read()
            })

    return documents


def chunk_by_sections(document):
    """
    Splits a document into chunks based on section headers:
        ==================================================
        SECTION: <SECTION TITLE>
        ==================================================

    Falls back to paragraph-based chunking if no explicit sections are found.

    Args:
        document (dict): Document with 'source' and 'text'.

    Returns:
        list: List of chunk dicts.
    """
    text = document["text"]
    source = document["source"]

    # Extract Document Title if present (e.g., DOCUMENT: <TITLE>)
    doc_title_match = re.search(r"^DOCUMENT:\s*(.+)$", text, re.MULTILINE)
    doc_title = doc_title_match.group(1).strip() if doc_title_match else source

    # Pattern matching section headers: =+\nSECTION: <TITLE>\n=+
    section_pattern = r"(?:^|\n)=+\s*\nSECTION:\s*(.+?)\s*\n=+\s*\n"
    matches = list(re.finditer(section_pattern, text))

    chunks = []

    if matches:
        for i, match in enumerate(matches):
            section_name = match.group(1).strip()
            start_pos = match.end()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            section_body = text[start_pos:end_pos].strip()

            if not section_body:
                continue

            # Format chunk with contextual document & section prefix
            chunk_content = f"Document: {doc_title}\nSection: {section_name}\n\n{section_body}"

            chunks.append({
                "source": source,
                "document_title": doc_title,
                "section": section_name,
                "chunk_id": len(chunks) + 1,
                "text": chunk_content,
                "size": len(chunk_content)
            })

    else:
        # Fallback: chunk by non-empty paragraphs
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        for idx, para in enumerate(paragraphs, start=1):
            chunk_content = f"Document: {doc_title}\n\n{para}"
            chunks.append({
                "source": source,
                "document_title": doc_title,
                "section": f"Paragraph {idx}",
                "chunk_id": idx,
                "text": chunk_content,
                "size": len(chunk_content)
            })

    return chunks


def chunk_documents(documents):
    """
    Processes all documents into granular section chunks.

    Args:
        documents (list): List of loaded documents.

    Returns:
        list: Aggregated list of all chunk dicts across documents.
    """
    all_chunks = []
    for doc in documents:
        doc_chunks = chunk_by_sections(doc)
        all_chunks.extend(doc_chunks)
    return all_chunks


def add_embeddings(chunks, batch_size=5):
    """
    Computes and attaches vector embeddings to each chunk in batches.

    Args:
        chunks (list): List of chunk dicts.
        batch_size (int): Number of chunks to embed in a single API call.

    Returns:
        list: Chunks with 'vector' key added.
    """
    total = len(chunks)
    print(f"Generating embeddings for {total} chunks in batches of {batch_size}...")

    for i in range(0, total, batch_size):
        batch = chunks[i:i + batch_size]
        batch_texts = [c["text"] for c in batch]
        embeddings = get_embeddings(batch_texts)

        for chunk, emb in zip(batch, embeddings):
            chunk["vector"] = emb

        print(f"  Processed {min(i + batch_size, total)}/{total} chunks...")

    return chunks


def save_vector_store(chunks, file_path=VECTOR_STORE_FILE):
    """
    Saves chunks and their embedding vectors to a local JSON file.

    Args:
        chunks (list): List of chunk dicts including 'vector'.
        file_path (str): Destination path for vector_store.json.
    """
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)
    print(f"Successfully saved {len(chunks)} chunks with embeddings to '{file_path}'.")


def load_vector_store(file_path=VECTOR_STORE_FILE):
    """
    Loads pre-computed chunks and embeddings from a local JSON file.

    Args:
        file_path (str): Path to vector_store.json.

    Returns:
        list: Cached chunks with their embeddings.
    """
    with open(file_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)
    print(f"Successfully loaded {len(chunks)} cached chunks with embeddings from '{file_path}'.")
    return chunks


def get_or_create_chunks(folder_path=KB_FOLDER, vector_store_file=VECTOR_STORE_FILE, force_refresh=False):
    """
    Checks if vector_store.json exists.
    - If present (and not force_refresh): loads chunks directly from the file.
    - If absent: loads documents, chunks them, generates embeddings, and saves to file.

    Args:
        folder_path (str): Path to knowledge base docs folder.
        vector_store_file (str): Path to vector_store.json file.
        force_refresh (bool): When True, re-chunks and re-embeds even if file exists.

    Returns:
        list: List of chunk dicts with embeddings ready for search.
    """
    if os.path.exists(vector_store_file) and not force_refresh:
        print(f"Found existing vector store: '{vector_store_file}'")
        return load_vector_store(vector_store_file)

    print(f"No existing vector store found at '{vector_store_file}'.")
    print(f"Loading documents from: {folder_path}")
    documents = load_documents(folder_path)
    print(f"Loaded {len(documents)} documents.")

    chunks = chunk_documents(documents)
    print(f"Created {len(chunks)} section chunks.")

    chunks_with_embeddings = add_embeddings(chunks)
    print(f"All {len(chunks_with_embeddings)} chunks successfully embedded.")

    save_vector_store(chunks_with_embeddings, vector_store_file)
    return chunks_with_embeddings


def search(query, chunks, top_k=3):
    """
    Searches for the most relevant chunks using cosine similarity.

    Args:
        query (str): User's natural language search query.
        chunks (list): List of embedded chunk dicts.
        top_k (int): Number of top results to return.

    Returns:
        list: Top K relevant chunks sorted by similarity score descending.
    """
    query_embedding = get_embeddings([query])[0]
    results = []

    for chunk in chunks:
        score = cosine_similarity(query_embedding, chunk["vector"])
        results.append({
            "score": score,
            "source": chunk["source"],
            "section": chunk.get("section", "N/A"),
            "text": chunk["text"],
            "size": chunk["size"]
        })

    # Sort descending by cosine similarity score
    results.sort(key=lambda rec: rec["score"], reverse=True)
    return results[:top_k]


def test(user_query, chunks, top_k=3):
    """
    Runs a test search and prints formatted top results.
    """
    print(f"\nSearching for: '{user_query}'")
    print("=" * 60)

    results = search(user_query, chunks, top_k)
    for idx, result in enumerate(results, start=1):
        print(f"\nResult #{idx} (Score: {result['score']:.4f})")
        print(f"Source:  {result['source']}  |  Section: {result['section']}")
        print(f"Length:  {result['size']} characters")
        print("-" * 60)
        # Display preview of text
        preview = result['text']
        if len(preview) > 250:
            preview = preview[:250] + "..."
        print(preview)


if __name__ == "__main__":
    # Check if vector_store.json exists; load it or build a new one
    chunks_with_embeddings = get_or_create_chunks()

    # Test query
    sample_query = "How many days I will get for maternity leaves?"
    test(sample_query, chunks_with_embeddings, top_k=3)
