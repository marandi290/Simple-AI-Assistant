from datetime import datetime

def get_current_time():
    """
    Returns the current time in seconds since the epoch.
    """
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

details = {
    "type": "function",
    "function": {
        "name": "get_current_time",
        "description": "Returns the current date and time in the format YYYY-MM-DD HH:MM:SS.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    }
}