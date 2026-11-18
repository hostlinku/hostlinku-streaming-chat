# Hostlinku Streaming Chat

A small Node.js example that streams a Hostlinku model's Chat Completions response to a browser with server-sent events (SSE). It uses built-in Node.js modules and a plain HTML page.

## Run it locally

Clone this repository and use Node.js 22 or newer. Create an API key in the [Hostlinku Console](https://console.hostlinku.com/) and pick a text chat model with streaming support from [the catalog for your key](https://docs.hostlinku.com/en/models).

```sh
# Bash
read -rsp 'Hostlinku API key: ' HOSTLINKU_API_KEY
export HOSTLINKU_API_KEY
export HOSTLINKU_MODEL=YOUR_MODEL_ID
node server.mjs
```

In zsh use `read -rs 'HOSTLINKU_API_KEY?Hostlinku API key: '` in place of the Bash prompt above. On PowerShell 7:

```powershell
$env:HOSTLINKU_API_KEY = Read-Host -MaskInput "Hostlinku API key"
$env:HOSTLINKU_MODEL = "YOUR_MODEL_ID"
node server.mjs
```

Open the printed URL, normally `http://127.0.0.1:8787`. Set `PORT` in the environment if that port is in use. Sending a prompt makes one potentially billable request with a 256-token output limit.

The page calls the local server. The server keeps the API key in its environment and forwards the event stream from Hostlinku. This example binds to loopback and is intended for local development. If adapting it for public hosting, add app authentication and request limits appropriate for your users.

## Bahasa Indonesia

Contoh chat streaming dengan Node.js tanpa dependensi tambahan. Atur API key dan ID model, jalankan `node server.mjs`, lalu buka URL yang muncul. API key disimpan di proses server.

[Streaming API reference](https://docs.hostlinku.com/en/chat-completions) · [Hostlinku](https://hostlinku.com/)
