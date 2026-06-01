import tensorflowjs as tfjs
from tensorflow import keras
import os

model_path = "libras_model.keras"
output_dir = "public/libras_model_tfjs"

if not os.path.exists(model_path):
    print("Modelo Keras não encontrado!")
else:
    model = keras.models.load_model(model_path)
    tfjs.converters.save_keras_model(model, output_dir)
    print("Modelo convertido com tensorflowjs com sucesso para:", output_dir)
