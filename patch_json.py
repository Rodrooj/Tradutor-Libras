import json

def clean_dict(d):
    if isinstance(d, dict):
        if "module" in d:
            del d["module"]
        if "registered_name" in d:
            del d["registered_name"]
        
        # TF.js expects 'batch_input_shape' instead of 'batch_shape'
        if "batch_shape" in d:
            d["batch_input_shape"] = d["batch_shape"]
            del d["batch_shape"]
            
        # TF.js expects 'dtype' to be a string, but Keras 3 uses a dictionary
        if "dtype" in d and isinstance(d["dtype"], dict):
            if "config" in d["dtype"] and "name" in d["dtype"]["config"]:
                d["dtype"] = d["dtype"]["config"]["name"]

        for k, v in d.items():
            clean_dict(v)
    elif isinstance(d, list):
        for item in d:
            clean_dict(item)

path = "public/libras_model_tfjs/model.json"
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

if "modelTopology" in data:
    clean_dict(data["modelTopology"])
    
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print("model.json cleaned from all Keras 3 wrappers.")
