try:
    import duckduckgo_search
    print(f"Successfully imported duckduckgo_search version: {duckduckgo_search.__version__}")
    print(f"duckduckgo_search contents: {dir(duckduckgo_search)}")
except ImportError as e:
    print(f"Failed to import duckduckgo_search: {e}")

try:
    from duckduckgo_search import DDGS
    print("Successfully imported DDGS directly")
    with DDGS() as ddgs:
        results = list(ddgs.text("medical symptoms", max_results=3))
        print(f"Successfully performed search. Results: {len(results)}")
except Exception as e:
    print(f"Failed to use DDGS directly: {e}")
