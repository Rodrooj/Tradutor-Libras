import * as tf from '@tensorflow/tfjs';

async function test() {
  try {
    console.log('Loading model...');
    const model = await tf.loadLayersModel('http://localhost:5173/libras_model_tfjs/model.json');
    console.log('Model loaded successfully!');
  } catch (err) {
    console.error('Error loading model:', err);
  }
}

test();
