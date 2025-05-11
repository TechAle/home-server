from _ast import FunctionDef

import webserver.utils.PathUtils as pathUtils
from webserver.utils import ClassUtils

# noinspection PyUnresolvedReferences
from ast import FunctionDef

from webserver.utils.ClassUtils import getClasses, getValue

rules = ["scheduled_task", "route", "server_function"]
path = "webserver/services/executables"

results = [
        (file, class_name, element.name, decorator.func.id, decorator.keywords)
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
for path, moduleName, function, rule, args in results:
    if path not in final_result:
        final_result[path] = {
            "path": path,
            "moduleName": moduleName,
            "functions": []
        }
    argsNew = {x.arg: getValue(x.value) for x in args}
    final_result[path]["functions"].append({"function": function, "rule": rule, "args": argsNew})

# Convert the dictionary values to a list
final_result_list = list(final_result.values())

# Print the result
print(final_result_list)
