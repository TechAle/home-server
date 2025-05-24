import utils.PathUtils as pathUtils
from ast import FunctionDef

def getValue(value):
    if hasattr(value, "value"):
        return value.value
    elif hasattr(value, "elts"):
        return [getValue(x) for x in value.elts]

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


def getClassesWithRules(path, rules):
    # noinspection PyUnresolvedReferences
    functions_classes = [
        (file, class_name, element.name, decorator.func.id, decorator.keywords, decorator.args)
        for file in pathUtils.getAllPythonFromPath(path)
        for node, class_name in getClasses(file)
        for element in node.body
        if isinstance(element, FunctionDef)
        for decorator in element.decorator_list
        if hasattr(decorator, "func") and rules.__contains__(getattr(decorator.func, "id", None))
    ]

    # Initialize an empty dictionary to store the final result
    final_result = {}

    # Loop through each tuple to construct the dictionary
    for path, moduleName, function, rule, args, implicit_args in functions_classes:
        if path not in final_result:
            final_result[path] = {
                "path": path,
                "moduleName": moduleName,
                "functions": []
            }
        argsNew = {x.arg: getValue(x.value) for x in args}
        if len(implicit_args) != 0:
            argsNew["url"] = getValue(implicit_args[0])
        final_result[path]["functions"].append({
            "function": function,
            "rule": rule, "args": argsNew})

    # Convert the dictionary values to a list
    return list(final_result.values())

