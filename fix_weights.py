import json

with open('public/libras_model_tfjs/model.json', 'r') as f:
    data = json.load(f)

weights = data['weightsManifest'][0]['weights']

# Rename weights to match TFJS expectations
expected_names = [
    "lstm/lstm_cell/kernel",
    "lstm/lstm_cell/recurrent_kernel",
    "lstm/lstm_cell/bias",
    "lstm_1/lstm_cell/kernel",
    "lstm_1/lstm_cell/recurrent_kernel",
    "lstm_1/lstm_cell/bias",
    "dense/kernel",
    "dense/bias",
    "dense_1/kernel",
    "dense_1/bias",
    "dense_2/kernel",
    "dense_2/bias"
]

if len(weights) == len(expected_names):
    for i, w in enumerate(weights):
        w['name'] = expected_names[i]
    
    with open('public/libras_model_tfjs/model.json', 'w') as f:
        json.dump(data, f, indent=2)
    print("Fixed weight names!")
else:
    print(f"Mismatch in weights count: {len(weights)} vs {len(expected_names)}")
