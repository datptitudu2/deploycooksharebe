"""
Flask app để serve model GPT-2 đã fine-tune trên Render
Tối ưu cho 512MB RAM và 0.1 CPU
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import gc
import os
import time

app = Flask(__name__)
CORS(app)

# Global variables
model = None
tokenizer = None
model_loaded = False

def load_model():
    """Lazy load model - chỉ load khi cần"""
    global model, tokenizer, model_loaded
    
    if model_loaded:
        return model, tokenizer
    
    print("🔄 Đang load model...")
    start_time = time.time()
    
    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        
        model_name = "uduptit/cookbot-vietnamese"
        
        # Load tokenizer trước
        print("📖 Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        tokenizer.pad_token = tokenizer.eos_token
        
        # Load model với quantization để tiết kiệm RAM
        print("📦 Loading model với quantization...")
        # Force CPU cho Render free tier (không có GPU)
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16,  # Giảm 50% RAM
            device_map="cpu",  # Force CPU (Render free tier không có GPU)
            low_cpu_mem_usage=True,
            trust_remote_code=True
        )
        
        # Đảm bảo model trên CPU
        model = model.cpu()
        
        # Set eval mode
        model.eval()
        
        # Clear cache
        gc.collect()
        # Không cần empty CUDA cache vì dùng CPU
        
        model_loaded = True
        load_time = time.time() - start_time
        print(f"✅ Model loaded trong {load_time:.2f}s")
        
        return model, tokenizer
        
    except Exception as e:
        print(f"❌ Lỗi load model: {e}")
        raise

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'model_loaded': model_loaded,
        'memory_usage': 'CPU mode (Render free tier)'
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Generate response từ model"""
    global model, tokenizer
    
    try:
        data = request.json
        prompt = data.get('prompt', '')
        max_length = data.get('max_length', 200)
        temperature = data.get('temperature', 0.7)
        
        if not prompt:
            return jsonify({'error': 'Prompt không được để trống'}), 400
        
        # Load model nếu chưa load
        if not model_loaded:
            model, tokenizer = load_model()
        
        # Format prompt theo format của training data
        formatted_prompt = f"<|system|>Bạn là CookBot - AI tư vấn món ăn của CookShare. Trả lời thân thiện, gợi ý món ăn khi được hỏi.</s>\n<|user|>{prompt}</s>\n<|assistant|>"
        
        # Tokenize
        inputs = tokenizer(formatted_prompt, return_tensors="pt", truncation=True, max_length=256)
        
        # Move to same device as model
        device = next(model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        # Generate
        start_time = time.time()
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_length=max_length,
                num_return_sequences=1,
                temperature=temperature,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id,
                repetition_penalty=1.2,
            )
        
        # Decode
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract chỉ phần assistant response
        if "<|assistant|>" in response:
            response = response.split("<|assistant|>")[-1].strip()
        
        generation_time = time.time() - start_time
        
        # Clear cache sau mỗi request (quan trọng cho free tier)
        gc.collect()
        # Không cần empty CUDA cache vì dùng CPU
        
        return jsonify({
            'response': response,
            'generation_time': f"{generation_time:.2f}s",
            'model': 'uduptit/cookbot-vietnamese'
        })
        
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/', methods=['GET'])
def index():
    """Root endpoint"""
    return jsonify({
        'message': 'CookBot Model Server',
        'model': 'uduptit/cookbot-vietnamese',
        'status': 'running',
        'endpoints': {
            '/health': 'Health check',
            '/predict': 'Generate response (POST)'
        }
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

