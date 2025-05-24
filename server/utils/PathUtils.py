import os

def getAllPythonFromPath(path):
    """
    Get all python files from a given path.
    :param path: Path to search for python files.
    :return: List of python files.
    """
    python_files = []
    for file in os.listdir(path):
        if file.endswith(".py"):
            python_files.append(os.path.join(path, file))
    return python_files

