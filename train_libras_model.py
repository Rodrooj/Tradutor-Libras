#!/usr/bin/env python3
"""
Tradutor de Libras para Áudio - Script de Treinamento do Modelo LSTM
=====================================================================

Este script treina um modelo LSTM para classificar 10 sinais de Libras
usando landmarks do MediaPipe Pose (33 landmarks × 3 coordenadas = 99 features).

Os dados são gerados com padrões biomecânicos realistas baseados na
descrição linguística de cada sinal em Libras, com data augmentation
para robustez.

Sinais treinados:
  0: Olá        1: Obrigado    2: Água      3: Ajuda     4: Sim
  5: Não        6: Tudo bem    7: Tchau     8: Desculpa  9: Por favor

Saída:
  - public/libras_model_tfjs/   (modelo TensorFlow.js para browser)
  - public/class_mapping.json   (mapeamento de classes)
  - public/scaler.json          (parâmetros do StandardScaler)
  - libras_model.keras          (modelo Keras completo)

Uso:
  python train_libras_model.py
"""

import json
import os
import sys
import numpy as np

# ---------------------------------------------------------------------------
# Instalação automática de dependências
# ---------------------------------------------------------------------------

def ensure_dependencies():
    """Instala dependências necessárias se não estiverem disponíveis."""
    required = {
        'tensorflow': 'tensorflow',
        'sklearn': 'scikit-learn',
    }
    for module, package in required.items():
        try:
            __import__(module)
        except ImportError:
            print(f"📦 Instalando {package}...")
            os.system(f"{sys.executable} -m pip install {package} -q")

ensure_dependencies()

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------

# Parâmetros do modelo
NUM_FRAMES = 30          # Frames por sequência
NUM_LANDMARKS = 33       # Landmarks do MediaPipe Pose
NUM_COORDS = 3           # x, y, z
NUM_FEATURES = NUM_LANDMARKS * NUM_COORDS  # 99
NUM_CLASSES = 10         # Número de sinais

# Parâmetros de treinamento
EPOCHS = 50
BATCH_SIZE = 32
LEARNING_RATE = 0.001
VALIDATION_SPLIT = 0.2
EARLY_STOPPING_PATIENCE = 10

# Amostras por classe (com augmentation)
SAMPLES_PER_CLASS = 500
AUGMENTATION_FACTOR = 3  # Multiplicador de augmentation

# Mapeamento de classes
CLASS_MAPPING = {
    0: "Olá",
    1: "Obrigado",
    2: "Água",
    3: "Ajuda",
    4: "Sim",
    5: "Não",
    6: "Tudo bem",
    7: "Tchau",
    8: "Desculpa",
    9: "Por favor"
}

# Diretórios de saída
OUTPUT_DIR = "public"
MODEL_DIR = os.path.join(OUTPUT_DIR, "libras_model_tfjs")

# ---------------------------------------------------------------------------
# MediaPipe Pose Landmark indices (referência)
# ---------------------------------------------------------------------------
# 0:  nose              1:  left_eye_inner     2:  left_eye
# 3:  left_eye_outer    4:  right_eye_inner    5:  right_eye
# 6:  right_eye_outer   7:  left_ear           8:  right_ear
# 9:  mouth_left        10: mouth_right        11: left_shoulder
# 12: right_shoulder    13: left_elbow         14: right_elbow
# 15: left_wrist        16: right_wrist        17: left_pinky
# 18: right_pinky       19: left_index         20: right_index
# 21: left_thumb        22: right_thumb        23: left_hip
# 24: right_hip         25: left_knee          26: right_knee
# 27: left_ankle        28: right_ankle        29: left_heel
# 30: right_heel        31: left_foot_index    32: right_foot_index

# Landmark groups for easier reference
NOSE = 0
L_SHOULDER = 11; R_SHOULDER = 12
L_ELBOW = 13;    R_ELBOW = 14
L_WRIST = 15;    R_WRIST = 16
L_PINKY = 17;    R_PINKY = 18
L_INDEX = 19;    R_INDEX = 20
L_THUMB = 21;    R_THUMB = 22
L_HIP = 23;      R_HIP = 24

# ---------------------------------------------------------------------------
# Base Pose — posição neutra do corpo humano em pé
# ---------------------------------------------------------------------------

def create_base_pose():
    """
    Cria uma pose base realista de um corpo humano em pé,
    com coordenadas normalizadas [0, 1] conforme MediaPipe.
    
    Coordenadas: x (horizontal), y (vertical, 0=topo), z (profundidade)
    """
    pose = np.zeros((NUM_LANDMARKS, NUM_COORDS))
    
    # Cabeça e rosto
    pose[0]  = [0.50, 0.15, 0.00]  # nose
    pose[1]  = [0.48, 0.13, -0.01] # left_eye_inner
    pose[2]  = [0.46, 0.13, -0.01] # left_eye
    pose[3]  = [0.44, 0.13, -0.01] # left_eye_outer
    pose[4]  = [0.52, 0.13, -0.01] # right_eye_inner
    pose[5]  = [0.54, 0.13, -0.01] # right_eye
    pose[6]  = [0.56, 0.13, -0.01] # right_eye_outer
    pose[7]  = [0.40, 0.14, 0.02]  # left_ear
    pose[8]  = [0.60, 0.14, 0.02]  # right_ear
    pose[9]  = [0.48, 0.18, 0.00]  # mouth_left
    pose[10] = [0.52, 0.18, 0.00]  # mouth_right
    
    # Tronco
    pose[11] = [0.38, 0.28, 0.00]  # left_shoulder
    pose[12] = [0.62, 0.28, 0.00]  # right_shoulder
    
    # Braços (posição relaxada ao lado do corpo)
    pose[13] = [0.32, 0.40, 0.02]  # left_elbow
    pose[14] = [0.68, 0.40, 0.02]  # right_elbow
    pose[15] = [0.30, 0.52, 0.01]  # left_wrist
    pose[16] = [0.70, 0.52, 0.01]  # right_wrist
    
    # Mãos
    pose[17] = [0.29, 0.55, 0.01]  # left_pinky
    pose[18] = [0.71, 0.55, 0.01]  # right_pinky
    pose[19] = [0.30, 0.54, 0.00]  # left_index
    pose[20] = [0.70, 0.54, 0.00]  # right_index
    pose[21] = [0.31, 0.53, -0.01] # left_thumb
    pose[22] = [0.69, 0.53, -0.01] # right_thumb
    
    # Quadril
    pose[23] = [0.42, 0.55, 0.00]  # left_hip
    pose[24] = [0.58, 0.55, 0.00]  # right_hip
    
    # Pernas
    pose[25] = [0.42, 0.72, 0.01]  # left_knee
    pose[26] = [0.58, 0.72, 0.01]  # right_knee
    pose[27] = [0.42, 0.90, 0.00]  # left_ankle
    pose[28] = [0.58, 0.90, 0.00]  # right_ankle
    pose[29] = [0.41, 0.92, -0.01] # left_heel
    pose[30] = [0.59, 0.92, -0.01] # right_heel
    pose[31] = [0.42, 0.93, 0.02]  # left_foot_index
    pose[32] = [0.58, 0.93, 0.02]  # right_foot_index
    
    return pose


# ---------------------------------------------------------------------------
# Padrões de movimento para cada sinal de Libras
# ---------------------------------------------------------------------------
# Cada função de sinal retorna uma sequência de NUM_FRAMES poses.
# Os movimentos são baseados em descrições linguísticas reais dos sinais
# em Libras, aplicados sobre os landmarks do MediaPipe Pose.
# ---------------------------------------------------------------------------

def generate_ola(base_pose, rng):
    """
    Sinal: OLÁ
    Descrição: Mão aberta ao lado da cabeça, balançando de um lado para outro
    (como um aceno). A mão direita sobe até a altura da cabeça e oscila
    horizontalmente 2-3 vezes.
    """
    frames = []
    for f in range(NUM_FRAMES):
        pose = base_pose.copy()
        t = f / NUM_FRAMES
        
        # Mão direita sobe até a altura da cabeça
        raise_t = min(t * 3, 1.0)  # Sobe nos primeiros 1/3
        
        # Movimento de aceno lateral (oscilação)
        wave_freq = 3.0  # 3 acenos
        wave_x = 0.08 * np.sin(2 * np.pi * wave_freq * t)
        
        # Posição da mão direita (acenando ao lado da cabeça)
        pose[R_WRIST] = [
            0.72 + wave_x,
            0.28 - raise_t * 0.15,  # Sobe
            -0.05
        ]
        pose[R_ELBOW] = [
            0.68,
            0.28 + (1 - raise_t) * 0.12,
            0.02
        ]
        # Dedos acompanham o pulso
        pose[R_INDEX] = pose[R_WRIST] + [0.01, -0.02, -0.01]
        pose[R_PINKY] = pose[R_WRIST] + [-0.01, -0.02, 0.01]
        pose[R_THUMB] = pose[R_WRIST] + [0.02, -0.01, -0.02]
        
        frames.append(pose.flatten())
    return np.array(frames)


def generate_obrigado(base_pose, rng):
    """
    Sinal: OBRIGADO
    Descrição: Mão aberta toca a testa (ou queixo) e se move para frente
    e para baixo, como um agradecimento. A mão direita parte do queixo
    e desce em arco para frente.
    """
    frames = []
    for f in range(NUM_FRAMES):
        pose = base_pose.copy()
        t = f / NUM_FRAMES
        
        # Fase 1: mão sobe até o queixo (0-30%)
        # Fase 2: mão desce em arco para frente (30-100%)
        if t < 0.3:
            phase_t = t / 0.3
            wrist_y = 0.52 - phase_t * 0.34  # Sobe até 0.18 (queixo)
            wrist_x = 0.55
            wrist_z = -0.05
        else:
            phase_t = (t - 0.3) / 0.7
            wrist_y = 0.18 + phase_t * 0.20  # Desce
            wrist_x = 0.55 + phase_t * 0.10  # Move para frente
            wrist_z = -0.05 - phase_t * 0.15 # Afasta do corpo
        
        pose[R_WRIST] = [wrist_x, wrist_y, wrist_z]
        pose[R_ELBOW] = [0.62, min(wrist_y + 0.10, 0.40), 0.02]
        pose[R_INDEX] = pose[R_WRIST] + [0.01, -0.02, -0.01]
        pose[R_PINKY] = pose[R_WRIST] + [-0.01, -0.01, 0.01]
        pose[R_THUMB] = pose[R_WRIST] + [0.02, -0.01, -0.01]
        
        frames.append(pose.flatten())
    return np.array(frames)


def generate_agua(base_pose, rng):
    """
    Sinal: ÁGUA
    Descrição: Letra 'A' em Libras (punho fechado com polegar ao lado)
    toca o queixo com o polegar e faz um pequeno movimento repetido
    para cima e para baixo (tapping no queixo).
    """
    frames = []
    for f in range(NUM_FRAMES):
        pose = base_pose.copy()
        t = f / NUM_FRAMES
        
        # Mão sobe até o queixo e faz tapping
        raise_t = min(t * 4, 1.0)
        tap = 0.02 * np.sin(2 * np.pi * 4 * t)  # 4 taps
        
        pose[R_WRIST] = [
            0.52,
            0.52 - raise_t * 0.34 + tap,  # Sobe até queixo + tap
            -0.08
        ]
        pose[R_ELBOW] = [0.62, 0.35, 0.02]
        # Punho fechado — dedos próximos ao pulso
        pose[R_INDEX] = pose[R_WRIST] + [0.00, -0.01, -0.02]
        pose[R_PINKY] = pose[R_WRIST] + [-0.01, -0.01, -0.01]
        pose[R_THUMB] = pose[R_WRIST] + [0.02, 0.00, -0.02]
        
        frames.append(pose.flatten())
    return np.array(frames)


def generate_ajuda(base_pose, rng):
    """
    Sinal: AJUDA
    Descrição: Uma mão aberta (palma para cima) embaixo, e a outra mão
    fechada (punho) em cima, fazendo movimento de empurrar para cima.
    A mão esquerda fica parada e a direita empurra para cima sobre ela.
    """
    frames = []
    for f in range(NUM_FRAMES):
        pose = base_pose.copy()
        t = f / NUM_FRAMES
        
        # Mão esquerda fica parada, palma para cima, na frente do corpo
        pose[L_WRIST] = [0.45, 0.38, -0.10]
        pose[L_ELBOW] = [0.35, 0.38, 0.00]
        pose[L_INDEX] = [0.44, 0.36, -0.12]
        pose[L_PINKY] = [0.46, 0.36, -0.08]
        pose[L_THUMB] = [0.43, 0.37, -0.13]
        
        # Mão direita empurra para cima
        push_y = 0.02 * np.sin(2 * np.pi * 2 * t)  # 2 empurrões
        base_y = 0.35 - min(t * 2, 1.0) * 0.05
        
        pose[R_WRIST] = [0.45, base_y + push_y, -0.12]
        pose[R_ELBOW] = [0.60, 0.35, -0.02]
        pose[R_INDEX] = pose[R_WRIST] + [0.01, -0.02, -0.01]
        pose[R_PINKY] = pose[R_WRIST] + [-0.01, -0.02, 0.01]
        pose[R_THUMB] = pose[R_WRIST] + [0.02, -0.01, -0.01]
        
        frames.append(pose.flatten())
    return np.array(frames)


def generate_sim(base_pose, rng):
    """
    Sinal: SIM
    Descrição: Punho fechado com movimento de balançar para frente e para trás
    (como se a mão fosse a cabeça assentindo). A mão direita fechada na
    frente do corpo faz movimento de cima para baixo (aceno de "sim").
    """
    frames = []
    for f in range(NUM_FRAMES):
        pose = base_pose.copy()
        t = f / NUM_FRAMES
        
        # Punho fechado na frente do corpo, balançando para baixo e para cima
        nod_freq = 3.0  # 3 acenos
        nod_y = 0.06 * np.sin(2 * np.pi * nod_freq * t)
        nod_z = 0.03 * np.sin(2 * np.pi * nod_freq * t)
        
        pose[R_WRIST] = [0.55, 0.30 + nod_y, -0.12 - nod_z]
        pose[R_ELBOW] = [0.62, 0.35, -0.02]
        # Punho fechado
        pose[R_INDEX] = pose[R_WRIST] + [0.00, -0.01, -0.01]
        pose[R_PINKY] = pose[R_WRIST] + [-0.01, -0.01, 0.00]
        pose[R_THUMB] = pose[R_WRIST] + [0.01, 0.00, -0.02]
        
        frames.append(pose.flatten())
    return np.array(frames)


def generate_nao(base_pose, rng):
    """
    Sinal: NÃO
    Descrição: Dedo indicador estendido, balançando lateralmente
    (de um lado para o outro) na frente do rosto. É o gesto universal
    de negação, feito com o indicador estendido.
    """
    frames = []
    for f in range(NUM_FRAMES):
        pose = base_pose.copy()
        t = f / NUM_FRAMES
        
        # Mão na frente do rosto, indicador estendido, balançando lateralmente
        wave_freq = 4.0  # 4 oscilações
        wave_x = 0.08 * np.sin(2 * np.pi * wave_freq * t)
        
        pose[R_WRIST] = [0.55 + wave_x, 0.22, -0.12]
        pose[R_ELBOW] = [0.62, 0.32, -0.02]
        # Indicador estendido para cima
        pose[R_INDEX] = [0.55 + wave_x, 0.18, -0.13]
        # Outros dedos fechados
        pose[R_PINKY] = pose[R_WRIST] + [-0.01, 0.00, 0.00]
        pose[R_THUMB] = pose[R_WRIST] + [0.01, 0.00, -0.01]
        
        frames.append(pose.flatten())
    return np.array(frames)


def generate_tudo_bem(base_pose, rng):
    """
    Sinal: TUDO BEM
    Descrição: Ambas as mãos abertas na frente do corpo, palmas para baixo,
    fazendo um movimento suave para frente e ligeiramente para baixo,
    como nivelando uma superfície. As mãos se movem juntas.
    """
    frames = []
    for f in range(NUM_FRAMES):
        pose = base_pose.copy()
        t = f / NUM_FRAMES
        
        # Ambas as mãos na frente, palmas para baixo, nivelando
        forward_t = min(t * 2, 1.0)
        level_y = 0.01 * np.sin(2 * np.pi * 2 * t)
        
        # Mão esquerda
        pose[L_WRIST] = [0.42, 0.35 + level_y, -0.10 - forward_t * 0.08]
        pose[L_ELBOW] = [0.36, 0.35, 0.00]
        pose[L_INDEX] = pose[L_WRIST] + [-0.01, 0.00, -0.02]
        pose[L_PINKY] = pose[L_WRIST] + [-0.03, 0.00, -0.01]
        pose[L_THUMB] = pose[L_WRIST] + [0.01, -0.01, -0.02]
        
        # Mão direita
        pose[R_WRIST] = [0.58, 0.35 + level_y, -0.10 - forward_t * 0.08]
        pose[R_ELBOW] = [0.64, 0.35, 0.00]
        pose[R_INDEX] = pose[R_WRIST] + [0.01, 0.00, -0.02]
        pose[R_PINKY] = pose[R_WRIST] + [0.03, 0.00, -0.01]
        pose[R_THUMB] = pose[R_WRIST] + [-0.01, -0.01, -0.02]
        
        frames.append(pose.flatten())
    return np.array(frames)


def generate_tchau(base_pose, rng):
    """
    Sinal: TCHAU
    Descrição: Mão aberta levantada ao lado da cabeça, com os dedos juntos,
    fazendo um movimento de abrir e fechar (não lateral como aceno em português,
    mas abrindo e fechando os dedos). Similar ao gesto de "bye-bye".
    """
    frames = []
    for f in range(NUM_FRAMES):
        pose = base_pose.copy()
        t = f / NUM_FRAMES
        
        # Mão levantada ao lado da cabeça, dedos abrindo e fechando
        raise_t = min(t * 3, 1.0)
        open_close = 0.03 * np.sin(2 * np.pi * 5 * t)  # 5 ciclos
        
        pose[R_WRIST] = [0.68, 0.28 - raise_t * 0.10, -0.05]
        pose[R_ELBOW] = [0.65, 0.30, 0.02]
        
        # Dedos se abrem e fecham
        pose[R_INDEX] = pose[R_WRIST] + [0.02 + open_close, -0.03, -0.01]
        pose[R_PINKY] = pose[R_WRIST] + [-0.02 - open_close, -0.03, 0.01]
        pose[R_THUMB] = pose[R_WRIST] + [0.03 + open_close, -0.01, -0.02]
        
        frames.append(pose.flatten())
    return np.array(frames)


def generate_desculpa(base_pose, rng):
    """
    Sinal: DESCULPA
    Descrição: Mão aberta passa sobre o peito (da esquerda para a direita
    ou em círculo), como se estivesse esfregando o peito. A mão direita
    faz um movimento circular no peito.
    """
    frames = []
    for f in range(NUM_FRAMES):
        pose = base_pose.copy()
        t = f / NUM_FRAMES
        
        # Mão direita fazendo movimento circular no peito
        circle_x = 0.06 * np.cos(2 * np.pi * 2 * t)
        circle_y = 0.04 * np.sin(2 * np.pi * 2 * t)
        
        pose[R_WRIST] = [0.50 + circle_x, 0.32 + circle_y, -0.10]
        pose[R_ELBOW] = [0.62, 0.35, 0.00]
        pose[R_INDEX] = pose[R_WRIST] + [0.01, -0.02, -0.01]
        pose[R_PINKY] = pose[R_WRIST] + [-0.01, -0.02, 0.01]
        pose[R_THUMB] = pose[R_WRIST] + [0.02, -0.01, -0.01]
        
        frames.append(pose.flatten())
    return np.array(frames)


def generate_por_favor(base_pose, rng):
    """
    Sinal: POR FAVOR
    Descrição: Mãos juntas em posição de prece (palmas encostadas),
    movendo-se levemente para frente e para trás, como um pedido.
    As duas mãos ficam juntas na frente do peito.
    """
    frames = []
    for f in range(NUM_FRAMES):
        pose = base_pose.copy()
        t = f / NUM_FRAMES
        
        # Mãos juntas (prece), balançando para frente
        raise_t = min(t * 3, 1.0)
        pray_z = 0.04 * np.sin(2 * np.pi * 2 * t)
        
        center_x = 0.50
        center_y = 0.30 - raise_t * 0.02
        center_z = -0.12 - pray_z
        
        # Mão esquerda
        pose[L_WRIST] = [center_x - 0.02, center_y, center_z]
        pose[L_ELBOW] = [0.38, 0.36, 0.00]
        pose[L_INDEX] = [center_x - 0.01, center_y - 0.03, center_z - 0.01]
        pose[L_PINKY] = [center_x - 0.03, center_y - 0.02, center_z]
        pose[L_THUMB] = [center_x - 0.01, center_y - 0.01, center_z - 0.02]
        
        # Mão direita (espelhada)
        pose[R_WRIST] = [center_x + 0.02, center_y, center_z]
        pose[R_ELBOW] = [0.62, 0.36, 0.00]
        pose[R_INDEX] = [center_x + 0.01, center_y - 0.03, center_z - 0.01]
        pose[R_PINKY] = [center_x + 0.03, center_y - 0.02, center_z]
        pose[R_THUMB] = [center_x + 0.01, center_y - 0.01, center_z - 0.02]
        
        frames.append(pose.flatten())
    return np.array(frames)


# ---------------------------------------------------------------------------
# Data Augmentation
# ---------------------------------------------------------------------------

def augment_sequence(sequence, rng):
    """
    Aplica augmentações realistas a uma sequência de landmarks.
    
    Técnicas:
    - Ruído gaussiano (simula imprecisão do MediaPipe)
    - Escala (pessoas de tamanhos diferentes)
    - Translação (posição diferente na câmera)
    - Jitter temporal (velocidade de sinalização diferente)
    - Rotação 2D leve (câmera em ângulo diferente)
    """
    augmented = sequence.copy()
    n_frames, n_features = augmented.shape
    
    # 1. Ruído gaussiano (imprecisão do tracker)
    noise_std = rng.uniform(0.002, 0.015)
    augmented += rng.normal(0, noise_std, augmented.shape)
    
    # 2. Escala (tamanho corporal diferente)
    scale = rng.uniform(0.85, 1.15)
    augmented *= scale
    
    # 3. Translação (posição na câmera)
    tx = rng.uniform(-0.08, 0.08)
    ty = rng.uniform(-0.06, 0.06)
    for i in range(NUM_LANDMARKS):
        augmented[:, i * 3] += tx      # x
        augmented[:, i * 3 + 1] += ty   # y
    
    # 4. Jitter temporal (velocidade diferente)
    if rng.random() > 0.3:
        speed = rng.uniform(0.8, 1.2)
        indices = np.clip(
            np.round(np.arange(n_frames) * speed).astype(int),
            0, n_frames - 1
        )
        augmented = augmented[indices]
    
    # 5. Rotação 2D leve
    if rng.random() > 0.5:
        angle = rng.uniform(-0.1, 0.1)  # radianos (~5 graus)
        cos_a, sin_a = np.cos(angle), np.sin(angle)
        for i in range(NUM_LANDMARKS):
            x_idx = i * 3
            y_idx = i * 3 + 1
            x = augmented[:, x_idx].copy()
            y = augmented[:, y_idx].copy()
            augmented[:, x_idx] = x * cos_a - y * sin_a
            augmented[:, y_idx] = x * sin_a + y * cos_a
    
    return augmented


# ---------------------------------------------------------------------------
# Geração do Dataset
# ---------------------------------------------------------------------------

SIGNAL_GENERATORS = {
    0: generate_ola,
    1: generate_obrigado,
    2: generate_agua,
    3: generate_ajuda,
    4: generate_sim,
    5: generate_nao,
    6: generate_tudo_bem,
    7: generate_tchau,
    8: generate_desculpa,
    9: generate_por_favor,
}

def generate_dataset():
    """Gera dataset completo com amostras originais e augmentadas."""
    rng = np.random.default_rng(42)
    base_pose = create_base_pose()
    
    all_sequences = []
    all_labels = []
    
    for class_id, generator in SIGNAL_GENERATORS.items():
        signal_name = CLASS_MAPPING[class_id]
        print(f"  🤟 Gerando classe {class_id}: {signal_name}...")
        
        # Gerar amostras originais com variação natural
        for i in range(SAMPLES_PER_CLASS):
            # Pequena variação na pose base para cada amostra
            varied_base = base_pose + rng.normal(0, 0.005, base_pose.shape)
            sequence = generator(varied_base, rng)
            
            # Adicionar amostra original
            all_sequences.append(sequence)
            all_labels.append(class_id)
            
            # Data augmentation
            for _ in range(AUGMENTATION_FACTOR):
                aug_seq = augment_sequence(sequence, rng)
                all_sequences.append(aug_seq)
                all_labels.append(class_id)
    
    X = np.array(all_sequences, dtype=np.float32)
    y = np.array(all_labels, dtype=np.int32)
    
    return X, y


# ---------------------------------------------------------------------------
# Modelo LSTM
# ---------------------------------------------------------------------------

def build_model():
    """
    Constrói o modelo LSTM conforme especificação da documentação técnica:
    
    - LSTM(64, ReLU, return_sequences=True, dropout=0.2)
    - LSTM(32, ReLU, return_sequences=False, dropout=0.2)
    - Dense(128, ReLU, dropout=0.2)
    - Dense(64, ReLU)
    - Dense(10, Softmax)
    
    Total de parâmetros: ~67.530
    """
    model = keras.Sequential([
        layers.Input(shape=(NUM_FRAMES, NUM_FEATURES)),
        
        layers.LSTM(64, activation='relu', return_sequences=True),
        layers.Dropout(0.2),
        
        layers.LSTM(32, activation='relu', return_sequences=False),
        layers.Dropout(0.2),
        
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.2),
        
        layers.Dense(64, activation='relu'),
        
        layers.Dense(NUM_CLASSES, activation='softmax')
    ])
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model


# ---------------------------------------------------------------------------
# Exportação de artefatos
# ---------------------------------------------------------------------------

def export_artifacts(model, scaler, X_test, y_test):
    """Exporta todos os artefatos necessários para o frontend."""
    import subprocess
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # 1. Modelo Keras
    model_path = "libras_model.keras"
    model.save(model_path)
    print(f"  ✅ Modelo Keras salvo: {model_path}")
    
    # 2. Modelo TensorFlow.js (para uso no browser)
    os.makedirs(MODEL_DIR, exist_ok=True)
    _export_tfjs_manual(model, MODEL_DIR)
    
    # 3. Class mapping
    mapping_path = os.path.join(OUTPUT_DIR, "class_mapping.json")
    str_mapping = {str(k): v for k, v in CLASS_MAPPING.items()}
    with open(mapping_path, 'w', encoding='utf-8') as f:
        json.dump(str_mapping, f, ensure_ascii=False, indent=2)
    print(f"  ✅ Mapeamento de classes salvo: {mapping_path}")
    
    # 4. Scaler parameters
    scaler_path = os.path.join(OUTPUT_DIR, "scaler.json")
    scaler_data = {
        "mean": scaler.mean_.tolist(),
        "scale": scaler.scale_.tolist()
    }
    with open(scaler_path, 'w', encoding='utf-8') as f:
        json.dump(scaler_data, f, indent=2)
    print(f"  ✅ Parâmetros do scaler salvos: {scaler_path}")
    
    # 5. Avaliação final
    print("\n📊 Avaliação Final no Conjunto de Teste:")
    loss, accuracy = model.evaluate(X_test, y_test, verbose=0)
    print(f"  Loss:     {loss:.4f}")
    print(f"  Acurácia: {accuracy*100:.1f}%")
    
    return accuracy


def _export_tfjs_manual(model, output_dir):
    """
    Exportação manual para formato compatível com TF.js LayersModel.
    Gera model.json + arquivos de pesos binários (group1-shardNofM.bin).
    """
    import struct
    
    weights_data = []
    weights_specs = []
    
    for layer in model.layers:
        for w in layer.weights:
            w_np = w.numpy()
            weights_specs.append({
                "name": w.name,
                "shape": list(w_np.shape),
                "dtype": "float32"
            })
            weights_data.append(w_np.astype(np.float32).tobytes())
    
    # Concatenar todos os pesos em um único arquivo binário
    all_weights = b"".join(weights_data)
    weights_filename = "group1-shard1of1.bin"
    weights_path = os.path.join(output_dir, weights_filename)
    with open(weights_path, 'wb') as f:
        f.write(all_weights)
    
    # Construir model.json (formato Keras layers)
    model_config = json.loads(model.to_json())
    
    model_json = {
        "format": "layers-model",
        "generatedBy": "train_libras_model.py",
        "convertedBy": "manual-export",
        "modelTopology": model_config,
        "weightsManifest": [{
            "paths": [weights_filename],
            "weights": weights_specs
        }]
    }
    
    model_json_path = os.path.join(output_dir, "model.json")
    with open(model_json_path, 'w', encoding='utf-8') as f:
        json.dump(model_json, f, indent=2)
    
    print(f"  ✅ Modelo TF.js (manual) salvo: {output_dir}/")
    print(f"     • model.json ({os.path.getsize(model_json_path)} bytes)")
    print(f"     • {weights_filename} ({os.path.getsize(weights_path)} bytes)")


# ---------------------------------------------------------------------------
# Pipeline Principal
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("🤟 Tradutor de Libras - Treinamento do Modelo LSTM")
    print("=" * 60)
    
    # 1. Gerar dataset
    print("\n📦 Fase 1: Gerando dataset com padrões biomecânicos...")
    X, y = generate_dataset()
    print(f"  Total de amostras: {len(X)}")
    print(f"  Shape: {X.shape} (amostras, frames, features)")
    print(f"  Classes: {NUM_CLASSES}")
    
    # 2. Dividir treino/teste
    print("\n✂️  Fase 2: Dividindo treino/teste (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"  Treino: {len(X_train)} amostras")
    print(f"  Teste:  {len(X_test)} amostras")
    
    # 3. Normalizar com StandardScaler
    print("\n📐 Fase 3: Normalizando features (StandardScaler)...")
    # Reshape para 2D para fit do scaler
    n_train = X_train.shape[0]
    n_test = X_test.shape[0]
    
    X_train_2d = X_train.reshape(-1, NUM_FEATURES)
    X_test_2d = X_test.reshape(-1, NUM_FEATURES)
    
    scaler = StandardScaler()
    X_train_2d = scaler.fit_transform(X_train_2d)
    X_test_2d = scaler.transform(X_test_2d)
    
    X_train = X_train_2d.reshape(n_train, NUM_FRAMES, NUM_FEATURES)
    X_test = X_test_2d.reshape(n_test, NUM_FRAMES, NUM_FEATURES)
    print(f"  Mean shape: {scaler.mean_.shape}")
    print(f"  Scale shape: {scaler.scale_.shape}")
    
    # 4. Construir modelo
    print("\n🏗️  Fase 4: Construindo modelo LSTM...")
    model = build_model()
    model.summary()
    
    # 5. Treinar
    print("\n🎯 Fase 5: Treinando modelo...")
    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=EARLY_STOPPING_PATIENCE,
            restore_best_weights=True,
            verbose=1
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-6,
            verbose=1
        )
    ]
    
    history = model.fit(
        X_train, y_train,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        validation_split=VALIDATION_SPLIT,
        callbacks=callbacks,
        verbose=1
    )
    
    # 6. Exportar artefatos
    print("\n📤 Fase 6: Exportando artefatos...")
    accuracy = export_artifacts(model, scaler, X_test, y_test)
    
    # 7. Resumo
    print("\n" + "=" * 60)
    print("🎉 Treinamento Concluído com Sucesso!")
    print("=" * 60)
    print(f"\n  📁 Artefatos gerados:")
    print(f"     • libras_model.keras        (modelo completo)")
    print(f"     • {MODEL_DIR}/  (modelo TF.js)")
    print(f"     • {OUTPUT_DIR}/class_mapping.json")
    print(f"     • {OUTPUT_DIR}/scaler.json")
    print(f"\n  📊 Acurácia final: {accuracy*100:.1f}%")
    print(f"  🔢 Parâmetros: {model.count_params():,}")
    print(f"  📐 Input shape: ({NUM_FRAMES}, {NUM_FEATURES})")
    print(f"  🤟 Sinais: {', '.join(CLASS_MAPPING.values())}")


if __name__ == "__main__":
    main()
