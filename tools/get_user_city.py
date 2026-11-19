def get_user_city():
    """
    Prompts the user to enter a city name and returns it.
    """
    return "Bangalore"  # Placeholder for actual user input

details = {
    "type": "function",
    "function": {
        "name": "get_user_city",
        "description": "Returns the city where the user lives.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    }
}
