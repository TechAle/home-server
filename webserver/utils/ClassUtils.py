import webserver.utils.PathUtils as pathUtils
from ast import FunctionDef


def getClasses(file):
    """
    Get all classes from a given file.
    :param file: File to search for classes.
    :return: List of classes.
    """
    import ast
    with open(file, "r") as f:
        node = ast.parse(f.read(), filename=file)
        classes = [(n, n.name) for n in node.body if isinstance(n, ast.ClassDef)]
        return classes


def getClassesWithRoutes(path):
    return [
        (file, class_name, element.name)
        for file in pathUtils.getAllPythonFromPath(path)
        for node, class_name in getClasses(file)
        for element in node.body
        if isinstance(element, FunctionDef)
        for decorator in element.decorator_list
        if hasattr(decorator, "func") and getattr(decorator.func, "id", None) == "route"
    ]
