import os
import platform
import socket
import subprocess

import requests
import psutil
from subprocess import PIPE, Popen

from server.services.Routes import route


class computerManager:
    def __init__(self):
        pass

    @route("/get_computer_info", methods=["GET"])
    def get_computer_info(self):
        computer_info = {
            "system": platform.system(),
            "node_name": platform.node(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "hostname": socket.gethostname(),
            "ip_address": socket.gethostbyname(socket.gethostname()),
            "external_ip": requests.get('https://api.ipify.org').content.decode('utf8')
        }
        return computer_info

    @route("/get_cpu_temperature", methods=["GET"])
    def get_cpu_temperature(self):
        system = platform.system()
        if system == 'Linux' and os.path.exists('/usr/bin/vcgencmd'):
            process = Popen(['vcgencmd', 'measure_temp'], stdout=PIPE)
            output, _error = process.communicate()
            output = output.decode('utf-8')
            return float(output[output.index('=') + 1:output.rindex("'")])
        elif system == 'Darwin':
            return -591
        else:
            return -590

    @route("/get_memory_usage", methods=["GET"])
    def get_memory_usage(self):
        if platform.system() == "Darwin":
            return {
                "total_memory": -591,
                "used_memory": -591,
                "free_memory": -591,
                "memory_percent": -591
            }
        memory = psutil.virtual_memory()
        total_memory = memory.total / (1024 ** 3)
        used_memory = memory.used / (1024 ** 3)
        free_memory = memory.available / (1024 ** 3)
        memory_percent = memory.percent
        return {
            "total_memory": total_memory,
            "used_memory": used_memory,
            "free_memory": free_memory,
            "memory_percent": memory_percent
        }

    @route("/get_system_resource_info", methods=["GET"])
    def get_system_resource_info(self):
        if platform.system() == "Darwin":
            return {
            "cpu_temperature": -591,
            "cpu_usage_percent": -591,
            "ram": {
                "total_mib": -591,
                "used_mib": -591,
                "free_mib": -591,
                "percent_used": -591
            },
            "disk": {
                "total_gib": -591,
                "used_gib": -591,
                "free_gib": -591,
                "percent_used": -591
            }
        }
        cpu_temperature = self.get_cpu_temperature()
        cpu_usage = psutil.cpu_percent()

        # use the function
        data = self.get_memory_usage()
        ram_total = data["total_memory"]
        ram_used = data["used_memory"]
        ram_free = data["free_memory"]
        ram_percent_used = data["memory_percent"]

        disk = psutil.disk_usage('/')
        disk_total = disk.total / 2 ** 30  # GiB
        disk_used = disk.used / 2 ** 30
        disk_free = disk.free / 2 ** 30
        disk_percent_used = disk.percent

        return {
            "cpu_temperature": cpu_temperature,
            "cpu_usage_percent": cpu_usage,
            "ram": {
                "total_mib": ram_total,
                "used_mib": ram_used,
                "free_mib": ram_free,
                "percent_used": ram_percent_used
            },
            "disk": {
                "total_gib": disk_total,
                "used_gib": disk_used,
                "free_gib": disk_free,
                "percent_used": disk_percent_used
            }
        }
