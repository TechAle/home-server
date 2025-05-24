from server.services.executables.ComputerManager import computerManager

manager = computerManager()

info = manager.get_computer_info()
resource_info = manager.get_system_resource_info()

print("Computer Info:")
for k, v in info.items():
    print(f"{k}: {v}")

print("\nSystem Resource Info:")
for k, v in resource_info.items():
    if isinstance(v, dict):
        print(f"{k}:")
        for sub_k, sub_v in v.items():
            print(f"  {sub_k}: {sub_v}")
    elif isinstance(v, list):
        print(f"{k}:")
        for item in v:
            print(f"  {item}")
    else:
        print(f"{k}: {v}")