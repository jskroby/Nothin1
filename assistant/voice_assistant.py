import numpy as np
import torch
import whisper
import pyttsx3
import wave
import pyaudio
import re
import os
import subprocess
import time
import threading
import queue
from collections import deque
from transformers import GPT2LMHeadModel, GPT2Tokenizer, pipeline
from sklearn.ensemble import IsolationForest
from scipy.signal import butter, filtfilt
import webrtcvad


class AudioProcessor:
    def __init__(self):
        self.FS = 16000
        self.CHUNK_DURATION = 0.03
        self.CHUNK_SIZE = int(self.FS * self.CHUNK_DURATION)
        self.FORMAT = pyaudio.paInt16
        self.CHANNELS = 1
        self.SILENCE_THRESH = 15
        self.audio_queue = queue.Queue()
        self.is_recording = False
        self.audio_buffer = deque(maxlen=100)
        self.vad_model = webrtcvad.Vad(2)

    def butter_bandpass(self, lowcut, highcut, order=5):
        nyq = 0.5 * self.FS
        low = lowcut / nyq
        high = highcut / nyq
        b, a = butter(order, [low, high], btype='band')
        return b, a

    def bandpass_filter(self, data, lowcut=300, highcut=3000):
        b, a = self.butter_bandpass(lowcut, highcut, order=4)
        return filtfilt(b, a, data)

    def record_audio_thread(self):
        p = pyaudio.PyAudio()
        stream = p.open(format=self.FORMAT,
                        channels=self.CHANNELS,
                        rate=self.FS,
                        input=True,
                        frames_per_buffer=self.CHUNK_SIZE)
        print("Audio recording thread started...")
        while self.is_recording:
            try:
                data = stream.read(self.CHUNK_SIZE, exception_on_overflow=False)
                audio_chunk = np.frombuffer(data, dtype=np.int16)
                filtered_audio = self.bandpass_filter(audio_chunk)
                self.audio_buffer.append(filtered_audio)
                rms = np.sqrt(np.mean(filtered_audio**2))
                self.audio_queue.put((data, rms))
            except Exception as e:
                print(f"Audio recording error: {e}")
        stream.stop_stream()
        stream.close()
        p.terminate()

    def start_recording(self):
        self.is_recording = True
        self.recording_thread = threading.Thread(target=self.record_audio_thread)
        self.recording_thread.daemon = True
        self.recording_thread.start()

    def stop_recording(self):
        self.is_recording = False
        self.recording_thread.join(timeout=1.0)

    def get_audio(self):
        frames = []
        silent_frames = 0
        recording = False
        speech_detected = False
        print("Listening for speech...")
        while True:
            try:
                data, rms = self.audio_queue.get(timeout=5.0)
                if rms > 500 and not recording:
                    recording = True
                    silent_frames = 0
                    print("Speech detected, start recording")
                    for buf in self.audio_buffer:
                        frames.append(buf.tobytes())
                if recording:
                    frames.append(data)
                    if rms < 300:
                        silent_frames += 1
                    else:
                        silent_frames = 0
                        speech_detected = True
                if silent_frames > self.SILENCE_THRESH and speech_detected:
                    print("Speech ended")
                    break
            except queue.Empty:
                print("Audio queue timeout")
                break
        return b''.join(frames)


class SpeechRecognizer:
    def __init__(self):
        self.model = whisper.load_model("base")
        self.diarization_pipeline = pipeline(
            "audio-classification",
            model="pyannote/speaker-diarization"
        )

    def transcribe(self, audio_data):
        audio_np = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
        try:
            diarization = self.diarization_pipeline({
                "array": audio_np,
                "sampling_rate": 16000
            })
            speakers = set(segment['label'] for segment in diarization)
            print(f"Detected speakers: {speakers}")
        except Exception as e:
            print(f"Diarization error: {e}")
        result = self.model.transcribe(audio_np)
        return result["text"]


class LanguageProcessor:
    def __init__(self):
        self.tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
        self.model = GPT2LMHeadModel.from_pretrained("gpt2")
        self.context = deque(maxlen=10)
        self.temperature = 0.7
        self.sentiment_analyzer = pipeline("sentiment-analysis")
        self.command_history = []
        self.anomaly_detector = IsolationForest(contamination=0.1)

    def update_context(self, user_input, assistant_response):
        sentiment = self.sentiment_analyzer(user_input)[0]
        sentiment_label = sentiment['label']
        sentiment_score = sentiment['score']
        self.context.append({
            "user": user_input,
            "assistant": assistant_response,
            "sentiment": sentiment_label,
            "score": sentiment_score
        })
        self.detect_anomalous_commands(user_input)

    def detect_anomalous_commands(self, command):
        features = np.array([
            len(command),
            sum(1 for char in command if char.isupper()),
            int('sudo' in command),
            int('rm' in command)
        ]).reshape(1, -1)
        is_anomaly = self.anomaly_detector.predict(features)
        if is_anomaly == -1:
            print(f"Anomalous command detected: {command}")
        self.command_history.append((command, is_anomaly[0]))

    def generate_response(self, text):
        prompt = "\n".join(
            [f"User: {c['user']}\nAssistant: {c['assistant']}" for c in self.context] + [f"User: {text}"]
        )
        inputs = self.tokenizer(prompt, return_tensors="pt")
        outputs = self.model.generate(
            inputs.input_ids,
            max_length=250,
            temperature=self.temperature,
            top_k=50,
            top_p=0.92,
            repetition_penalty=1.15,
            do_sample=True,
            pad_token_id=self.tokenizer.eos_token_id
        )
        full_response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        response = full_response[len(prompt):].split('\n')[0].strip()
        self.update_context(text, response)
        return response

    def contains_command(self, text):
        return re.search(r'\b(open|run|execute|show|find|launch|search|create)\b', text, re.I)


class CommandExecutor:
    SAFE_COMMANDS = {
        'list': 'ls -l',
        'time': 'date',
        'where': 'pwd',
        'say': 'echo',
        'calendar': 'cal',
        'disk': 'df -h',
        'processes': 'ps aux',
        'network': 'ifconfig'
    }

    DANGEROUS_PATTERNS = [
        'rm ', 'sudo ', 'shutdown', 'dd ', 'mkfs', '>', 'mv ', 'chmod',
        'passwd', 'kill', '^dd', '^rm', '^sudo'
    ]

    def __init__(self):
        self.command_history = []

    def execute(self, command):
        if any(re.search(pattern, command) for pattern in self.DANGEROUS_PATTERNS):
            return "Error: This command is blocked for safety reasons"
        for alias, actual_cmd in self.SAFE_COMMANDS.items():
            if command.startswith(alias):
                command = actual_cmd + command[len(alias):]
                break
        try:
            result = subprocess.run(
                command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                output = result.stdout.strip()[:300]
            else:
                output = f"Error: {result.stderr.strip()[:200]}"
            self.command_history.append((command, output))
            return output
        except subprocess.TimeoutExpired:
            return "Error: Command timed out"
        except Exception as e:
            return f"Error: {str(e)}"


class SpeechSynthesizer:
    def __init__(self):
        self.engine = pyttsx3.init()
        self.base_rate = 150
        self.engine.setProperty('rate', self.base_rate)
        self.engine.setProperty('volume', 1.0)
        self.emotion_modulation = {
            'POSITIVE': {'rate': 1.2, 'volume': 1.1},
            'NEGATIVE': {'rate': 0.8, 'volume': 0.9},
            'NEUTRAL': {'rate': 1.0, 'volume': 1.0}
        }

    def modulate_voice(self, sentiment):
        modulation = self.emotion_modulation.get(sentiment, self.emotion_modulation['NEUTRAL'])
        self.engine.setProperty('rate', self.base_rate * modulation['rate'])
        self.engine.setProperty('volume', modulation['volume'])

    def speak(self, text, sentiment='NEUTRAL'):
        self.modulate_voice(sentiment)
        self.engine.say(text)
        self.engine.runAndWait()
        self.engine.setProperty('rate', self.base_rate)
        self.engine.setProperty('volume', 1.0)


class ReinforcementLearner:
    def __init__(self, assistant):
        self.assistant = assistant
        self.q_table = {}
        self.alpha = 0.1
        self.gamma = 0.9
        self.reward_history = []

    def get_state_representation(self, context):
        last_words = " ".join(context[-1]['user'].split()[-3:])
        sentiment = context[-1]['sentiment']
        return f"{sentiment}:{last_words}"

    def choose_action(self, state, possible_actions):
        epsilon = 0.1
        if np.random.random() < epsilon:
            return np.random.choice(possible_actions)
        q_values = [self.q_table.get((state, a), 0) for a in possible_actions]
        return possible_actions[np.argmax(q_values)]

    def update_q_value(self, state, action, reward, next_state):
        current_q = self.q_table.get((state, action), 0)
        max_next_q = max(self.q_table.get((next_state, a), 0) for a in ['respond', 'ask_clarify'])
        new_q = current_q + self.alpha * (reward + self.gamma * max_next_q - current_q)
        self.q_table[(state, action)] = new_q
        self.reward_history.append(reward)

    def get_reward(self, user_feedback):
        feedback = user_feedback.lower()
        if "thank" in feedback or "perfect" in feedback or "great" in feedback:
            return 2.0
        elif "wrong" in feedback or "error" in feedback or "not" in feedback:
            return -1.5
        elif "?" in user_feedback:
            return -0.5
        elif len(user_feedback.split()) < 3:
            return -0.3
        else:
            return 0.1


class VoiceAssistant:
    def __init__(self):
        self.audio_processor = AudioProcessor()
        self.speech_recognizer = SpeechRecognizer()
        self.language_processor = LanguageProcessor()
        self.command_executor = CommandExecutor()
        self.speech_synthesizer = SpeechSynthesizer()
        self.reinforcement_learner = ReinforcementLearner(self)
        self.response_times = []
        self.performance_metrics = {
            'success_count': 0,
            'error_count': 0,
            'total_interactions': 0
        }
        self.running = False
        self.current_sentiment = "NEUTRAL"

    def start(self):
        print("Starting voice assistant...")
        self.running = True
        self.audio_processor.start_recording()
        self.main_loop()

    def stop(self):
        print("Stopping voice assistant...")
        self.running = False
        self.audio_processor.stop_recording()

    def main_loop(self):
        while self.running:
            try:
                audio_data = self.audio_processor.get_audio()
                if not audio_data:
                    time.sleep(0.5)
                    continue
                start_time = time.time()
                user_text = self.speech_recognizer.transcribe(audio_data)
                transcribe_time = time.time() - start_time
                print(f"User: {user_text}")
                process_start = time.time()
                if self.language_processor.contains_command(user_text):
                    response = self.command_executor.execute(user_text)
                    self.current_sentiment = "NEUTRAL"
                else:
                    state = self.reinforcement_learner.get_state_representation(list(self.language_processor.context))
                    action = self.reinforcement_learner.choose_action(state, ['respond', 'ask_clarify'])
                    if action == 'ask_clarify':
                        response = "Could you please clarify what you mean?"
                    else:
                        response = self.language_processor.generate_response(user_text)
                        self.current_sentiment = self.language_processor.context[-1]['sentiment']
                process_time = time.time() - process_start
                total_time = transcribe_time + process_time
                self.response_times.append(total_time)
                self.performance_metrics['total_interactions'] += 1
                if "Error" not in response:
                    self.performance_metrics['success_count'] += 1
                else:
                    self.performance_metrics['error_count'] += 1
                print(f"Assistant: {response}")
                self.speech_synthesizer.speak(response, self.current_sentiment)
                self.adaptive_learning(total_time)
                if self.performance_metrics['total_interactions'] % 5 == 0:
                    self.report_status()
            except Exception as e:
                print(f"System error: {e}")
                time.sleep(1)

    def adaptive_learning(self, latency):
        avg_latency = np.mean(self.response_times[-5:]) if self.response_times else 0
        if avg_latency > 1.5:
            self.language_processor.temperature = max(0.3, self.language_processor.temperature - 0.05)
        elif avg_latency < 0.8 and self.language_processor.temperature < 1.2:
            self.language_processor.temperature += 0.05
        reward = self.reinforcement_learner.get_reward(self.language_processor.context[-1]['user'])
        state = self.reinforcement_learner.get_state_representation(list(self.language_processor.context)[:-1])
        next_state = self.reinforcement_learner.get_state_representation(list(self.language_processor.context))
        self.reinforcement_learner.update_q_value(state, 'respond', reward, next_state)

    def report_status(self):
        avg_latency = np.mean(self.response_times[-10:]) if self.response_times else 0
        success_rate = (self.performance_metrics['success_count'] /
                        self.performance_metrics['total_interactions'] * 100)
        print("\n===== System Status =====")
        print(f"Total Interactions: {self.performance_metrics['total_interactions']}")
        print(f"Success Rate: {success_rate:.1f}%")
        print(f"Avg. Latency: {avg_latency:.2f}s")
        print(f"LLM Temperature: {self.language_processor.temperature:.2f}")
        print("=========================\n")


if __name__ == "__main__":
    assistant = VoiceAssistant()
    assistant_thread = threading.Thread(target=assistant.start)
    assistant_thread.daemon = True
    assistant_thread.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down...")
        assistant.stop()
        assistant_thread.join(timeout=2.0)
        print("System stopped")
