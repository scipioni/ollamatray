# ollama api

http://localhost:11434/api/ps
```
{
  "models": [
    {
      "name": "nomic-embed-text:latest",
      "model": "nomic-embed-text:latest",
      "size": 347154432,
      "digest": "0a109f422b47e3a30ba2b10eca18548e944e8a23073ee3f3e947efcf3c45e59f",
      "details": {
        "parent_model": "",
        "format": "gguf",
        "family": "nomic-bert",
        "families": [
          "nomic-bert"
        ],
        "parameter_size": "137M",
        "quantization_level": "F16"
      },
      "expires_at": "2025-12-08T17:53:00.518027764+01:00",
      "size_vram": 347154432,
      "context_length": 8192
    }
  ]
}

```

http://localhost:11434/api/tags
```
{
  "models": [
    {
      "name": "ministral-3:8b",
      "model": "ministral-3:8b",
      "modified_at": "2025-12-08T16:22:43.01828388+01:00",
      "size": 6022224665,
      "digest": "77300ee7514e14cacbee496270b49c5ce79a02acca789354eb37fa22197e0b72",
      "details": {
        "parent_model": "",
        "format": "gguf",
        "family": "mistral3",
        "families": [
          "mistral3"
        ],
        "parameter_size": "8.9B",
        "quantization_level": "Q4_K_M"
      }
    },
    {
      "name": "deepseek-coder-v2:lite",
      "model": "deepseek-coder-v2:lite",
      "modified_at": "2025-12-08T15:50:46.894851526+01:00",
      "size": 8905126121,
      "digest": "63fb193b3a9b4322a18e8c6b250ca2e70a5ff531e962dbf95ba089b2566f2fa5",
      "details": {
        "parent_model": "",
        "format": "gguf",
        "family": "deepseek2",
        "families": [
          "deepseek2"
        ],
        "parameter_size": "15.7B",
        "quantization_level": "Q4_0"
      }
    },
    {
      "name": "llama3.2:latest",
      "model": "llama3.2:latest",
      "modified_at": "2025-09-27T11:42:22.510580602+02:00",
      "size": 2019393189,
      "digest": "a80c4f17acd55265feec403c7aef86be0c25983ab279d83f3bcd3abbcb5b8b72",
      "details": {
        "parent_model": "",
        "format": "gguf",
        "family": "llama",
        "families": [
          "llama"
        ],
        "parameter_size": "3.2B",
        "quantization_level": "Q4_K_M"
      }
    },
    {
      "name": "nomic-embed-text:latest",
      "model": "nomic-embed-text:latest",
      "modified_at": "2025-09-27T11:40:15.977946138+02:00",
      "size": 274302450,
      "digest": "0a109f422b47e3a30ba2b10eca18548e944e8a23073ee3f3e947efcf3c45e59f",
      "details": {
        "parent_model": "",
        "format": "gguf",
        "family": "nomic-bert",
        "families": [
          "nomic-bert"
        ],
        "parameter_size": "137M",
        "quantization_level": "F16"
      }
    }
  ]
}

```
